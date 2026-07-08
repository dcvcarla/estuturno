import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      return res.status(400).json({ error: `${first.path.join(".")}: ${first.message}` });
    }
    req.body = result.data;
    next();
  };
}

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const commerceUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  telefonoWhatsapp: z.string().optional(),
  phoneNumberId: z.string().optional(),
  whatsappToken: z.string().optional(),
  mpAccessToken: z.string().nullable().optional(),
  configuracionHorarios: z.any().optional(),
  botConfig: z.any().optional(),
});

export const serviceCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  duracionMinutos: z.number().int().min(5, "Mínimo 5 minutos"),
  precio: z.number().min(0, "Precio debe ser mayor o igual a 0"),
  montoSena: z.number().min(0).nullable().optional(),
  configuracionHorarios: z.any().optional(),
});

export const serviceUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  duracionMinutos: z.number().int().min(5).optional(),
  precio: z.number().min(0).optional(),
  montoSena: z.number().min(0).nullable().optional(),
  configuracionHorarios: z.any().optional(),
});

export const appointmentCreateSchema = z.object({
  serviceId: z.number().int().positive("serviceId requerido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)"),
  nombreCliente: z.string().min(1, "Nombre requerido"),
  telefonoCliente: z.string().min(1, "Teléfono requerido"),
});

export const paymentPreferenceSchema = z.object({
  appointmentId: z.number().int().positive("appointmentId requerido"),
});
