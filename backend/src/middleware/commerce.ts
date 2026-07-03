import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";

declare global {
  namespace Express {
    interface Request {
      commerce?: {
        id: number;
        nombre: string;
        dominio: string;
        configuracionHorarios: string | null;
      };
    }
  }
}

export async function resolveCommerce(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/api/health") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/api/webhooks") ||
    (authHeader && authHeader.startsWith("Bearer "))
  ) {
    return next();
  }

  const host = req.headers.host;
  if (!host) {
    return res.status(400).json({ error: "Host header required" });
  }

  const commerce = await prisma.commerce.findFirst({
    where: { dominio: { contains: host } },
    select: { id: true, nombre: true, dominio: true, configuracionHorarios: true },
  });

  if (!commerce) {
    return res.status(404).json({ error: "Commerce not found for this domain" });
  }

  req.commerce = commerce;
  next();
}
