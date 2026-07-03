import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export function generateAccessToken(payload: { adminId: number; commerceId: number }) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function generateRefreshToken(payload: { adminId: number; commerceId: number }) {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { adminId: number; commerceId: number };
}
