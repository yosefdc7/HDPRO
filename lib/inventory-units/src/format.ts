import type { ConversionContext, MixedUnitPart, UnitId } from "./types";

export type FormatMixedUnitsOptions = Readonly<{
  /** Joiner between parts, default `" + "`. */
  separator?: string;
  /**
   * When true, include a trailing base-unit part even when its count is 0
   * (e.g. `"2 box + 0 pcs"`). Default false: omit a zero remainder chunk.
   */
  includeZeroParts?: boolean;
  pluralize?: (unit: UnitId, count: number) => string;
}>;

function defaultPluralize(unit: UnitId, count: number): string {
  return `${count} ${unit}`;
}

/** Exported for tests and custom UIs. */
export function mixedUnitPartsFromBase(
  quantityBase: number,
  ctx: ConversionContext,
  _options: Pick<FormatMixedUnitsOptions, "includeZeroParts"> = {},
): MixedUnitPart[] {
  if (!Number.isFinite(quantityBase) || !Number.isInteger(quantityBase)) {
    throw new TypeError("quantityBase must be a finite integer");
  }

  const includeZeroParts = _options.includeZeroParts ?? false;

  const tiers = ctx.rules
    .filter((r) => r.toUnit === ctx.baseUnit)
    .map((r) => ({
      unit: r.fromUnit,
      baseUnitsPerPackage: r.factor,
    }))
    .filter((t) => Number.isInteger(t.baseUnitsPerPackage) && t.baseUnitsPerPackage >= 1);

  tiers.sort((a, b) => b.baseUnitsPerPackage - a.baseUnitsPerPackage);

  const parts: MixedUnitPart[] = [];
  let remaining = quantityBase;

  for (const tier of tiers) {
    const whole = Math.floor(remaining / tier.baseUnitsPerPackage);
    if (whole > 0) {
      parts.push({ unit: tier.unit, count: whole });
    }
    remaining = remaining % tier.baseUnitsPerPackage;
  }

  const needsBasePart =
    remaining > 0 ||
    parts.length === 0 ||
    (includeZeroParts && remaining === 0 && parts.length > 0);

  if (needsBasePart) {
    parts.push({ unit: ctx.baseUnit, count: remaining });
  }

  return parts;
}

/**
 * Human-readable decomposition like `"2 box + 14 pcs"` from a base-unit total.
 */
export function formatMixedUnits(
  quantityBase: number,
  ctx: ConversionContext,
  options?: FormatMixedUnitsOptions,
): string {
  const separator = options?.separator ?? " + ";
  const pluralize = options?.pluralize ?? defaultPluralize;
  const parts = mixedUnitPartsFromBase(quantityBase, ctx, {
    includeZeroParts: options?.includeZeroParts,
  });

  if (parts.length === 0) {
    return pluralize(ctx.baseUnit, quantityBase);
  }

  return parts.map((p) => pluralize(p.unit, p.count)).join(separator);
}
