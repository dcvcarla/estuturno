import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { commerceId: req.admin!.commerceId },
    orderBy: { nombre: "asc" },
  });
  res.json(services);
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  const { nombre, duracionMinutos, precio, montoSena } = req.body;

  if (!nombre || !duracionMinutos || precio === undefined) {
    return res.status(400).json({ error: "Nombre, duracionMinutos and precio required" });
  }

  const service = await prisma.service.create({
    data: {
      commerceId: req.admin!.commerceId,
      nombre,
      duracionMinutos,
      precio,
      montoSena: montoSena || null,
    },
  });

  res.status(201).json(service);
});

router.put("/:id", authenticate, async (req: Request, res: Response) => {
  const { nombre, duracionMinutos, precio, montoSena } = req.body;
  const id = Number(req.params.id);

  const service = await prisma.service.updateMany({
    where: { id, commerceId: req.admin!.commerceId },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(duracionMinutos !== undefined && { duracionMinutos }),
      ...(precio !== undefined && { precio }),
      ...(montoSena !== undefined && { montoSena }),
    },
  });

  if (service.count === 0) {
    return res.status(404).json({ error: "Service not found" });
  }

  res.json(await prisma.service.findUnique({ where: { id } }));
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.service.updateMany({
    where: { id, commerceId: req.admin!.commerceId },
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
    select: { id: true, nombre: true, duracionMinutos: true, precio: true, montoSena: true },
    orderBy: { nombre: "asc" },
  });

  res.json(services);
});

export default router;
