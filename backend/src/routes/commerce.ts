import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import { validate, commerceUpdateSchema } from "../middleware/validate";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  const commerce = await prisma.commerce.findUnique({
    where: { id: req.admin!.commerceId },
  });
  res.json(commerce);
});

router.put("/", authenticate, validate(commerceUpdateSchema), async (req: Request, res: Response) => {
  const { nombre, telefonoWhatsapp, mpAccessToken, configuracionHorarios } = req.body;

  const commerce = await prisma.commerce.update({
    where: { id: req.admin!.commerceId },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(telefonoWhatsapp !== undefined && { telefonoWhatsapp }),
      ...(mpAccessToken !== undefined && { mpAccessToken }),
      ...(configuracionHorarios !== undefined && { configuracionHorarios: JSON.stringify(configuracionHorarios) }),
    },
  });

  res.json(commerce);
});

router.get("/public", async (req: Request, res: Response) => {
  if (!req.commerce) {
    return res.status(404).json({ error: "Commerce not found" });
  }

  const commerce = await prisma.commerce.findUnique({
    where: { id: req.commerce.id },
    select: {
      nombre: true,
      telefonoWhatsapp: true,
      configuracionHorarios: true,
    },
  });

  res.json({
    ...commerce,
    configuracionHorarios: commerce?.configuracionHorarios ? JSON.parse(commerce.configuracionHorarios) : null,
  });
});

export default router;
