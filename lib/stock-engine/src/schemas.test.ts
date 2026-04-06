import { describe, expect, it } from "vitest";
import { createStockMovementBaseSchema } from "./schemas";

describe("createStockMovementBaseSchema", () => {
  it("rejects ADJUSTMENT with zero quantityBase", () => {
    const r = createStockMovementBaseSchema.safeParse({
      id: "x",
      productId: "p",
      type: "ADJUSTMENT",
      quantityBase: 0,
      reason: "count",
      actorUserId: "u1",
      capturedAt: new Date("2026-04-01T00:00:00Z"),
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-ADJUSTMENT negative quantityBase", () => {
    const r = createStockMovementBaseSchema.safeParse({
      id: "x",
      productId: "p",
      type: "SALE",
      quantityBase: -1,
      reason: "sale",
      actorUserId: "u1",
      capturedAt: new Date("2026-04-01T00:00:00Z"),
    });
    expect(r.success).toBe(false);
  });
});
