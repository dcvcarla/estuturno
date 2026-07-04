import prisma from "../utils/prisma";
import { io } from "../index";

export async function processPendingWebhooks() {
  const pending = await prisma.pendingWebhook.findMany({
    where: { nextRetryAt: { lte: new Date() } },
    orderBy: { nextRetryAt: "asc" },
    take: 10,
  });

  for (const item of pending) {
    try {
      const { MercadoPagoConfig, Payment } = await import("mercadopago");
      const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "" });
      const paymentClient = new Payment(mpClient);
      const payment = await paymentClient.get({ id: item.paymentId });

      if (payment.status === "approved") {
        const appointmentId = Number(payment.external_reference);
        if (appointmentId) {
          const appointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { estado: "confirmado", mpPaymentId: String(item.paymentId) },
            include: { commerce: true },
          });
          io.to(`commerce:${appointment.commerceId}`).emit("appointment:confirmed", appointment);
        }
      }

      await prisma.pendingWebhook.delete({ where: { id: item.id } });
      console.log(`Webhook retry success: payment ${item.paymentId}`);
    } catch (err) {
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, item.retries + 1));

      if (item.retries >= item.maxRetries) {
        await prisma.pendingWebhook.delete({ where: { id: item.id } });
        console.error(`Webhook retry exhausted: payment ${item.paymentId} after ${item.retries} retries`);
      } else {
        await prisma.pendingWebhook.update({
          where: { id: item.id },
          data: {
            retries: item.retries + 1,
            nextRetryAt: nextRetry,
            lastError: err instanceof Error ? err.message : String(err),
          },
        });
        console.error(`Webhook retry ${item.retries + 1}/${item.maxRetries} for payment ${item.paymentId}:`, err);
      }
    }
  }
}