import { describe, expect, it } from "vitest";
import { formatMixedUnits, mixedUnitPartsFromBase } from "./format";
import type { ConversionContext, UnitId } from "./types";

const ctxBoxPcs: ConversionContext = {
  baseUnit: "pcs" as UnitId,
  rules: [{ fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 100 }],
};

const ctxTwoTiers: ConversionContext = {
  baseUnit: "bag" as UnitId,
  rules: [
    { fromUnit: "pallet" as UnitId, toUnit: "bag" as UnitId, factor: 40 },
    { fromUnit: "bundle" as UnitId, toUnit: "bag" as UnitId, factor: 10 },
  ],
};

describe("mixedUnitPartsFromBase", () => {
  it("214 pcs → 2 box + 14 pcs", () => {
    const parts = mixedUnitPartsFromBase(214, ctxBoxPcs);
    expect(parts).toEqual([
      { unit: "box", count: 2 },
      { unit: "pcs", count: 14 },
    ]);
  });

  it("only base when no tiers", () => {
    const ctx: ConversionContext = {
      baseUnit: "meter" as UnitId,
      rules: [],
    };
    expect(mixedUnitPartsFromBase(22, ctx)).toEqual([{ unit: "meter", count: 22 }]);
  });

  it("zero total", () => {
    expect(mixedUnitPartsFromBase(0, ctxBoxPcs)).toEqual([{ unit: "pcs", count: 0 }]);
  });

  it("sorts larger packaging first", () => {
    const parts = mixedUnitPartsFromBase(85, ctxTwoTiers);
    expect(parts).toEqual([
      { unit: "pallet", count: 2 },
      { unit: "bag", count: 5 },
    ]);
  });

  it("includeZeroParts adds trailing base with 0", () => {
    const parts = mixedUnitPartsFromBase(200, ctxBoxPcs, { includeZeroParts: true });
    expect(parts).toEqual([
      { unit: "box", count: 2 },
      { unit: "pcs", count: 0 },
    ]);
  });

  it("rejects non-integer base quantity", () => {
    expect(() => mixedUnitPartsFromBase(1.5, ctxBoxPcs)).toThrow(TypeError);
  });
});

describe("formatMixedUnits", () => {
  it("joins with default separator", () => {
    expect(formatMixedUnits(214, ctxBoxPcs)).toBe("2 box + 14 pcs");
  });

  it("custom separator and pluralize", () => {
    const s = formatMixedUnits(214, ctxBoxPcs, {
      separator: " / ",
      pluralize: (u, n) => `${n}×${u}`,
    });
    expect(s).toBe("2×box / 14×pcs");
  });

  it("zero with no tiers", () => {
    const ctx: ConversionContext = { baseUnit: "roll" as UnitId, rules: [] };
    expect(formatMixedUnits(0, ctx)).toBe("0 roll");
  });
});
