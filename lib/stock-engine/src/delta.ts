import {
  STOCK_DECREASING_TYPES,
  STOCK_INCREASING_TYPES,
  type StockMovementType,
} from "./types";

/**
 * @param quantityBase — For ADJUSTMENT: signed delta. Otherwise non-negative magnitude.
 */
export function movementSignedDelta(
  type: StockMovementType,
  quantityBase: number,
): number {
  if (type === "ADJUSTMENT") {
    return quantityBase;
  }
  if (STOCK_INCREASING_TYPES.has(type)) {
    return quantityBase;
  }
  if (STOCK_DECREASING_TYPES.has(type)) {
    return -quantityBase;
  }
  throw new Error(`Unhandled movement type: ${String(type)}`);
}
