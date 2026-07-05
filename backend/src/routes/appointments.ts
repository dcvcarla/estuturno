import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import { getAvailableSlots } from "../services/slots";
import { validate, appointmentCreateSchema } from "../middleware/validate";
import { sendWhatsAppMessage, buildTextMessage } from "../services/whatsapp";
import { io } from "../index";

const router = Router();

router.get("/slots", async (req: Request, res: Response) => {
  if (!req.commerce) {
    return res.status(404).json({ error: "Commerce not found" });
  }

  const { date, service_id } = req.query;
  if (!date || !service_id) {
    return res.status(400).json({ error: "date and service_id required" });
  }

  const slots = await getAvailableSlots(req.commerce.id, Number(service_id), String(date));
  res.json(slots);
});

router.get("/available-dates", async (req: Request, res: Response) => {
  if (!req.commerce) {
    return res.status(404).json({ error: "Commerce not found" });
  }

  const { service_id, days: daysStr } = req.query;
  if (!service_id) {
    return res.status(400).json({ error: "service_id required" });
  }

  const days = Math.min(Math.max(Number(daysStr) || 30, 1), 60);
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const slots = await getAvailableSlots(req.commerce.id, Number(service_id), dateStr);
    if (slots.length > 0) {
      dates.push(dateStr);
    }
  }

  res.json(dates);
});

router.post("/", validate(appointmentCreateSchema), async (req: Request, res: Response) => {
  if (!req.commerce) {
    return res.status(404).json({ error: "Commerce not found" });
  }

  const { serviceId, fecha, hora, nombreCliente, telefonoCliente } = req.body;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, commerceId: req.commerce.id, activo: true },
  });
  if (!service) {
    return res.status(400).json({ error: "Service not found or inactive" });
  }

  const [h, m] = hora.split(":").map(Number);
  const start = new Date(fecha);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + service.duracionMinutos * 60 * 1000);

  const appointment = await prisma.$transaction(async (tx) => {
    const conflicting = await tx.appointment.findFirst({
      where: {
        commerceId: req.commerce!.id,
        fechaHoraInicio: { lt: end },
        fechaHoraFin: { gt: start },
        estado: { in: ["pendiente_pago", "confirmado"] },
      },
    });

    if (conflicting) {
      throw new Error("DOUBLE_BOOKING");
    }

    return tx.appointment.create({
      data: {
        commerceId: req.commerce!.id,
        serviceId,
        nombreCliente,
        telefonoCliente,
        fechaHoraInicio: start,
        fechaHoraFin: end,
        estado: service.montoSena ? "pendiente_pago" : "pendiente_pago",
      },
      include: { service: { select: { nombre: true, duracionMinutos: true } } },
    });
  });

  io.to(`commerce:${req.commerce.id}`).emit("appointment:created", appointment);

  res.status(201).json(appointment);
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  const { date, estado } = req.query;

  const where: any = { commerceId: req.admin!.commerceId! };
  if (date) {
    where.fechaHoraInicio = {
      gte: new Date(`${String(date)}T00:00:00`),
      lt: new Date(`${String(date)}T23:59:59`),
    };
  }
  if (estado) {
    where.estado = String(estado);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { service: { select: { nombre: true, duracionMinutos: true } } },
    orderBy: { fechaHoraInicio: "asc" },
  });

  res.json(appointments);
});

router.put("/:id/cancel", authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const appointment = await prisma.appointment.updateMany({
    where: { id, commerceId: req.admin!.commerceId! },
    data: { estado: "cancelado" },
  });

  if (appointment.count === 0) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  io.to(`commerce:${req.admin!.commerceId!}`).emit("appointment:cancelled", { id });

  res.json({ message: "Appointment cancelled" });
});

router.post("/:id/cancel-and-refund", authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const appointment = await prisma.appointment.findFirst({
    where: { id, commerceId: req.admin!.commerceId! },
    include: { commerce: true, service: { select: { nombre: true } } },
  });

  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  if (appointment.estado === "cancelado") {
    return res.status(400).json({ error: "Appointment already cancelled" });
  }

  try {
    if (appointment.mpPaymentId && appointment.commerce.mpAccessToken) {
      const refundRes = await fetch(`https://api.mercadopago.com/v1/payments/${appointment.mpPaymentId}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appointment.commerce.mpAccessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!refundRes.ok) {
        const errBody = await refundRes.text();
        console.error("MP refund error:", errBody);
        return res.status(502).json({ error: "Failed to process refund with Mercado Pago" });
      }
    }

    await prisma.appointment.update({
      where: { id },
      data: { estado: "cancelado" },
    });

    io.to(`commerce:${req.admin!.commerceId!}`).emit("appointment:cancelled", { id });

    if (appointment.commerce.phoneNumberId && appointment.commerce.whatsappToken) {
      sendWhatsAppMessage(
        appointment.commerce.phoneNumberId,
        appointment.commerce.whatsappToken,
        appointment.telefonoCliente,
        buildTextMessage(
          `❌ Tu turno del ${appointment.fechaHoraInicio.toLocaleDateString("es-AR")} a las ${appointment.fechaHoraInicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} fue cancelado.\n\n${
            appointment.mpPaymentId ? "💰 El reembolso de la seña fue procesado." : ""
          }\n\nDisculpá las molestias.`
        )
      ).catch((e) => console.error("WhatsApp notify error:", e));
    }

    res.json({ message: "Appointment cancelled and refunded" });
  } catch (err) {
    console.error("Cancel-and-refund error:", err);
    res.status(500).json({ error: "Failed to cancel and refund" });
  }
});

export default router;
