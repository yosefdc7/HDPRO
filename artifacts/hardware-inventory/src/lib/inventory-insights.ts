import type { Product } from "@/lib/store";

const DEFAULT_CRITICAL_RATIO = 0.5;
const DEFAULT_TARGET_MULTIPLIER = 2;
const DEFAULT_OVERSTOCK_MULTIPLIER = 1.5;

export type StockHealth = "critical" | "low" | "healthy" | "overstock";

export type ProductInventoryInsight = {
  onHandQuantity: number;
  incomingQuantity: number;
  availableSoonQuantity: number;
  criticalLevel: number;
  reorderPoint: number;
  targetLevel: number;
  overstockLevel: number;
  reorderQuantity: number;
  health: StockHealth;
  healthLabel: string;
  needsReorder: boolean;
};

function clampToNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function resolveCriticalLevel(product: Product): number {
  if (product.critical_stock_level !== undefined) {
    return clampToNonNegativeInteger(product.critical_stock_level);
  }
  return clampToNonNegativeInteger(
    Math.ceil(product.reorder_level * DEFAULT_CRITICAL_RATIO),
  );
}

function resolveTargetLevel(product: Product): number {
  if (product.target_stock_level !== undefined) {
    return clampToNonNegativeInteger(product.target_stock_level);
  }
  return clampToNonNegativeInteger(product.reorder_level * DEFAULT_TARGET_MULTIPLIER);
}

function resolveOverstockLevel(product: Product, targetLevel: number): number {
  if (product.overstock_level !== undefined) {
    return clampToNonNegativeInteger(product.overstock_level);
  }
  return clampToNonNegativeInteger(targetLevel * DEFAULT_OVERSTOCK_MULTIPLIER);
}

function getStockHealth(onHandQuantity: number, criticalLevel: number, reorderPoint: number, overstockLevel: number): StockHealth {
  if (onHandQuantity <= criticalLevel) return "critical";
  if (onHandQuantity <= reorderPoint) return "low";
  if (onHandQuantity >= overstockLevel && overstockLevel > reorderPoint) return "overstock";
  return "healthy";
}

export function getStockHealthLabel(health: StockHealth): string {
  if (health === "critical") return "Critical";
  if (health === "low") return "Low stock";
  if (health === "overstock") return "Overstock";
  return "In stock";
}

export function getProductInventoryInsight(product: Product): ProductInventoryInsight {
  const onHandQuantity = clampToNonNegativeInteger(product.stock_quantity);
  const incomingQuantity = clampToNonNegativeInteger(product.incoming_quantity ?? 0);
  const availableSoonQuantity = onHandQuantity + incomingQuantity;
  const criticalLevel = resolveCriticalLevel(product);
  const reorderPoint = clampToNonNegativeInteger(product.reorder_level);
  const targetLevel = Math.max(resolveTargetLevel(product), reorderPoint);
  const overstockLevel = Math.max(resolveOverstockLevel(product, targetLevel), targetLevel);
  const reorderQuantity = Math.max(0, targetLevel - availableSoonQuantity);
  const health = getStockHealth(onHandQuantity, criticalLevel, reorderPoint, overstockLevel);

  return {
    onHandQuantity,
    incomingQuantity,
    availableSoonQuantity,
    criticalLevel,
    reorderPoint,
    targetLevel,
    overstockLevel,
    reorderQuantity,
    health,
    healthLabel: getStockHealthLabel(health),
    needsReorder: reorderQuantity > 0,
  };
}
