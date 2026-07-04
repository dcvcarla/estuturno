import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { resolveCommerce } from "./middleware/commerce";
import authRoutes from "./routes/auth";
import commerceRoutes from "./routes/commerce";
import serviceRoutes from "./routes/services";
import appointmentRoutes from "./routes/appointments";
import paymentRoutes from "./routes/payments";
import { cancelExpiredAppointments } from "./services/cron";

dotenv.config();

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

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

setInterval(cancelExpiredAppointments, 60 * 1000);
cancelExpiredAppointments();

export { app, httpServer, io };
