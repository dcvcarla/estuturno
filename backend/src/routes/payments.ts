import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { createPaymentPreference } from "../services/mercadopago";
import { io } from "../index";

const router = Router();

router.post("/create-preference", async (req: Request, res: Response) => {
  try {
    if (!req.commerce) {
      return res.status(404).json({ error: "Commerce not found" });
    }

    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ error: "appointmentId required" });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, commerceId: req.commerce.id, estado: "pendiente_pago" },
      include: { service: true, commerce: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found or already paid" });
    }

    const depositAmount = appointment.service.montoSena;
    if (!depositAmount || Number(depositAmount) <= 0) {
      return res.status(400).json({ error: "This service does not require a deposit" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const preference = await createPaymentPreference(
      [
        {
          title: `Seña - ${appointment.service.nombre} - ${appointment.fechaHoraInicio.toLocaleDateString()}`,
          unit_price: Number(depositAmount),
          quantity: 1,
        },
      ],
      String(appointment.id),
      `${baseUrl}/api/webhooks/mercadopago`
    );

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { mpPreferenceId: preference.id },
    });

    res.json({ initPoint: preference.initPoint, preferenceId: preference.id });
  } catch (err) {
    console.error("MP create preference error:", err);
    res.status(500).json({ error: "Failed to create payment preference" });
  }
});

router.post("/webhooks/mercadopago", async (req: Request, res: Response) => {
  try {
    const { action, data } = req.body;

    if (action !== "payment.created" && action !== "payment.updated") {
      return res.sendStatus(200);
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.sendStatus(400);
    }

    const existing = await prisma.appointment.findFirst({
      where: { mpPaymentId: String(paymentId) },
    });

    if (existing && existing.estado === "confirmado") {
      return res.sendStatus(200);
    }

    const { MercadoPagoConfig, Payment } = await import("mercadopago");
    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "" });
    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: paymentId });

    if (payment.status === "approved") {
      const appointmentId = Number(payment.external_reference);
      if (!appointmentId) return res.sendStatus(400);

      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          estado: "confirmado",
          mpPaymentId: String(paymentId),
        },
        include: { commerce: true },
      });

      io.to(`commerce:${appointment.commerceId}`).emit("appointment:confirmed", appointment);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

export default router;
