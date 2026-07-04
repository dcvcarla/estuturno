import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { authenticate } from "../middleware/auth";
import { validate, loginSchema } from "../middleware/validate";

const router = Router();

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const payload = { adminId: admin.id, commerceId: admin.commerceId };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({ accessToken, refreshToken, admin: { id: admin.id, email: admin.email, nombre: admin.nombre } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin!.adminId },
    select: { id: true, email: true, nombre: true, commerceId: true },
  });
  res.json(admin);
});

export default router;
