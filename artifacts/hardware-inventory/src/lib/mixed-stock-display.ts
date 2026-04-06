import type { UnitConversion } from "@/lib/store";

export type MixedPart = { quantity: number; unit: string };

function pluralUnit(qty: number, unit: string): string {
  if (qty === 1) return unit;
  if (unit.endsWith("s")) return unit;
  if (unit.endsWith("ch") || unit.endsWith("sh") || unit.endsWith("x")) return `${unit}es`;
  if (unit.endsWith("meter")) return `${unit}s`;
  return `${unit}s`;
}

/** Alternate packs that convert *into* base units (1 from = factor base). */
function packRules(primaryUnit: string, conversions: UnitConversion[]) {
  return conversions
    .filter((c) => c.to_unit === primaryUnit && c.factor > 0)
    .map((c) => ({ packUnit: c.from_unit, factor: c.factor }))
    .sort((a, b) => b.factor - a.factor);
}

/**
 * Break base quantity into largest alternate packs first; remainder in base unit.
 */
export function getMixedStockParts(
  quantityBase: number,
  primaryUnit: string,
  conversions: UnitConversion[],
): MixedPart[] {
  const q = Math.max(0, Math.round(quantityBase));
  const rules = packRules(primaryUnit, conversions);
  if (rules.length === 0) {
    return q === 0 ? [] : [{ quantity: q, unit: primaryUnit }];
  }
  const parts: MixedPart[] = [];
  let remaining = q;
  for (const { packUnit, factor } of rules) {
    const whole = Math.floor(remaining / factor);
    if (whole > 0) {
      parts.push({ quantity: whole, unit: packUnit });
      remaining %= factor;
    }
  }
  if (remaining > 0) {
    parts.push({ quantity: remaining, unit: primaryUnit });
  }
  return parts;
}

export function formatMixedStockLine(parts: MixedPart[]): string {
  if (parts.length === 0) return "0";
  return parts
    .map((p) => `${p.quantity.toLocaleString()} ${pluralUnit(p.quantity, p.unit)}`)
    .join(", ");
}

export function getMixedStockDisplay(
  quantityBase: number,
  primaryUnit: string,
  conversions: UnitConversion[],
): { parts: MixedPart[]; line: string } {
  const parts = getMixedStockParts(quantityBase, primaryUnit, conversions);
  return { parts, line: formatMixedStockLine(parts) };
}
