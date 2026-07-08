import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import {
  sendWhatsAppMessage,
  buildGreetingButtons,
  buildServiceList,
  buildDateButtons,
  buildSlotButtons,
  buildTextMessage,
} from "../services/whatsapp";
import { getAvailableSlots } from "../services/slots";
import { createPaymentPreference } from "../services/mercadopago";
import { io } from "../index";

const router = Router();

const MAX_LOGS = 50;
const debugLogs: any[] = [];

router.get("/webhooks/debug-logs", (_req: Request, res: Response) => {
  res.json(debugLogs);
});

router.delete("/webhooks/debug-logs", (_req: Request, res: Response) => {
  debugLogs.length = 0;
  res.json({ cleared: true });
});

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "estuturno_verify_2026";

router.get("/webhooks/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }

  res.status(403).send("Verification failed");
});

async function getOrCreateSession(commerceId: number, clientPhone: string) {
  const existing = await prisma.chatSession.findUnique({
    where: { commerceId_clientPhone: { commerceId, clientPhone } },
  });
  if (existing) return existing;

  return prisma.chatSession.create({
    data: { commerceId, clientPhone, estado: "menu" },
  });
}

router.post("/test-wa-send", authenticate, async (req: Request, res: Response) => {
  if (!req.admin?.commerceId) return res.status(400).json({ error: "No commerce" });
  const commerce = await prisma.commerce.findUnique({ where: { id: req.admin.commerceId } });
  if (!commerce?.phoneNumberId || !commerce?.whatsappToken) return res.status(400).json({ error: "WA not configured" });
  const result = await sendWhatsAppMessage(commerce.phoneNumberId, commerce.whatsappToken, "542257666951", buildTextMessage("Test desde el backend ✅"));
  res.json(result);
});

router.post("/webhooks/whatsapp", async (req: Request, res: Response) => {
  const debug: any = { step: "start" };
  try {
    const body = req.body;
    debug.object = body.object;
    if (body.object !== "whatsapp_business_account") return res.json(debug);

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const phoneNumberId = value?.metadata?.phone_number_id;
    debug.phoneNumberId = phoneNumberId;

    if (!phoneNumberId) return res.json(debug);

    debug.step = "lookup_commerce";
    const commerce = await prisma.commerce.findFirst({
      where: { phoneNumberId },
      select: { id: true, nombre: true, whatsappToken: true, telefonoWhatsapp: true, botConfig: true },
    });
    debug.commerceFound = !!commerce;
    debug.tokenPresent = !!commerce?.whatsappToken;
    debug.commerceId = commerce?.id;
    if (commerce?.whatsappToken) debug.tokenPreview = commerce.whatsappToken.substring(0, 15) + "...";

    if (!commerce || !commerce.whatsappToken) return res.json(debug);

    debug.commerceName = commerce.nombre;

    const messages = value?.messages;
    debug.msgCount = messages?.length;
    if (!messages || messages.length === 0) return res.json(debug);

    let botConfig: any = null;
    try { if (commerce.botConfig) botConfig = JSON.parse(commerce.botConfig); } catch {}

    const faqMap: Record<string, string> = {};
    if (botConfig?.faq) {
      for (const item of botConfig.faq) {
        const key = (item.pregunta || "").toLowerCase().trim();
        if (key && item.respuesta) faqMap[key] = item.respuesta;
      }
    }

    for (const msg of messages) {
      const from = msg.from;
      const msgType = msg.type;
      debug.msgType = msgType;
      debug.from = from;

      const session = await getOrCreateSession(commerce.id, from);
      debug.botActive = session.botActive;
      debug.sessionEstado = session.estado;
      if (!session.botActive) { debug.skipped = "botInactive"; continue; }

      if (msgType === "text") {
        const text = (msg.text?.body || "").trim();

        const lower = text.toLowerCase();
        const faqMatch = Object.keys(faqMap).find((k) => lower === k || lower.includes(k));
        if (faqMatch) {
          debug.faqMatch = faqMatch;
          const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(faqMap[faqMatch]));
          debug.sendFaqOk = r.ok;
          continue;
        }

        if (["hola", "buenas", "hey", "hi", "hello", "buenos días", "buenas tardes", "menu"].includes(lower)) {
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { estado: "menu", serviceId: null, fecha: null, hora: null },
          });
          debug.greetingMatch = true;
          const greetingBody = botConfig?.saludo || "¡Hola! ¿En qué puedo ayudarte?";
          const sendResult = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildGreetingButtons(greetingBody));
          debug.sendOk = sendResult.ok;
          debug.sendStatus = sendResult.status;
          continue;
        }

        if (["info", "informacion", "ayuda"].includes(lower)) {
          const faqItems = faqMap ? Object.entries(faqMap) : [];
          if (faqItems.length === 0 || faqItems.length > 10) {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No hay información disponible. Escribí *Menu* para volver al inicio o *Humano* para hablar con un operador."));
            debug.sendInfoOk = r.ok;
          } else if (faqItems.length <= 3) {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, {
              type: "interactive", interactive: { type: "button", body: { text: "Seleccioná un tema:" }, action: { buttons: faqItems.map(([key]) => ({ type: "reply" as const, reply: { id: `faq_${key}`, title: key.length > 20 ? key.slice(0, 20) : key } })) } },
            });
            debug.sendInfoOk = r.ok;
          } else {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, {
              type: "interactive", interactive: { type: "list", header: { type: "text", text: "Información" }, body: { text: "Seleccioná un tema:" }, action: { button: "Ver temas", sections: [{ title: "Disponibles", rows: faqItems.map(([key]) => ({ id: `faq_${key}`, title: key })) }] } },
            });
            debug.sendInfoOk = r.ok;
          }
          continue;
        }

        if (session.estado === "awaiting_name") {
          debug.awaitingName = true;
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { estado: "confirming" },
          });

          const serviceId = session.serviceId!;
          const fecha = session.fecha!;
          const hora = session.hora!;
          debug.serviceId = serviceId;
          debug.fecha = fecha;
          debug.hora = hora;
          const [h, m] = hora.split(":").map(Number);
          const start = new Date(fecha);
          start.setHours(h, m, 0, 0);

          const service = await prisma.service.findFirst({
            where: { id: serviceId, commerceId: commerce.id, activo: true },
          });
          if (!service) {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("El servicio ya no está disponible."));
            continue;
          }

          const end = new Date(start.getTime() + service.duracionMinutos * 60 * 1000);

          try {
            const appointment = await prisma.$transaction(async (tx) => {
              const conflicting = await tx.appointment.findFirst({
                where: {
                  commerceId: commerce.id,
                  fechaHoraInicio: { lt: end },
                  fechaHoraFin: { gt: start },
                  estado: { in: ["pendiente_pago", "confirmado"] },
                },
              });
              if (conflicting) throw new Error("DOUBLE_BOOKING");

              return tx.appointment.create({
                data: {
                  commerceId: commerce.id,
                  serviceId,
                  nombreCliente: text,
                  telefonoCliente: from,
                  fechaHoraInicio: start,
                  fechaHoraFin: end,
                  estado: "pendiente_pago",
                },
              });
            });

            io.to(`commerce:${commerce.id}`).emit("appointment:created", appointment);

            if (service.montoSena && Number(service.montoSena) > 0) {
              debug.hasMontoSena = true;
              try {
                const baseUrl = process.env.BASE_URL || `https://${process.env.RENDER_EXTERNAL_URL || "estuturno-backend.onrender.com"}`;
                const preference = await createPaymentPreference(
                  [{ title: `Seña - ${service.nombre}`, unit_price: Number(service.montoSena), quantity: 1 }],
                  String(appointment.id),
                  `${baseUrl}/api/webhooks/mercadopago`
                );

                await prisma.appointment.update({
                  where: { id: appointment.id },
                  data: { mpPreferenceId: preference.id },
                });

                await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(
                  `✅ Turno reservado, ${text}!\n\n📅 ${fecha} a las ${hora}\n💇 ${service.nombre}\n\nPara confirmar, aboná la seña de $${Number(service.montoSena).toLocaleString("es-AR")}:\n${preference.initPoint}`
                ));
              } catch (mpErr: any) {
                debug.mpPaymentFailed = mpErr.message;
                await prisma.appointment.update({
                  where: { id: appointment.id },
                  data: { estado: "confirmado" },
                });
                io.to(`commerce:${commerce.id}`).emit("appointment:confirmed", appointment);
                await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(
                  `✅ Turno confirmado, ${text}!\n\n📅 ${fecha} a las ${hora}\n💇 ${service.nombre}\n\nTe esperamos!`
                ));
              }
            } else {
              debug.hasMontoSena = false;
              await prisma.appointment.update({
                where: { id: appointment.id },
                data: { estado: "confirmado" },
              });
              io.to(`commerce:${commerce.id}`).emit("appointment:confirmed", appointment);

              await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(
                `✅ Turno confirmado, ${text}!\n\n📅 ${fecha} a las ${hora}\n💇 ${service.nombre}\n\nTe esperamos!`
              ));
            }

            await prisma.chatSession.update({
              where: { id: session.id },
              data: { estado: "menu", serviceId: null, fecha: null, hora: null },
            });
          } catch (err: any) {
            debug.bookingError = err.message;
            debug.bookingErrorCode = err.code;
            if (err.message === "DOUBLE_BOOKING") {
              await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("Ese horario ya fue reservado. Volvé a empezar con *Menu*."));
            } else {
              console.error("Booking error:", err);
              await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("Ocurrió un error al reservar. Intenta de nuevo más tarde."));
            }
          }
          continue;
        }

        if (text.toLowerCase() === "humano" || text.toLowerCase() === "soporte") {
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { botActive: false },
          });
          io.to(`commerce:${commerce.id}`).emit("chat:needs-human", {
            clientPhone: from,
            commerceId: commerce.id,
            message: text,
          });
          await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("Te conectamos con un operador. En breve te atenderemos."));
          continue;
        }

        await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(
          "No entendí tu mensaje. Respondé *Menu* para volver al inicio, *Info* para información útil, o *Humano* para hablar con un operador."
        ));

      } else if (msgType === "interactive") {
        const replyId = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
        debug.replyId = replyId;

        if (!replyId) continue;

        if (replyId === "reservar") {
          const rawServices = await prisma.service.findMany({
            where: { commerceId: commerce.id, activo: true },
            select: { id: true, nombre: true, descripcion: true, precio: true },
          });

          const services = rawServices.map((s) => ({ id: s.id, nombre: s.nombre, descripcion: s.descripcion, precio: Number(s.precio) }));
          debug.servicesCount = services.length;

          if (services.length === 0) {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No hay servicios disponibles en este momento."));
            debug.sendNoServices = r.ok;
            continue;
          }

          if (services.length <= 3) {
            const buttons = services.map((s) => ({
              type: "reply" as const,
              reply: { id: `servicio_${s.id}`, title: s.nombre.length > 20 ? s.nombre.slice(0, 20) : s.nombre },
            }));

            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, {
              type: "interactive",
              interactive: {
                type: "button",
                body: { text: "Elegí un servicio:" },
                action: { buttons },
              },
            });
            debug.sendServicesOk = r.ok;
            debug.sendServicesStatus = r.status;
          } else {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildServiceList(services));
            debug.sendListOk = r.ok;
          }

          await prisma.chatSession.update({
            where: { id: session.id },
            data: { estado: "selecting_service" },
          });
          continue;

        } else if (replyId === "info") {
          const faqItems = faqMap ? Object.entries(faqMap) : [];
          debug.faqItemsCount = faqItems.length;

          if (faqItems.length === 0) {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No hay información disponible. Escribí *Menu* para volver al inicio o *Humano* para hablar con un operador."));
            continue;
          }

          if (faqItems.length <= 3) {
            const buttons = faqItems.map(([key]) => ({
              type: "reply" as const,
              reply: { id: `faq_${key}`, title: key.length > 20 ? key.slice(0, 20) : key },
            }));

            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, {
              type: "interactive",
              interactive: {
                type: "button",
                body: { text: "Seleccioná un tema:" },
                action: { buttons },
              },
            });
          } else {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, {
              type: "interactive",
              interactive: {
                type: "list",
                header: { type: "text", text: "Información" },
                body: { text: "Seleccioná un tema:" },
                action: {
                  button: "Ver temas",
                  sections: [{
                    title: "Disponibles",
                    rows: faqItems.slice(0, 10).map(([key]) => ({
                      id: `faq_${key}`,
                      title: key,
                    })),
                  }],
                },
              },
            });
          }
          continue;

        } else if (replyId === "cancelar") {
          const appointments = await prisma.appointment.findMany({
            where: { telefonoCliente: from, commerceId: commerce.id, estado: { in: ["pendiente_pago", "confirmado"] } },
            include: { service: { select: { nombre: true } } },
            orderBy: { fechaHoraInicio: "asc" },
            take: 5,
          });

          if (appointments.length === 0) {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No tenés turnos próximos para cancelar."));
            continue;
          }

          const buttons = appointments.map((a) => ({
            type: "reply" as const,
            reply: {
              id: `cancelar_${a.id}`,
              title: `${a.fechaHoraInicio.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })} - ${a.service.nombre}`.slice(0, 20),
            },
          }));

          await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, {
            type: "interactive",
            interactive: {
              type: "button",
              body: { text: "Seleccioná el turno a cancelar:" },
              action: { buttons },
            },
          });

        } else if (replyId?.startsWith("cancelar_")) {
          const appointmentId = Number(replyId.replace("cancelar_", ""));
          await prisma.appointment.updateMany({
            where: { id: appointmentId, telefonoCliente: from, commerceId: commerce.id },
            data: { estado: "cancelado" },
          });
          io.to(`commerce:${commerce.id}`).emit("appointment:cancelled", { id: appointmentId });
          await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("Turno cancelado con éxito."));

        } else if (replyId?.startsWith("servicio_")) {
          debug.servicioId = replyId;
          if (replyId === "ver_mas") {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("Hay más servicios disponibles. Escribí *Menu* para ver todas las opciones."));
            continue;
          }
          const serviceId = Number(replyId.replace("servicio_", ""));
          const selectedService = await prisma.service.findUnique({ where: { id: serviceId }, select: { nombre: true, descripcion: true, precio: true } });
          if (selectedService?.descripcion) {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(`*${selectedService.nombre}*\n\n${selectedService.descripcion}\n\n*Precio:* $${Number(selectedService.precio).toLocaleString("es-AR")}`));
          }
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { estado: "selecting_date", serviceId },
          });

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const availableDates: string[] = [];

          for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];
            const slots = await getAvailableSlots(commerce.id, serviceId, dateStr);
            if (slots.length > 0) availableDates.push(dateStr);
            if (availableDates.length === 3) break;
          }

          debug.availableDatesCount = availableDates.length;
          if (availableDates.length === 0) {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No hay fechas disponibles para este servicio en los próximos 14 días."));
            debug.sendNoDates = r.ok;
            continue;
          }

          const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildDateButtons(availableDates));
          debug.sendDatesOk = r.ok;

        } else if (replyId?.startsWith("fecha_")) {
          const fecha = replyId.replace("fecha_", "");
          const serviceId = session.serviceId;
          debug.selectedDate = fecha;
          debug.serviceId = serviceId;

          if (!serviceId) continue;

          const slots = await getAvailableSlots(commerce.id, serviceId, fecha);
          debug.slotsCount = slots.length;

          if (slots.length === 0) {
            const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No hay horarios disponibles para esa fecha."));
            debug.sendNoSlots = r.ok;
            continue;
          }

          await prisma.chatSession.update({
            where: { id: session.id },
            data: { estado: "selecting_slot", fecha },
          });

          const r = await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildSlotButtons(slots));
          debug.sendSlotsOk = r.ok;

        } else if (replyId?.startsWith("hora_")) {
          const hora = replyId.replace("hora_", "");

          await prisma.chatSession.update({
            where: { id: session.id },
            data: { estado: "awaiting_name", hora },
          });

          await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("¿Cuál es tu nombre?"));
        }

        if (replyId?.startsWith("faq_")) {
          const key = replyId.replace("faq_", "");
          const answer = faqMap[key];
          if (answer) {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage(answer));
          } else {
            await sendWhatsAppMessage(phoneNumberId, commerce.whatsappToken, from, buildTextMessage("No encontré información sobre ese tema."));
          }
        }
      }
    }

    debugLogs.push({ timestamp: new Date().toISOString(), ...debug });
    if (debugLogs.length > MAX_LOGS) debugLogs.shift();
    res.json(debug);
  } catch (err: any) {
    debug.error = err.message;
    debug.errorStack = err.stack?.substring(0, 200);
    debugLogs.push({ timestamp: new Date().toISOString(), ...debug });
    if (debugLogs.length > MAX_LOGS) debugLogs.shift();
    res.json(debug);
  }
});

export default router;
