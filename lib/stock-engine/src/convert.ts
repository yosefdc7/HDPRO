import { convertToBaseUnit, type ConversionContext } from "@workspace/inventory-units";
import { StockEngineError } from "./errors";
import type { StockMovementType } from "./types";

export type MovementQuantityInput = Readonly<{
  quantityInUnit: number;
  unit: string;
  conversion: ConversionContext;
}>;

/**
 * Converts a user-entered quantity in `unit` to base units (integer).
 */
export function toMovementQuantityBaseFromUserUnit(
  input: MovementQuantityInput,
): number {
  try {
    return convertToBaseUnit(input.quantityInUnit, input.unit, input.conversion);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new StockEngineError("INVALID_QUANTITY", message);
  }
}

/**
 * For non-adjustment types: magnitude in base units (>= 0).
 * For ADJUSTMENT: pass the signed delta in source units if the unit is base — otherwise convert magnitude and apply sign separately.
 */
export function toSignedQuantityBaseForAdjustment(
  signedQuantityInUnit: number,
  unit: string,
  conversion: ConversionContext,
): number {
  if (!Number.isFinite(signedQuantityInUnit) || !Number.isInteger(signedQuantityInUnit)) {
    throw new StockEngineError(
      "INVALID_QUANTITY",
      "Adjustment delta must be a finite integer in the given unit",
    );
  }
  if (signedQuantityInUnit === 0) {
    throw new StockEngineError(
      "INVALID_ADJUSTMENT_ZERO",
      "Adjustment quantity (signed delta) must not be zero",
    );
  }
  const sign = Math.sign(signedQuantityInUnit);
  const mag = Math.abs(signedQuantityInUnit);
  const baseMag = toMovementQuantityBaseFromUserUnit({
    quantityInUnit: mag,
    unit,
    conversion,
  });
  return sign * baseMag;
}

export function quantityBaseForCreate(
  type: StockMovementType,
  quantityInUnit: number,
  unit: string,
  conversion: ConversionContext,
): number {
  if (type === "ADJUSTMENT") {
    return toSignedQuantityBaseForAdjustment(quantityInUnit, unit, conversion);
  }
  return toMovementQuantityBaseFromUserUnit({
    quantityInUnit,
    unit,
    conversion,
  });
}
