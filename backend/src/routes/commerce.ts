import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { authenticate, requireOwner } from "../middleware/auth";
import { validate, commerceUpdateSchema } from "../middleware/validate";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  if (!req.admin!.commerceId) {
    return res.status(400).json({ error: "Admin has no associated commerce" });
  }
  const commerce = await prisma.commerce.findUnique({
    where: { id: req.admin!.commerceId },
  });
  res.json(commerce);
});

router.put("/", authenticate, validate(commerceUpdateSchema), async (req: Request, res: Response) => {
  if (!req.admin!.commerceId) {
    return res.status(400).json({ error: "Admin has no associated commerce" });
  }
  const { nombre, telefonoWhatsapp, phoneNumberId, whatsappToken, mpAccessToken, configuracionHorarios } = req.body;

  const commerce = await prisma.commerce.update({
    where: { id: req.admin!.commerceId },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(telefonoWhatsapp !== undefined && { telefonoWhatsapp }),
      ...(phoneNumberId !== undefined && { phoneNumberId }),
      ...(whatsappToken !== undefined && { whatsappToken }),
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

router.get("/list", authenticate, requireOwner, async (_req: Request, res: Response) => {
  const commerces = await prisma.commerce.findMany({
    select: {
      id: true,
      nombre: true,
      dominio: true,
      telefonoWhatsapp: true,
      phoneNumberId: true,
      createdAt: true,
      _count: { select: { services: true, appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(commerces);
});

router.post("/", authenticate, requireOwner, async (req: Request, res: Response) => {
  const { nombre, dominio, telefonoWhatsapp, adminEmail, adminPassword, adminNombre } = req.body;

  if (!nombre || !dominio || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: "nombre, dominio, adminEmail and adminPassword required" });
  }

  const existing = await prisma.commerce.findUnique({ where: { dominio } });
  if (existing) {
    return res.status(409).json({ error: "Dominio already in use" });
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const commerce = await prisma.commerce.create({
    data: {
      nombre,
      dominio,
      telefonoWhatsapp: telefonoWhatsapp || null,
      admins: {
        create: {
          email: adminEmail,
          passwordHash,
          nombre: adminNombre || null,
          role: "manager",
        },
      },
    },
  });

  res.status(201).json({
    id: commerce.id,
    nombre: commerce.nombre,
    dominio: commerce.dominio,
    admin: { email: adminEmail, nombre: adminNombre || null },
  });
});

router.delete("/:id", authenticate, requireOwner, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.commerce.delete({ where: { id } });
  res.json({ message: "Commerce deleted" });
});

export default router;
