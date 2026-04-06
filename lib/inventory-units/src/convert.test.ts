import { describe, expect, it } from "vitest";
import { ConversionError } from "./errors";
import { convertFromBaseUnit, convertToBaseUnit } from "./convert";
import type { ConversionContext, UnitId } from "./types";

const ctxBoxPcs: ConversionContext = {
  baseUnit: "pcs" as UnitId,
  rules: [{ fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 100 }],
};

const ctxRollMeter: ConversionContext = {
  baseUnit: "meter" as UnitId,
  rules: [{ fromUnit: "roll" as UnitId, toUnit: "meter" as UnitId, factor: 150 }],
};

const ctxPalletBag: ConversionContext = {
  baseUnit: "bag" as UnitId,
  rules: [{ fromUnit: "pallet" as UnitId, toUnit: "bag" as UnitId, factor: 40 }],
};

const ctxMultiHop: ConversionContext = {
  baseUnit: "pcs" as UnitId,
  rules: [
    { fromUnit: "carton" as UnitId, toUnit: "box" as UnitId, factor: 10 },
    { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 12 },
  ],
};

describe("convertToBaseUnit", () => {
  it("identity when from unit is base", () => {
    expect(convertToBaseUnit(214, "pcs" as UnitId, ctxBoxPcs)).toBe(214);
    expect(convertToBaseUnit(0, "pcs" as UnitId, ctxBoxPcs)).toBe(0);
  });

  it("direct conversion: box → pcs", () => {
    expect(convertToBaseUnit(2, "box" as UnitId, ctxBoxPcs)).toBe(200);
    expect(convertToBaseUnit(1, "box" as UnitId, ctxBoxPcs)).toBe(100);
  });

  it("direct conversion: roll → meters", () => {
    expect(convertToBaseUnit(3, "roll" as UnitId, ctxRollMeter)).toBe(450);
  });

  it("direct conversion: pallet → bags", () => {
    expect(convertToBaseUnit(2, "pallet" as UnitId, ctxPalletBag)).toBe(80);
  });

  it("multi-hop: carton → box → pcs", () => {
    expect(convertToBaseUnit(1, "carton" as UnitId, ctxMultiHop)).toBe(120);
    expect(convertToBaseUnit(2, "carton" as UnitId, ctxMultiHop)).toBe(240);
  });

  it("rejects non-integer quantity", () => {
    expect(() => convertToBaseUnit(1.5, "box" as UnitId, ctxBoxPcs)).toThrowError(
      ConversionError,
    );
  });

  it("rejects non-finite quantity", () => {
    expect(() => convertToBaseUnit(Number.NaN, "box" as UnitId, ctxBoxPcs)).toThrowError(
      ConversionError,
    );
  });

  it("unknown unit", () => {
    expect(() => convertToBaseUnit(1, "crate" as UnitId, ctxBoxPcs)).toThrowError(
      ConversionError,
    );
    try {
      convertToBaseUnit(1, "crate" as UnitId, ctxBoxPcs);
    } catch (e) {
      expect(e).toMatchObject({ code: "UNKNOWN_UNIT" });
    }
  });

  it("ambiguous fan-out", () => {
    const bad: ConversionContext = {
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 100 },
        { fromUnit: "box" as UnitId, toUnit: "kg" as UnitId, factor: 20 },
      ],
    };
    expect(() => convertToBaseUnit(1, "box" as UnitId, bad)).toThrowError(ConversionError);
  });

  it("detects cycle via depth limit", () => {
    const cyclic: ConversionContext = {
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: "a" as UnitId, toUnit: "b" as UnitId, factor: 2 },
        { fromUnit: "b" as UnitId, toUnit: "a" as UnitId, factor: 2 },
      ],
    };
    expect(() => convertToBaseUnit(1, "a" as UnitId, cyclic)).toThrowError(ConversionError);
  });

  it("case-sensitive unit ids", () => {
    expect(() => convertToBaseUnit(1, "Box" as UnitId, ctxBoxPcs)).toThrowError(
      ConversionError,
    );
  });
});

describe("convertFromBaseUnit", () => {
  it("identity when target is base", () => {
    expect(convertFromBaseUnit(214, "pcs" as UnitId, ctxBoxPcs)).toBe(214);
  });

  it("inverse box → pcs", () => {
    expect(convertFromBaseUnit(200, "box" as UnitId, ctxBoxPcs)).toBe(2);
  });

  it("rejects when not divisible", () => {
    expect(() => convertFromBaseUnit(214, "box" as UnitId, ctxBoxPcs)).toThrowError(
      ConversionError,
    );
    try {
      convertFromBaseUnit(214, "box" as UnitId, ctxBoxPcs);
    } catch (e) {
      expect(e).toMatchObject({ code: "NOT_EXACTLY_DIVISIBLE" });
    }
  });

  it("unsupported inverse for multi-hop only packaging", () => {
    expect(() =>
      convertFromBaseUnit(120, "carton" as UnitId, ctxMultiHop),
    ).toThrowError(ConversionError);
    try {
      convertFromBaseUnit(120, "carton" as UnitId, ctxMultiHop);
    } catch (e) {
      expect(e).toMatchObject({ code: "UNSUPPORTED_INVERSE" });
    }
  });
});
