import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import { validate, serviceCreateSchema, serviceUpdateSchema } from "../middleware/validate";

const router = Router();

function serializeService(s: any) {
  return {
    ...s,
    configuracionHorarios: s.configuracionHorarios ? JSON.parse(s.configuracionHorarios) : null,
  };
}

router.get("/", authenticate, async (req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { commerceId: req.admin!.commerceId! },
    orderBy: { nombre: "asc" },
  });
  res.json(services.map(serializeService));
});

router.post("/", authenticate, validate(serviceCreateSchema), async (req: Request, res: Response) => {
  const { nombre, descripcion, duracionMinutos, precio, montoSena, configuracionHorarios } = req.body;

  const service = await prisma.service.create({
    data: {
      commerceId: req.admin!.commerceId!,
      nombre,
      descripcion: descripcion || null,
      duracionMinutos,
      precio,
      montoSena: montoSena || null,
      ...(configuracionHorarios !== undefined && { configuracionHorarios: JSON.stringify(configuracionHorarios) }),
    },
  });

  res.status(201).json(serializeService(service));
});

router.put("/:id", authenticate, validate(serviceUpdateSchema), async (req: Request, res: Response) => {
  const { nombre, descripcion, duracionMinutos, precio, montoSena, configuracionHorarios } = req.body;
  const id = Number(req.params.id);

  const service = await prisma.service.updateMany({
    where: { id, commerceId: req.admin!.commerceId! },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(duracionMinutos !== undefined && { duracionMinutos }),
      ...(precio !== undefined && { precio }),
      ...(montoSena !== undefined && { montoSena }),
      ...(configuracionHorarios !== undefined && { configuracionHorarios: JSON.stringify(configuracionHorarios) }),
    },
  });

  if (service.count === 0) {
    return res.status(404).json({ error: "Service not found" });
  }

  res.json(serializeService(await prisma.service.findUnique({ where: { id } })));
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.service.updateMany({
    where: { id, commerceId: req.admin!.commerceId! },
    data: { activo: false },
  });

  res.json({ message: "Service deactivated" });
});

router.get("/public", async (req: Request, res: Response) => {
  if (!req.commerce) {
    return res.status(404).json({ error: "Commerce not found" });
  }

  const services = await prisma.service.findMany({
    where: { commerceId: req.commerce.id, activo: true },
    orderBy: { nombre: "asc" },
  });

  res.json(services.map(serializeService));
});

export default router;
