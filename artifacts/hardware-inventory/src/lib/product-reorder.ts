import { suggestReorder, type ReorderSuggestion, type UsageInput } from "@workspace/reorder-engine";
import type { Movement, Product, UnitConversion } from "@/lib/store";

const DEFAULT_USAGE_LOOKBACK_DAYS = 28;
const DEFAULT_LEAD_DAYS = 7;

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/** Total base units consumed (issues) in the lookback window from ledger deltas. */
export function outboundConsumptionBaseInWindow(
  productId: string,
  movements: Movement[],
  lookbackDays: number,
  nowMs: number,
): number {
  const windowMs = lookbackDays * 86_400_000;
  const cutoff = nowMs - windowMs;
  let total = 0;
  for (const m of movements) {
    if (m.product_id !== productId) continue;
    if (Date.parse(m.timestamp) < cutoff) continue;
    const d = m.signed_delta_base;
    if (d != null && d < 0) total += -d;
  }
  return total;
}

export function averageDailyUsageFromMovements(
  product: Product,
  movements: Movement[],
  lookbackDays: number,
  nowMs: number = Date.now(),
): UsageInput {
  const consumed = outboundConsumptionBaseInWindow(
    product.id,
    movements,
    lookbackDays,
    nowMs,
  );
  const daily = clampNonNeg(consumed / lookbackDays);
  return { basis: "daily", averageBasePerDay: daily };
}

export function inferPurchasePackFromConversions(
  product: Product,
  conversions: UnitConversion[],
): { basePerPurchaseUnit: number | null; label: string | null } {
  if (product.purchase_pack_base_qty != null && product.purchase_pack_base_qty > 0) {
    return {
      basePerPurchaseUnit: product.purchase_pack_base_qty,
      label: product.purchase_unit_label ?? "pack",
    };
  }
  for (const c of conversions) {
    if (c.product_id !== product.id) continue;
    if (c.to_unit === product.primary_unit && c.factor > 0) {
      return { basePerPurchaseUnit: c.factor, label: c.from_unit };
    }
  }
  return { basePerPurchaseUnit: null, label: null };
}

function defaultSafetyStockBase(product: Product): number {
  if (product.safety_stock_level != null && product.safety_stock_level >= 0) {
    return Math.round(product.safety_stock_level);
  }
  if (product.critical_stock_level != null && product.critical_stock_level >= 0) {
    return Math.round(product.critical_stock_level);
  }
  return Math.max(0, Math.round(product.reorder_level * 0.25));
}

function defaultFixedReorderQtyBase(product: Product): number | undefined {
  if (
    product.fixed_reorder_qty_base != null &&
    product.fixed_reorder_qty_base > 0 &&
    Number.isFinite(product.fixed_reorder_qty_base)
  ) {
    return Math.round(product.fixed_reorder_qty_base);
  }
  const target = product.target_stock_level ?? Math.round(product.reorder_level * 2);
  const lot = Math.round(target - product.reorder_level);
  return lot > 0 ? lot : undefined;
}

export type ProductReorderView = ReorderSuggestion & {
  purchaseUnitLabel: string | null;
  usageLookbackDays: number;
  usage: UsageInput;
};

export function computeProductReorder(
  product: Product,
  movements: Movement[],
  conversions: UnitConversion[],
  options?: { usageLookbackDays?: number; nowMs?: number },
): ProductReorderView {
  const usageLookbackDays = options?.usageLookbackDays ?? DEFAULT_USAGE_LOOKBACK_DAYS;
  const nowMs = options?.nowMs ?? Date.now();
  const usage = averageDailyUsageFromMovements(
    product,
    movements,
    usageLookbackDays,
    nowMs,
  );
  const pack = inferPurchasePackFromConversions(product, conversions);
  const lead =
    product.supplier_lead_time_days != null && product.supplier_lead_time_days >= 0
      ? Math.round(product.supplier_lead_time_days)
      : DEFAULT_LEAD_DAYS;

  const suggestion = suggestReorder({
    onHandBase: product.stock_quantity,
    incomingBase: product.incoming_quantity ?? 0,
    reorderPointBase: product.reorder_level,
    safetyStockBase: defaultSafetyStockBase(product),
    leadTimeDays: lead,
    reviewPeriodDays: product.review_period_days,
    usage,
    orderUpToBase: product.target_stock_level ?? null,
    reorderQtyBase: defaultFixedReorderQtyBase(product) ?? null,
    baseUnitsPerPurchaseUnit: pack.basePerPurchaseUnit,
    minimumPurchaseUnits: product.minimum_purchase_units ?? null,
    demandRiskProfile:
      product.demand_risk_profile === "seasonal" ? "seasonal" : undefined,
  });

  return {
    ...suggestion,
    purchaseUnitLabel: pack.label,
    usageLookbackDays,
    usage,
  };
}
