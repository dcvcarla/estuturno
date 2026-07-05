import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";

const router = Router();

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

router.post("/webhooks/whatsapp", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const phoneNumberId = value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      return res.sendStatus(200);
    }

    const commerce = await prisma.commerce.findFirst({
      where: { phoneNumberId },
      select: { id: true, nombre: true, whatsappToken: true, telefonoWhatsapp: true },
    });

    if (!commerce) {
      console.error(`No commerce found for phone_number_id: ${phoneNumberId}`);
      return res.sendStatus(200);
    }

    console.log(`WhatsApp webhook for commerce ${commerce.id} (${commerce.nombre})`);

    res.sendStatus(200);
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    res.sendStatus(200);
  }
});

export default router;
