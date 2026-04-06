import { applyMovement } from "./apply";
import type { ReplayMovementSlice } from "./types";

function toTimeMs(value: Date | string): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const t = Date.parse(value);
  if (Number.isNaN(t)) {
    return 0;
  }
  return t;
}

/**
 * Deterministic total order for rebuilding stock from history.
 */
export function sortMovementsForReplay<T extends ReplayMovementSlice>(
  movements: readonly T[],
): T[] {
  return [...movements].sort((a, b) => {
    const ta = toTimeMs(a.capturedAt);
    const tb = toTimeMs(b.capturedAt);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

export type ReplayOptions = Readonly<{
  /** Starting stock before first movement; default 0 */
  initialStockBase?: number;
  allowNegativeStock?: boolean;
}>;

/**
 * Folds movements in sort order into a final stock. Useful for audits.
 */
export function replayMovements(
  movements: readonly ReplayMovementSlice[],
  options: ReplayOptions = {},
): number {
  const sorted = sortMovementsForReplay(movements);
  let stock = options.initialStockBase ?? 0;
  for (const m of sorted) {
    const r = applyMovement({
      currentStockBase: stock,
      type: m.type,
      quantityBase: m.quantityBase,
      allowNegativeStock: options.allowNegativeStock,
    });
    stock = r.nextStockBase;
  }
  return stock;
}
