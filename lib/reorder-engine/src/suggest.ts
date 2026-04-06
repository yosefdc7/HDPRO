/**
 * Reorder suggestion engine (Hardware Inventory Pro)
 *
 * All quantities are in the product **base unit** (e.g. pieces, metres) unless
 * explicitly named `purchaseUnits`.
 *
 * ## Core formulas (continuous review, base units)
 *
 * Let:
 * - \(I\) = on-hand base, \(Q_{in}\) = incoming base, \(P = I + Q_{in}\) = inventory position
 * - \(ROP\) = reorder point (base), \(SS\) = safety stock (base)
 * - \(L\) = supplier lead time (days), \(R\) = internal review cadence (days, optional)
 * - \(d\) = average demand per day in base units (from daily or weekly usage)
 * - \(LTD = d \cdot L\) = lead-time demand
 * - \(PU\) = base units per **one** purchase unit (pack / box / case)
 *
 * **Reorder trigger:** suggest when \(P \le ROP\) (at or below the reorder point).
 *
 * **Target cover position** (what we try to reach *after* the order arrives, before
 * the next consumption — exact policy is configurable):
 *
 * 1. If `orderUpToBase` is set: \(T =\) clamp to at least \(ROP\).
 * 2. Else if `reorderQtyBase` is set (fixed bring-up lot from policy): \(T = ROP + Q_{fixed}\).
 * 3. Else (demand cover beyond ROP): \(T = ROP + d \cdot (L + R)\).
 *
 * **Uncapped need:** \(N_{raw} = \max(0,\; T - P)\) when a reorder is triggered; otherwise 0.
 *
 * **Purchase-pack rounding:** \(N_{packs} = \lceil N_{raw} / PU \rceil\), then respect MOQ packs.
 * Ordered base becomes \(N_{packs} \cdot PU\), which may exceed \(N_{raw}\) — intentional for full boxes.
 *
 * **Note:** A well-tuned \(ROP\) often satisfies \(ROP \approx SS + LTD\) for known \(d\) and \(L\).
 * This engine **uses your stored \(ROP\)** as the control limit while still consuming \(SS\), \(L\),
 * and usage for targets when fixed lots are not provided.
 */

export type UsageInput =
  | { basis: "daily"; averageBasePerDay: number }
  | { basis: "weekly"; averageBasePerWeek: number };

export type DemandRiskProfile = "steady" | "slow_mover" | "seasonal";

export type PackRoundingMode = "ceil" | "floor";

export type ReorderFlags =
  | "slow_mover"
  | "seasonal_profile"
  | "zero_or_unknown_usage"
  | "pack_rounding_overshoot"
  | "at_reorder_without_computed_need"
  | "missing_or_invalid_pack_size";

export type ReorderSuggestionInput = {
  /** Current on-hand quantity in base units */
  onHandBase: number;
  /** Pipeline quantity not yet received (open POs, etc.) in base units */
  incomingBase: number;
  reorderPointBase: number;
  safetyStockBase: number;
  /** Supplier lead time in calendar days (0 allowed for same-day categories) */
  leadTimeDays: number;
  /**
   * How often you *review* or batch purchasing (days). Defaults to 0.
   * Used only when computing a demand-based target (no fixed order-up-to / reorder lot).
   */
  reviewPeriodDays?: number;
  usage: UsageInput;
  /**
   * Optional explicit order-up-to level (base). When set, becomes the primary target \(T\)
   * (still not below \(ROP\)).
   */
  orderUpToBase?: number | null;
  /**
   * Fixed bring-up quantity from policy: \(T = ROP + reorderQtyBase\) when no order-up-to.
   */
  reorderQtyBase?: number | null;
  /** Base units contained in one supplier purchase unit (e.g. 1000 pieces per box). */
  baseUnitsPerPurchaseUnit?: number | null;
  /** Minimum packs/cases to order from supplier (defaults to 1 when rounding applies). */
  minimumPurchaseUnits?: number | null;
  /**
   * How to snap raw need to whole purchase units. Default `ceil` = full boxes only.
   * `floor` can under-order; use only with manager acknowledgement.
   */
  packRoundingMode?: PackRoundingMode;
  /** Days of usage below this (base/day) mark the item as a slow mover in outputs. */
  slowMoverMaxDailyBase?: number;
  demandRiskProfile?: DemandRiskProfile;
};

export type ReorderSuggestion = {
  /** True when inventory position is at/below reorder point */
  shouldReorder: boolean;
  /** \(P = I + Q_{in}\) */
  projectedPositionBase: number;
  dailyDemandBase: number;
  leadTimeDemandBase: number;
  /** Target inventory position the policy aims to restore toward order arrival */
  targetPositionBase: number;
  /** \(N_{raw}\) before pack / MOQ constraints */
  uncappedNeedBase: number;
  /** Suggested count of supplier purchase units after rounding + MOQ */
  suggestedPurchaseUnits: number;
  /** `suggestedPurchaseUnits * baseUnitsPerPurchaseUnit` when packs apply; otherwise equals uncapped need */
  suggestedOrderBase: number;
  /** Positive when suggested base exceeds uncapped need (typically rounding) */
  roundingSurplusBase: number;
  flags: ReorderFlags[];
  notes: string[];
};

const DEFAULT_SLOW_MOVER_MAX_DAILY = 0.25;

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/** Converts usage input to a non-negative daily demand rate in base units. */
export function toDailyDemandBase(usage: UsageInput): number {
  if (usage.basis === "daily") return clampNonNeg(usage.averageBasePerDay);
  return clampNonNeg(usage.averageBasePerWeek / 7);
}

function resolveTargetPositionBase(input: ReorderSuggestionInput, daily: number): number {
  const rop = clampNonNeg(input.reorderPointBase);
  const LT = clampNonNeg(input.leadTimeDays);
  const review = clampNonNeg(input.reviewPeriodDays ?? 0);

  if (input.orderUpToBase != null && Number.isFinite(input.orderUpToBase)) {
    return Math.max(rop, clampNonNeg(input.orderUpToBase));
  }
  if (input.reorderQtyBase != null && Number.isFinite(input.reorderQtyBase) && input.reorderQtyBase > 0) {
    return rop + input.reorderQtyBase;
  }
  return rop + daily * (LT + review);
}

function roundNeedToPurchaseUnits(
  rawNeed: number,
  pack: number,
  mode: PackRoundingMode,
  minimumPurchaseUnits: number,
): { purchaseUnits: number; orderedBase: number } {
  if (rawNeed <= 0) return { purchaseUnits: 0, orderedBase: 0 };
  let packs =
    mode === "floor" ? Math.floor(rawNeed / pack) : Math.ceil(rawNeed / pack);
  packs = Math.max(packs, minimumPurchaseUnits);
  return { purchaseUnits: packs, orderedBase: packs * pack };
}

export function suggestReorder(input: ReorderSuggestionInput): ReorderSuggestion {
  const flags: ReorderFlags[] = [];
  const notes: string[] = [];

  const onHand = clampNonNeg(input.onHandBase);
  const incoming = clampNonNeg(input.incomingBase);
  const projected = onHand + incoming;

  const rop = clampNonNeg(input.reorderPointBase);
  const safety = clampNonNeg(input.safetyStockBase);
  const LT = clampNonNeg(input.leadTimeDays);
  const daily = toDailyDemandBase(input.usage);
  const ltd = daily * LT;

  if (input.demandRiskProfile === "seasonal") flags.push("seasonal_profile");
  const slowThreshold = input.slowMoverMaxDailyBase ?? DEFAULT_SLOW_MOVER_MAX_DAILY;
  if (daily <= slowThreshold) flags.push("slow_mover");
  if (daily === 0) flags.push("zero_or_unknown_usage");

  const shouldReorder = projected <= rop;

  const target = resolveTargetPositionBase(input, daily);
  let uncapped = shouldReorder ? Math.max(0, target - projected) : 0;

  if (shouldReorder && uncapped === 0 && daily === 0) {
    flags.push("at_reorder_without_computed_need");
    notes.push(
      "At reorder point with zero computed usage-based cover — confirm demand or set an explicit order-up-to / fixed reorder quantity.",
    );
  }

  const packRaw = input.baseUnitsPerPurchaseUnit;
  const pack =
    packRaw != null && Number.isFinite(packRaw) && packRaw > 0 ? packRaw : null;
  const roundingMode: PackRoundingMode = input.packRoundingMode ?? "ceil";
  const moqPacks = Math.max(1, Math.floor(clampNonNeg(input.minimumPurchaseUnits ?? 1)));

  let suggestedPurchaseUnits = 0;
  let suggestedOrderBase = 0;

  if (shouldReorder && uncapped > 0) {
    if (pack == null) {
      flags.push("missing_or_invalid_pack_size");
      suggestedPurchaseUnits = 1;
      suggestedOrderBase = uncapped;
      notes.push(
        "No valid purchase pack size — suggestion is uncapped base units (1 logical purchase line).",
      );
    } else {
      const rounded = roundNeedToPurchaseUnits(uncapped, pack, roundingMode, moqPacks);
      suggestedPurchaseUnits = rounded.purchaseUnits;
      suggestedOrderBase = rounded.orderedBase;
      if (suggestedOrderBase > uncapped + 1e-9) {
        flags.push("pack_rounding_overshoot");
        notes.push(
          `Full-pack rounding increases the order by ${(suggestedOrderBase - uncapped).toFixed(2)} base units versus raw need.`,
        );
      }
    }
  }

  const roundingSurplusBase = Math.max(0, suggestedOrderBase - uncapped);

  // Sanity note when ROP and safety diverge strongly from implied LTD (informational only)
  if (LT > 0 && daily > 0 && rop + 1e-9 < safety + ltd * 0.5) {
    notes.push(
      "Reorder point is well below safety + lead-time demand — verify policy numbers or usage window.",
    );
  }

  return {
    shouldReorder,
    projectedPositionBase: projected,
    dailyDemandBase: daily,
    leadTimeDemandBase: ltd,
    targetPositionBase: target,
    uncappedNeedBase: uncapped,
    suggestedPurchaseUnits,
    suggestedOrderBase,
    roundingSurplusBase,
    flags,
    notes,
  };
}
