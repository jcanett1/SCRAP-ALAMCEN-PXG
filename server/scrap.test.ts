import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock supabase before importing router
vi.mock("./supabase", () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockInsertSelect = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({
    data: { id: 1, num_orden: "ORD-001", qty: 2 },
    error: null,
  });

  const mockInsert = vi.fn(() => ({
    select: () => ({ single: mockSingle }),
  }));

  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    order: mockOrder,
    limit: mockLimit,
  }));

  return {
    supabase: {
      from: mockFrom,
    },
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("scrap.proceso.list", () => {
  it("devuelve un arreglo de registros", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.scrap.proceso.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("scrap.proveedor.list", () => {
  it("devuelve un arreglo de registros", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.scrap.proveedor.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

const VALID_RECORD = {
  num_orden: "ORD-001",
  hora: "08:00",
  serial_number: "SN-123",
  inventory_id: "INV-456",
  qty: 2,
  reason: "Defecto",
  reason_code: "D01",
  description: "Pieza dañada",
  celda: "C1",
  supervisor: "Juan Pérez",
  autorizo: "María García",
  captura: "Operador1",
};

describe("scrap.proceso.insert", () => {
  it("inserta un registro y retorna success: true", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.scrap.proceso.insert(VALID_RECORD);
    expect(result.success).toBe(true);
  });

  it("rechaza qty menor a 1", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.scrap.proceso.insert({ ...VALID_RECORD, qty: 0 })
    ).rejects.toThrow();
  });

  it("rechaza campos obligatorios vacíos", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.scrap.proceso.insert({ ...VALID_RECORD, num_orden: "" })
    ).rejects.toThrow();
  });
});

describe("scrap.proveedor.insert", () => {
  it("inserta un registro de proveedor y retorna success: true", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.scrap.proveedor.insert(VALID_RECORD);
    expect(result.success).toBe(true);
  });

  it("rechaza qty menor a 1 en proveedor", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.scrap.proveedor.insert({ ...VALID_RECORD, qty: -1 })
    ).rejects.toThrow();
  });
});
