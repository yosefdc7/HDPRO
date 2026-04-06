import { ConversionError } from "./errors";
import type { ConversionContext, UnitId } from "./types";

const MAX_CONVERSION_DEPTH = 32;

function assertIntegerQuantity(n: number, label: string): void {
  if (!Number.isFinite(n)) {
    throw new ConversionError(
      "INVALID_QUANTITY",
      `${label} must be a finite number (got ${n})`,
    );
  }
  if (!Number.isInteger(n)) {
    throw new ConversionError(
      "INVALID_QUANTITY",
      `${label} must be an integer (got ${n})`,
    );
  }
}

/**
 * Converts a quantity expressed in `fromUnit` into {@link ConversionContext.baseUnit}.
 * Uses chained rules where `toQty = fromQty * factor` until `baseUnit` is reached.
 *
 * @throws {ConversionError} On unknown unit, ambiguous rules, depth/cycle issues, or non-integer intermediates.
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: UnitId,
  ctx: ConversionContext,
): number {
  assertIntegerQuantity(quantity, "quantity");

  function walk(qty: number, unit: string, depth: number): number {
    if (unit === ctx.baseUnit) {
      return qty;
    }
    if (depth > MAX_CONVERSION_DEPTH) {
      throw new ConversionError(
        "PATH_TOO_DEEP",
        `Conversion from "${unit}" to "${ctx.baseUnit}" exceeds depth limit (possible cycle)`,
      );
    }

    const matches = ctx.rules.filter((r) => r.fromUnit === unit);
    if (matches.length === 0) {
      throw new ConversionError(
        "UNKNOWN_UNIT",
        `No conversion rule from "${unit}" toward base "${ctx.baseUnit}"`,
      );
    }

    const targetUnits = new Set(matches.map((r) => r.toUnit as string));
    if (targetUnits.size > 1) {
      throw new ConversionError(
        "AMBIGUOUS_PATH",
        `Multiple target units for "${unit}": ${[...targetUnits].join(", ")}`,
      );
    }

    const rule = matches[0]!;
    const nextQty = qty * rule.factor;
    if (!Number.isInteger(nextQty)) {
      throw new ConversionError(
        "NON_INTEGER_INTERMEDIATE",
        `Intermediate quantity ${qty} × ${rule.factor} is not an integer`,
      );
    }

    return walk(nextQty, rule.toUnit as string, depth + 1);
  }

  return walk(quantity, fromUnit as string, 0);
}

/**
 * Converts an integer quantity in {@link ConversionContext.baseUnit} into an alternate packaging `toUnit`.
 * Only supports rules where `fromUnit === toUnit` (argument) and `rule.toUnit === baseUnit` (single hop from packaging to base).
 *
 * @throws {ConversionError} If there is no direct inverse rule or `quantityBase` is not divisible by `factor`.
 */
export function convertFromBaseUnit(
  quantityBase: number,
  toUnit: UnitId,
  ctx: ConversionContext,
): number {
  assertIntegerQuantity(quantityBase, "quantityBase");

  if ((toUnit as string) === ctx.baseUnit) {
    return quantityBase;
  }

  const direct = ctx.rules.find(
    (r) => r.fromUnit === toUnit && r.toUnit === ctx.baseUnit,
  );
  if (!direct) {
    throw new ConversionError(
      "UNSUPPORTED_INVERSE",
      `No direct rule from "${toUnit}" to base "${ctx.baseUnit}"`,
    );
  }

  if (quantityBase % direct.factor !== 0) {
    throw new ConversionError(
      "NOT_EXACTLY_DIVISIBLE",
      `${quantityBase} is not a whole multiple of ${direct.factor} ${ctx.baseUnit} per ${toUnit}`,
    );
  }

  return quantityBase / direct.factor;
}
