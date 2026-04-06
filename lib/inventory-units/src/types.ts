/**
 * Unit identifiers are compared case-sensitively (e.g. `"pcs"` and `"PCS"` differ).
 * Trim strings at ingest if user input may contain whitespace.
 */
export type UnitId = string & { readonly __brand?: "UnitId" };

export type UnitConversionRule = Readonly<{
  fromUnit: UnitId;
  toUnit: UnitId;
  /**
   * One `fromUnit` counts as `factor` times `toUnit`.
   * Invariant: `quantityInTo = quantityInFrom * factor`.
   */
  factor: number;
}>;

export type ConversionContext = Readonly<{
  baseUnit: UnitId;
  rules: readonly UnitConversionRule[];
}>;

export type ValidationResult =
  | { ok: true }
  | { ok: false; issues: readonly string[] };

export type MixedUnitPart = Readonly<{
  unit: UnitId;
  count: number;
}>;
