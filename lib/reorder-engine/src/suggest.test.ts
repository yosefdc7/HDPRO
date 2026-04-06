import { describe, expect, it } from "vitest";
import { suggestReorder, toDailyDemandBase } from "./suggest";

describe("toDailyDemandBase", () => {
  it("normalizes weekly usage to daily", () => {
    expect(
      toDailyDemandBase({ basis: "weekly", averageBasePerWeek: 70 }),
    ).toBeCloseTo(10, 5);
  });
});

describe("suggestReorder — example calculations", () => {
  it("NAIL-style: ROP + fixed reorder qty, full boxes (ceil)", () => {
    // Mirrors seed-style policy: at ROP 20_000 with lot 50_000, box = 1000 pc
    const r = suggestReorder({
      onHandBase: 19_000,
      incomingBase: 0,
      reorderPointBase: 20_000,
      safetyStockBase: 5_000,
      leadTimeDays: 14,
      usage: { basis: "daily", averageBasePerDay: 800 },
      reorderQtyBase: 50_000,
      baseUnitsPerPurchaseUnit: 1000,
    });

    expect(r.shouldReorder).toBe(true);
    expect(r.projectedPositionBase).toBe(19_000);
    expect(r.targetPositionBase).toBe(70_000); // 20k ROP + 50k lot
    expect(r.uncappedNeedBase).toBe(51_000);
    expect(r.suggestedPurchaseUnits).toBe(51); // ceil(51000/1000)
    expect(r.suggestedOrderBase).toBe(51_000);
    expect(r.roundingSurplusBase).toBe(0);
    expect(r.flags).not.toContain("pack_rounding_overshoot");
  });

  it("rounds up to full boxes when raw need is not divisible", () => {
    const r = suggestReorder({
      onHandBase: 100,
      incomingBase: 0,
      reorderPointBase: 500,
      safetyStockBase: 100,
      leadTimeDays: 7,
      usage: { basis: "daily", averageBasePerDay: 50 },
      reorderQtyBase: 2000,
      baseUnitsPerPurchaseUnit: 1000,
    });

    expect(r.shouldReorder).toBe(true);
    expect(r.uncappedNeedBase).toBe(2400); // target 2500 - 100
    expect(r.suggestedPurchaseUnits).toBe(3); // ceil(2400/1000)
    expect(r.suggestedOrderBase).toBe(3000);
    expect(r.roundingSurplusBase).toBe(600);
    expect(r.flags).toContain("pack_rounding_overshoot");
  });

  it("respects supplier MOQ in purchase units", () => {
    const r = suggestReorder({
      onHandBase: 0,
      incomingBase: 0,
      reorderPointBase: 100,
      safetyStockBase: 50,
      leadTimeDays: 3,
      usage: { basis: "daily", averageBasePerDay: 10 },
      reorderQtyBase: 40,
      baseUnitsPerPurchaseUnit: 10,
      minimumPurchaseUnits: 5,
    });

    expect(r.uncappedNeedBase).toBe(140);
    // ceil(140/10) = 14, but MOQ 5 is already satisfied; still 14 packs
    expect(r.suggestedPurchaseUnits).toBe(14);

    const rMoq = suggestReorder({
      onHandBase: 90,
      incomingBase: 0,
      reorderPointBase: 100,
      safetyStockBase: 50,
      leadTimeDays: 3,
      usage: { basis: "daily", averageBasePerDay: 1 },
      reorderQtyBase: 20,
      baseUnitsPerPurchaseUnit: 100,
      minimumPurchaseUnits: 2,
    });
    expect(rMoq.uncappedNeedBase).toBe(30); // target 120 - 90
    expect(rMoq.suggestedPurchaseUnits).toBe(2); // ceil(0.3) = 1 pack -> max(1, moq 2) = 2
    expect(rMoq.suggestedOrderBase).toBe(200);
  });

  it("does not suggest when position is above reorder point", () => {
    const r = suggestReorder({
      onHandBase: 5000,
      incomingBase: 3000,
      reorderPointBase: 6000,
      safetyStockBase: 2000,
      leadTimeDays: 10,
      usage: { basis: "weekly", averageBasePerWeek: 700 },
      reorderQtyBase: 10_000,
      baseUnitsPerPurchaseUnit: 500,
    });
    expect(r.shouldReorder).toBe(false);
    expect(r.suggestedOrderBase).toBe(0);
  });

  it("incoming stock can cancel a reorder signal", () => {
    const r = suggestReorder({
      onHandBase: 1000,
      incomingBase: 6000,
      reorderPointBase: 5000,
      safetyStockBase: 1000,
      leadTimeDays: 5,
      usage: { basis: "daily", averageBasePerDay: 100 },
      reorderQtyBase: 8000,
      baseUnitsPerPurchaseUnit: 1000,
    });
    expect(r.projectedPositionBase).toBe(7000);
    expect(r.shouldReorder).toBe(false);
  });

  it("demand-based target when no fixed lot: T = ROP + d*(L+R)", () => {
    const r = suggestReorder({
      onHandBase: 50,
      incomingBase: 0,
      reorderPointBase: 200,
      safetyStockBase: 80,
      leadTimeDays: 4,
      reviewPeriodDays: 3,
      usage: { basis: "daily", averageBasePerDay: 10 },
      baseUnitsPerPurchaseUnit: 25,
    });
    expect(r.shouldReorder).toBe(true);
    expect(r.targetPositionBase).toBe(270); // 200 + 10*(4+3)
    expect(r.uncappedNeedBase).toBe(220);
    expect(r.suggestedPurchaseUnits).toBe(9); // ceil(220/25)
    expect(r.suggestedOrderBase).toBe(225);
  });

  it("order-up-to overrides other targets", () => {
    const r = suggestReorder({
      onHandBase: 100,
      incomingBase: 0,
      reorderPointBase: 150,
      safetyStockBase: 40,
      leadTimeDays: 2,
      usage: { basis: "daily", averageBasePerDay: 20 },
      orderUpToBase: 400,
      reorderQtyBase: 5000, // ignored when order-up-to is set
      baseUnitsPerPurchaseUnit: 50,
    });
    expect(r.targetPositionBase).toBe(400);
    expect(r.uncappedNeedBase).toBe(300);
    expect(r.suggestedPurchaseUnits).toBe(6);
  });

  it("flags slow movers and seasonal profiles", () => {
    const slow = suggestReorder({
      onHandBase: 5,
      incomingBase: 0,
      reorderPointBase: 10,
      safetyStockBase: 2,
      leadTimeDays: 30,
      usage: { basis: "daily", averageBasePerDay: 0.1 },
      reorderQtyBase: 50,
      baseUnitsPerPurchaseUnit: 10,
      slowMoverMaxDailyBase: 0.5,
    });
    expect(slow.flags).toContain("slow_mover");

    const seasonal = suggestReorder({
      onHandBase: 5,
      incomingBase: 0,
      reorderPointBase: 10,
      safetyStockBase: 2,
      leadTimeDays: 5,
      usage: { basis: "daily", averageBasePerDay: 5 },
      reorderQtyBase: 40,
      baseUnitsPerPurchaseUnit: 1,
      demandRiskProfile: "seasonal",
    });
    expect(seasonal.flags).toContain("seasonal_profile");
  });
});
