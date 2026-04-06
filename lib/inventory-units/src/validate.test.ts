import { describe, expect, it } from "vitest";
import { validateConversionRules } from "./validate";
import type { ConversionContext, UnitId } from "./types";

function c(ctx: ConversionContext) {
  return validateConversionRules(ctx);
}

describe("validateConversionRules", () => {
  it("accepts valid single rule", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [{ fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 100 }],
    });
    expect(r).toEqual({ ok: true });
  });

  it("accepts multi-hop chain to base", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: "carton" as UnitId, toUnit: "box" as UnitId, factor: 10 },
        { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 12 },
      ],
    });
    expect(r).toEqual({ ok: true });
  });

  it("rejects empty baseUnit after trim", () => {
    const r = c({
      baseUnit: "   " as UnitId,
      rules: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.includes("baseUnit"))).toBe(true);
  });

  it("rejects self-loop", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [{ fromUnit: "pcs" as UnitId, toUnit: "pcs" as UnitId, factor: 1 }],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects factor < 1", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [{ fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 0 }],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects duplicate (from, to)", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 100 },
        { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 50 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.includes("duplicate"))).toBe(true);
  });

  it("rejects ambiguous fan-out", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 100 },
        { fromUnit: "box" as UnitId, toUnit: "kg" as UnitId, factor: 20 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.includes("Ambiguous fan-out"))).toBe(true);
    }
  });

  it("rejects cycle", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: "a" as UnitId, toUnit: "b" as UnitId, factor: 2 },
        { fromUnit: "b" as UnitId, toUnit: "a" as UnitId, factor: 2 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.includes("cycle"))).toBe(true);
  });

  it("rejects orphan unit not reaching base", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [{ fromUnit: "crate" as UnitId, toUnit: "dozen" as UnitId, factor: 3 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.includes("cannot reach base"))).toBe(true);
    }
  });

  it("trims units for duplicate detection", () => {
    const r = c({
      baseUnit: "pcs" as UnitId,
      rules: [
        { fromUnit: " box " as UnitId, toUnit: "pcs" as UnitId, factor: 100 },
        { fromUnit: "box" as UnitId, toUnit: "pcs" as UnitId, factor: 50 },
      ],
    });
    expect(r.ok).toBe(false);
  });
});
