import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      admin?: { adminId: number; commerceId: number | null; role: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token required" });
  }

  try {
    const token = header.slice(7);
    req.admin = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.admin || req.admin.role !== "owner") {
    return res.status(403).json({ error: "Forbidden: owners only" });
  }
  next();
}
