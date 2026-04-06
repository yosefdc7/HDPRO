import type { ConversionContext, UnitConversionRule, ValidationResult } from "./types";

function trimRuleFields(rule: UnitConversionRule): UnitConversionRule {
  return {
    fromUnit: rule.fromUnit.trim() as UnitConversionRule["fromUnit"],
    toUnit: rule.toUnit.trim() as UnitConversionRule["toUnit"],
    factor: rule.factor,
  };
}

/**
 * Validates structural integrity of conversion rules *in the context of* {@link ConversionContext.baseUnit}.
 * Trims `fromUnit` / `toUnit` for duplicate and graph checks only; does not mutate the passed context.
 */
export function validateConversionRules(ctx: ConversionContext): ValidationResult {
  const issues: string[] = [];
  const rules = ctx.rules.map(trimRuleFields);
  const base = ctx.baseUnit.trim();

  if (!base) {
    issues.push("baseUnit must be non-empty (after trim)");
    return { ok: false, issues };
  }

  const pairKeys = new Set<string>();

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i]!;
    const path = `rules[${i}]`;

    if (!r.fromUnit || !r.toUnit) {
      issues.push(`${path}: fromUnit and toUnit must be non-empty (after trim)`);
      continue;
    }

    if (r.fromUnit === r.toUnit) {
      issues.push(`${path}: fromUnit and toUnit must differ`);
    }

    if (!Number.isFinite(r.factor) || !Number.isInteger(r.factor) || r.factor < 1) {
      issues.push(`${path}: factor must be a finite integer ≥ 1`);
    }

    const key = `${r.fromUnit}\0${r.toUnit}`;
    if (pairKeys.has(key)) {
      issues.push(`${path}: duplicate rule (${r.fromUnit} → ${r.toUnit})`);
    }
    pairKeys.add(key);
  }

  const byFrom = new Map<string, string>();
  const ambiguousFrom = new Set<string>();
  for (const r of rules) {
    if (!r.fromUnit || !r.toUnit || !Number.isInteger(r.factor) || r.factor < 1) continue;
    const prev = byFrom.get(r.fromUnit);
    if (prev !== undefined && prev !== r.toUnit) {
      ambiguousFrom.add(r.fromUnit);
    } else {
      byFrom.set(r.fromUnit, r.toUnit);
    }
  }
  for (const u of ambiguousFrom) {
    issues.push(
      `Ambiguous fan-out: multiple different target units for "${u}"`,
    );
  }

  const nodes = new Set<string>();
  for (const r of rules) {
    if (r.fromUnit && r.toUnit) {
      nodes.add(r.fromUnit);
      nodes.add(r.toUnit);
    }
  }
  nodes.add(base);

  const adj = new Map<string, string[]>();
  for (const r of rules) {
    if (
      !r.fromUnit ||
      !r.toUnit ||
      !Number.isInteger(r.factor) ||
      r.factor < 1 ||
      r.fromUnit === r.toUnit
    ) {
      continue;
    }
    const list = adj.get(r.fromUnit);
    if (list) list.push(r.toUnit);
    else adj.set(r.fromUnit, [r.toUnit]);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();

  function dfsCycle(u: string): boolean {
    const c = color.get(u) ?? WHITE;
    if (c === GRAY) return true;
    if (c === BLACK) return false;
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      if (dfsCycle(v)) return true;
    }
    color.set(u, BLACK);
    return false;
  }

  for (const n of nodes) {
    if ((color.get(n) ?? WHITE) === WHITE) {
      if (dfsCycle(n)) {
        issues.push("Rule graph contains a cycle");
        break;
      }
    }
  }

  /** Every unit that appears must be able to reach `base` following from → to edges (or already be base). */
  function reachableToBase(start: string): boolean {
    if (start === base) return true;
    const seen = new Set<string>();
    let frontier = [start];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const u of frontier) {
        if (u === base) return true;
        if (seen.has(u)) continue;
        seen.add(u);
        for (const v of adj.get(u) ?? []) next.push(v);
      }
      frontier = next;
    }
    return false;
  }

  for (const n of nodes) {
    if (!reachableToBase(n)) {
      issues.push(`Unit "${n}" cannot reach base unit "${base}" via conversion rules`);
    }
  }

  if (issues.length === 0) return { ok: true };
  return { ok: false, issues };
}
