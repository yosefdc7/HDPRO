import { movementSignedDelta } from "./delta";
import { StockEngineError } from "./errors";
import type { StockMovementType } from "./types";

export type ApplyMovementInput = Readonly<{
  currentStockBase: number;
  type: StockMovementType;
  /**
   * For ADJUSTMENT: signed delta in base units (non-zero integer).
   * For all other types: non-negative magnitude in base units.
   */
  quantityBase: number;
  /** When true, allows quantity after movement to be negative. Default false. */
  allowNegativeStock?: boolean;
}>;

export type ApplyMovementResult = Readonly<{
  quantityBeforeBase: number;
  quantityAfterBase: number;
  signedDeltaBase: number;
  nextStockBase: number;
}>;

function assertInteger(name: string, n: number): void {
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new StockEngineError(
      "INVALID_QUANTITY",
      `${name} must be a finite integer (got ${n})`,
    );
  }
}

/**
 * Computes next stock and ledger snapshots. Does not persist.
 *
 * @throws StockEngineError for invalid quantities or insufficient stock when disallowed.
 */
export function applyMovement(input: ApplyMovementInput): ApplyMovementResult {
  const { currentStockBase, type, allowNegativeStock = false } = input;
  let { quantityBase } = input;

  assertInteger("currentStockBase", currentStockBase);

  if (type === "ADJUSTMENT") {
    assertInteger("quantityBase", quantityBase);
    if (quantityBase === 0) {
      throw new StockEngineError(
        "INVALID_ADJUSTMENT_ZERO",
        "Adjustment quantity (signed delta) must not be zero",
      );
    }
  } else {
    assertInteger("quantityBase", quantityBase);
    if (quantityBase < 0) {
      throw new StockEngineError(
        "INVALID_QUANTITY",
        "quantityBase must be non-negative for this movement type",
      );
    }
  }

  const signedDeltaBase = movementSignedDelta(type, quantityBase);
  const quantityBeforeBase = currentStockBase;
  const quantityAfterBase = currentStockBase + signedDeltaBase;

  if (!allowNegativeStock && quantityAfterBase < 0) {
    throw new StockEngineError(
      "INSUFFICIENT_STOCK",
      "Stock would become negative",
      {
        quantityBeforeBase,
        signedDeltaBase,
        quantityAfterBase,
      },
    );
  }

  return {
    quantityBeforeBase,
    quantityAfterBase,
    signedDeltaBase,
    nextStockBase: quantityAfterBase,
  };
}
