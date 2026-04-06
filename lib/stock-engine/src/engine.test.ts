import { describe, expect, it } from "vitest";
import { applyMovement } from "./apply";
import { StockEngineError } from "./errors";
import { replayMovements, sortMovementsForReplay } from "./replay";

describe("applyMovement", () => {
  it("PURCHASE_RECEIVED increases stock with snapshots", () => {
    const r = applyMovement({
      currentStockBase: 10,
      type: "PURCHASE_RECEIVED",
      quantityBase: 5,
    });
    expect(r).toEqual({
      quantityBeforeBase: 10,
      quantityAfterBase: 15,
      signedDeltaBase: 5,
      nextStockBase: 15,
    });
  });

  it("SALE decreases stock", () => {
    const r = applyMovement({
      currentStockBase: 15,
      type: "SALE",
      quantityBase: 3,
    });
    expect(r.nextStockBase).toBe(12);
    expect(r.signedDeltaBase).toBe(-3);
  });

  it("SALE rejects when insufficient stock", () => {
    expect(() =>
      applyMovement({
        currentStockBase: 2,
        type: "SALE",
        quantityBase: 3,
      }),
    ).toThrowError(StockEngineError);
    try {
      applyMovement({
        currentStockBase: 2,
        type: "SALE",
        quantityBase: 3,
      });
    } catch (e) {
      expect(e).toBeInstanceOf(StockEngineError);
      expect((e as StockEngineError).code).toBe("INSUFFICIENT_STOCK");
    }
  });

  it("ADJUSTMENT accepts signed delta", () => {
    expect(
      applyMovement({
        currentStockBase: 10,
        type: "ADJUSTMENT",
        quantityBase: 2,
      }).nextStockBase,
    ).toBe(12);
    expect(
      applyMovement({
        currentStockBase: 10,
        type: "ADJUSTMENT",
        quantityBase: -4,
      }).nextStockBase,
    ).toBe(6);
  });

  it("ADJUSTMENT rejects zero delta", () => {
    expect(() =>
      applyMovement({
        currentStockBase: 10,
        type: "ADJUSTMENT",
        quantityBase: 0,
      }),
    ).toThrowError(StockEngineError);
  });

  it("DELIVERY_RECEIVED, RETURN_IN, TRANSFER_IN increase", () => {
    for (const type of [
      "DELIVERY_RECEIVED",
      "RETURN_IN",
      "TRANSFER_IN",
    ] as const) {
      expect(
        applyMovement({ currentStockBase: 5, type, quantityBase: 1 }).signedDeltaBase,
      ).toBe(1);
    }
  });

  it("DAMAGE, RETURN_OUT, TRANSFER_OUT decrease", () => {
    for (const type of ["DAMAGE", "RETURN_OUT", "TRANSFER_OUT"] as const) {
      expect(
        applyMovement({ currentStockBase: 5, type, quantityBase: 2 }).signedDeltaBase,
      ).toBe(-2);
    }
  });

  it("allowNegativeStock permits undershoot", () => {
    const r = applyMovement({
      currentStockBase: 2,
      type: "SALE",
      quantityBase: 5,
      allowNegativeStock: true,
    });
    expect(r.nextStockBase).toBe(-3);
  });
});

describe("idempotent apply (by movement id)", () => {
  it("second commit with same id must not double-apply (simulated ledger)", () => {
    const appliedIds = new Set<string>();
    let stock = 10;
    const applyById = (
      id: string,
      type: Parameters<typeof applyMovement>[0]["type"],
      quantityBase: number,
    ) => {
      if (appliedIds.has(id)) return stock;
      const r = applyMovement({ currentStockBase: stock, type, quantityBase });
      appliedIds.add(id);
      stock = r.nextStockBase;
      return stock;
    };
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(applyById(id, "PURCHASE_RECEIVED", 5)).toBe(15);
    expect(applyById(id, "PURCHASE_RECEIVED", 5)).toBe(15);
  });
});

describe("replayMovements", () => {
  it("sorts by capturedAt then id and matches sequential apply", () => {
    const movements = [
      {
        id: "b",
        capturedAt: "2026-04-01T10:00:00.000Z",
        type: "PURCHASE_RECEIVED" as const,
        quantityBase: 10,
      },
      {
        id: "a",
        capturedAt: "2026-04-01T10:00:00.000Z",
        type: "SALE" as const,
        quantityBase: 3,
      },
      {
        id: "c",
        capturedAt: "2026-04-01T09:00:00.000Z",
        type: "PURCHASE_RECEIVED" as const,
        quantityBase: 5,
      },
    ];
    const sorted = sortMovementsForReplay(movements);
    expect(sorted.map((m) => m.id)).toEqual(["c", "a", "b"]);
    const final = replayMovements(movements, { initialStockBase: 0 });
    // 0 +5 (c) -3 (a) +10 (b) = 12
    expect(final).toBe(12);
  });
});
