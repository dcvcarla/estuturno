import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import prisma from "./utils/prisma";
import { resolveCommerce } from "./middleware/commerce";
import authRoutes from "./routes/auth";
import commerceRoutes from "./routes/commerce";
import serviceRoutes from "./routes/services";
import appointmentRoutes from "./routes/appointments";
import paymentRoutes from "./routes/payments";
import { cancelExpiredAppointments } from "./services/cron";
import { processPendingWebhooks } from "./services/webhookRetry";

dotenv.config();

async function autoSeed() {
  const existing = await prisma.commerce.findUnique({ where: { dominio: "estuturno-backend.onrender.com" } });
  if (existing) return;

  const passwordHash = await bcrypt.hash("admin123", 10);
  const commerce = await prisma.commerce.create({
    data: {
      nombre: "Mi Comercio",
      dominio: "estuturno-backend.onrender.com",
      telefonoWhatsapp: "+5491123456789",
      configuracionHorarios: JSON.stringify({
        lunes: [{ inicio: "09:00", fin: "18:00" }],
        martes: [{ inicio: "09:00", fin: "18:00" }],
        miercoles: [{ inicio: "09:00", fin: "18:00" }],
        jueves: [{ inicio: "09:00", fin: "18:00" }],
        viernes: [{ inicio: "09:00", fin: "18:00" }],
        sabado: [{ inicio: "09:00", fin: "14:00" }],
      }),
    },
  });

  await prisma.admin.create({
    data: { commerceId: commerce.id, email: "admin@test.com", passwordHash, nombre: "Admin" },
  });

  await prisma.service.createMany({
    data: [
      { commerceId: commerce.id, nombre: "Corte de cabello", duracionMinutos: 30, precio: 1500, montoSena: 500 },
      { commerceId: commerce.id, nombre: "Depilacion", duracionMinutos: 45, precio: 2500, montoSena: null },
      { commerceId: commerce.id, nombre: "Manicuria", duracionMinutos: 60, precio: 2000, montoSena: null },
    ],
  });

  console.log("Auto-seed: comercio, admin y servicios creados");
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || "*",
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || "*",
  credentials: true,
}));
app.use(express.json());
app.use(resolveCommerce);
app.use("/api/auth", authRoutes);
app.use("/api/commerce", commerceRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", paymentRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message === "DOUBLE_BOOKING") {
    return res.status(409).json({ error: "El horario seleccionado ya está reservado" });
  }
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

io.on("connection", (socket: import("socket.io").Socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join:commerce", (commerceId: number) => {
    socket.join(`commerce:${commerceId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

autoSeed().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

setInterval(cancelExpiredAppointments, 60 * 1000);
cancelExpiredAppointments();

setInterval(processPendingWebhooks, 30 * 1000);
processPendingWebhooks();

export { app, httpServer, io };
