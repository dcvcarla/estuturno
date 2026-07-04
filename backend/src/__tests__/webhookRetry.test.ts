import { describe, it, expect, vi, beforeEach } from "vitest";

const paymentGetMock = vi.hoisted(() => vi.fn());

const mockFindMany = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockUpdateAppointment = vi.hoisted(() => vi.fn());

vi.mock("../utils/prisma", () => ({
  default: {
    pendingWebhook: {
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
    appointment: {
      update: mockUpdateAppointment,
    },
  },
}));

vi.mock("../index", () => ({
  io: { to: () => ({ emit: () => {} }) },
}));

vi.mock("mercadopago", () => {
  class MercadoPagoConfig {
    constructor(_opts: any) {}
  }
  class Payment {
    constructor(_client: any) {}
    get = paymentGetMock;
  }
  return { MercadoPagoConfig, Payment };
});

const { processPendingWebhooks } = await import("../services/webhookRetry");

describe("processPendingWebhooks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("increments retry count on MP failure", async () => {
    paymentGetMock.mockRejectedValue(new Error("MP API error"));
    mockFindMany.mockResolvedValue([
      { id: 1, paymentId: "test_001", retries: 0, maxRetries: 5, nextRetryAt: new Date(Date.now() - 60000), lastError: null },
    ]);

    const nextRetryExpected = new Date(Date.now() + 120000);

    await processPendingWebhooks();

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { retries: 1, nextRetryAt: nextRetryExpected, lastError: "MP API error" },
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes record after max retries exhausted", async () => {
    paymentGetMock.mockRejectedValue(new Error("MP API error"));
    mockFindMany.mockResolvedValue([
      { id: 2, paymentId: "test_002", retries: 5, maxRetries: 5, nextRetryAt: new Date(Date.now() - 60000), lastError: "error" },
    ]);

    await processPendingWebhooks();

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("deletes record on successful payment (no appointment ref)", async () => {
    paymentGetMock.mockResolvedValue({ status: "approved", external_reference: null });
    mockFindMany.mockResolvedValue([
      { id: 3, paymentId: "test_003", retries: 0, maxRetries: 5, nextRetryAt: new Date(Date.now() - 60000), lastError: null },
    ]);

    await processPendingWebhooks();

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("processes only webhooks with nextRetryAt <= now", async () => {
    paymentGetMock.mockResolvedValue({ status: "approved", external_reference: null });
    mockFindMany.mockResolvedValue([]);

    await processPendingWebhooks();

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates appointment to confirmed on successful payment with reference", async () => {
    paymentGetMock.mockResolvedValue({ status: "approved", external_reference: "42" });
    mockFindMany.mockResolvedValue([
      { id: 4, paymentId: "test_004", retries: 0, maxRetries: 5, nextRetryAt: new Date(Date.now() - 60000), lastError: null },
    ]);
    mockUpdateAppointment.mockResolvedValue({ id: 42, commerceId: 1, estado: "confirmado", mpPaymentId: "test_004" });

    await processPendingWebhooks();

    expect(mockUpdateAppointment).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { estado: "confirmado", mpPaymentId: "test_004" },
      include: { commerce: true },
    });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 4 } });
  });
});
