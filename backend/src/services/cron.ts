import prisma from "../utils/prisma";
import { io } from "../index";

const TIMEOUT_MINUTES = Number(process.env.PENDING_PAYMENT_TIMEOUT_MINUTES) || 15;

export async function cancelExpiredAppointments() {
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  const expired = await prisma.appointment.updateMany({
    where: {
      estado: "pendiente_pago",
      createdAt: { lt: cutoff },
    },
    data: { estado: "cancelado" },
  });

  if (expired.count > 0) {
    console.log(`Cancelled ${expired.count} expired appointments`);
  }
}
