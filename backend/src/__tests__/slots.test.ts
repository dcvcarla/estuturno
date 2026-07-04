import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const mockCommerceFindUnique = vi.fn();
const mockServiceFindUnique = vi.fn();
const mockFindMany = vi.fn();

vi.mock("../utils/prisma", () => ({
  default: {
    commerce: { findUnique: mockCommerceFindUnique },
    service: { findUnique: mockServiceFindUnique },
    appointment: { findMany: mockFindMany },
  },
}));

const { getAvailableSlots } = await import("../services/slots");

const workingHours = {
  lunes: [{ inicio: "09:00", fin: "13:00" }],
  martes: [{ inicio: "09:00", fin: "17:00" }],
  miercoles: [],
  jueves: [],
  viernes: [],
  sabado: [],
  domingo: [],
};

describe("getAvailableSlots", () => {
  it("returns hourly slots within working hours for lunes", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: JSON.stringify(workingHours) });
    mockFindMany.mockResolvedValue([]);

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("returns empty array for day without working hours (miercoles)", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: JSON.stringify(workingHours) });
    mockFindMany.mockResolvedValue([]);

    const slots = await getAvailableSlots(1, 1, "2026-07-08");
    expect(slots).toEqual([]);
  });

  it("excludes slots that are already booked", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: JSON.stringify(workingHours) });

    const existingStart = new Date("2026-07-06T10:00:00.000Z");
    const existingEnd = new Date("2026-07-06T11:00:00.000Z");
    mockFindMany.mockResolvedValue([
      { fechaHoraInicio: existingStart, fechaHoraFin: existingEnd },
    ]);

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots).not.toContain("10:00");
    expect(slots).toEqual(["09:00", "11:00", "12:00"]);
  });

  it("returns empty array when no hours configured", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: null });
    mockFindMany.mockResolvedValue([]);

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots).toEqual([]);
  });

  it("falls back to commerce-level hours when service has none", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1, configuracionHorarios: JSON.stringify(workingHours) });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: null });
    mockFindMany.mockResolvedValue([]);

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots).toContain("09:00");
  });

  it("returns empty array for inactive service", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: false, duracionMinutos: 60, configuracionHorarios: JSON.stringify(workingHours) });

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots).toEqual([]);
  });
});

describe("double-booking overlap detection", () => {
  it("detects exact overlap", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: JSON.stringify(workingHours) });

    const aptStart = new Date("2026-07-06T09:00:00.000Z");
    const aptEnd = new Date("2026-07-06T10:00:00.000Z");
    mockFindMany.mockResolvedValue([
      { fechaHoraInicio: aptStart, fechaHoraFin: aptEnd },
    ]);

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots).not.toContain("09:00");
  });

  it("detects partial overlap (new starts before existing ends)", async () => {
    mockCommerceFindUnique.mockResolvedValue({ id: 1 });
    mockServiceFindUnique.mockResolvedValue({ id: 1, activo: true, duracionMinutos: 60, configuracionHorarios: JSON.stringify(workingHours) });

    mockFindMany.mockResolvedValue([
      { fechaHoraInicio: new Date("2026-07-06T10:00:00.000Z"), fechaHoraFin: new Date("2026-07-06T11:00:00.000Z") },
    ]);

    const slots = await getAvailableSlots(1, 1, "2026-07-06");
    expect(slots).not.toContain("10:00");
  });
});
