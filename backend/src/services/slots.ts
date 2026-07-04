import prisma from "../utils/prisma";

interface WorkingHours {
  [day: string]: { inicio: string; fin: string }[];
}

function getDayHours(wh: WorkingHours, dateStr: string): { inicio: string; fin: string }[] {
  const date = new Date(dateStr);
  const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dayName = dayNames[date.getDay()];

  const dateHours = wh[dateStr];
  const dayHours = wh[dayName];

  const result: { inicio: string; fin: string }[] = [];
  if (Array.isArray(dayHours)) result.push(...dayHours);
  if (Array.isArray(dateHours)) result.push(...dateHours);
  return result;
}

export async function getAvailableSlots(commerceId: number, serviceId: number, dateStr: string) {
  const [commerce, service] = await Promise.all([
    prisma.commerce.findUnique({ where: { id: commerceId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);

  if (!service || !service.activo) {
    return [];
  }

  const rawHours = service.configuracionHorarios || commerce?.configuracionHorarios;
  if (!rawHours) {
    return [];
  }

  const workingHours: WorkingHours = JSON.parse(rawHours);
  const ranges = getDayHours(workingHours, dateStr);
  if (ranges.length === 0) {
    return [];
  }

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      commerceId,
      fechaHoraInicio: {
        gte: new Date(`${dateStr}T00:00:00`),
        lt: new Date(`${dateStr}T23:59:59`),
      },
      estado: { in: ["pendiente_pago", "confirmado"] },
    },
    select: { fechaHoraInicio: true, fechaHoraFin: true },
    orderBy: { fechaHoraInicio: "asc" },
  });

  const durationMs = service.duracionMinutos * 60 * 1000;
  const availableSlots: string[] = [];
  const date = new Date(dateStr);

  for (const range of ranges) {
    const [startH, startM] = range.inicio.split(":").map(Number);
    const [endH, endM] = range.fin.split(":").map(Number);
    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    let current = new Date(start);
    while (current.getTime() + durationMs <= end.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMs);
      const isBooked = existingAppointments.some(
        (apt) => current < apt.fechaHoraFin && slotEnd > apt.fechaHoraInicio
      );

      if (!isBooked) {
        availableSlots.push(current.toTimeString().slice(0, 5));
      }

      current = new Date(current.getTime() + durationMs);
    }
  }

  return availableSlots;
}
