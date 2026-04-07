import type { ConversionContext, UnitConversionRule } from "@workspace/inventory-units";
import {
  applyMovement,
  quantityBaseForCreate,
  replayMovements,
  sortMovementsForReplay,
  StockEngineError,
  STOCK_MOVEMENT_TYPES,
  type StockMovementType,
} from "@workspace/stock-engine";
import {
  products as mockProducts,
  stockMovements as mockMovements,
  unitConversions as mockConversions,
  suppliers as mockSuppliers,
} from "./mock-data";

const INIT_KEY = "hw_store_v2";

export const MOVEMENT_TYPES = STOCK_MOVEMENT_TYPES;
export type MovementType = StockMovementType;

const LEGACY_TYPE_MAP: Record<string, StockMovementType> = {
  in: "PURCHASE_RECEIVED",
  out: "SALE",
  adjustment: "ADJUSTMENT",
  delivery: "DELIVERY_RECEIVED",
  damage: "DAMAGE",
  return: "RETURN_IN",
  transfer: "TRANSFER_OUT",
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode?: string;
  primary_unit: string;
  stock_quantity: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  image_placeholder: string;
  incoming_quantity?: number;
  critical_stock_level?: number;
  target_stock_level?: number;
  overstock_level?: number;
  /** Safety stock in base units (optional; defaults from reorder level when missing). */
  safety_stock_level?: number;
  /** Supplier lead time in days for reorder cover calculations. */
  supplier_lead_time_days?: number;
  /** Base units per supplier purchase unit when not inferable from unit conversions. */
  purchase_pack_base_qty?: number;
  /** Display name for purchase unit (e.g. box, roll). */
  purchase_unit_label?: string;
  /** Fixed policy lot in base units: target position uses ROP + this when set. */
  fixed_reorder_qty_base?: number;
  /** Minimum supplier packs per PO line. */
  minimum_purchase_units?: number;
  /** Internal review / batching interval in days (optional). */
  review_period_days?: number;
  demand_risk_profile?: "steady" | "slow_mover" | "seasonal";
  supplier_id?: string;
  notes?: string;
};

export type Movement = {
  id: string;
  type: MovementType;
  product_id: string;
  product_name: string;
  /** Quantity as entered / displayed in `unit` */
  quantity: number;
  unit: string;
  quantity_base?: number;
  signed_delta_base?: number;
  quantity_before_base?: number;
  quantity_after_base?: number;
  reason: string;
  note: string;
  by: string;
  timestamp: string;
  sync_status?: "synced" | "pending" | "conflict";
};

export type UnitConversion = {
  id: string;
  product_id: string;
  from_unit: string;
  to_unit: string;
  factor: number;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  products: string[];
};

function rulesForProduct(
  productId: string,
  conversions: UnitConversion[],
): readonly UnitConversionRule[] {
  return conversions
    .filter((c) => c.product_id === productId)
    .map((c) => ({
      fromUnit: c.from_unit,
      toUnit: c.to_unit,
      factor: c.factor,
    }));
}

export function conversionContextForProduct(
  product: Product,
  conversions: UnitConversion[],
): ConversionContext {
  return {
    baseUnit: product.primary_unit,
    rules: rulesForProduct(product.id, conversions),
  };
}

function normalizeProduct(product: Product): Product {
  const incoming = Number(product.incoming_quantity ?? 0);
  return {
    ...product,
    incoming_quantity: Number.isFinite(incoming) ? Math.max(0, incoming) : 0,
  };
}

function normalizeMovementType(raw: string): StockMovementType {
  if ((MOVEMENT_TYPES as readonly string[]).includes(raw)) {
    return raw as StockMovementType;
  }
  return LEGACY_TYPE_MAP[raw] ?? "ADJUSTMENT";
}

function normalizeMovement(movement: Movement): Movement {
  const normalizedType = normalizeMovementType(movement.type as string);
  const rawQuantity = Number(movement.quantity);
  const safeQuantity = Number.isFinite(rawQuantity) ? rawQuantity : 0;
  const qty =
    normalizedType === "ADJUSTMENT" ? safeQuantity : Math.abs(safeQuantity);
  return {
    ...movement,
    type: normalizedType,
    quantity: qty,
    reason: movement.reason?.trim() || movement.note?.trim() || "—",
    note: movement.note ?? "",
  };
}

function compareMovementOrder(a: Movement, b: Movement): number {
  const ta = Date.parse(a.timestamp);
  const tb = Date.parse(b.timestamp);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function needsLedgerBackfill(movements: Movement[]): boolean {
  return movements.some((m) => m.quantity_before_base === undefined);
}

function fallbackSignedDeltaBase(type: MovementType, quantityBase: number): number {
  switch (type) {
    case "SALE":
    case "DAMAGE":
    case "RETURN_OUT":
    case "TRANSFER_OUT":
      return -Math.abs(quantityBase);
    case "ADJUSTMENT":
      return quantityBase;
    default:
      return Math.abs(quantityBase);
  }
}

function backfillMovementLedger(
  movements: Movement[],
  products: Product[],
  conversions: UnitConversion[],
): Movement[] {
  const byProduct = new Map<string, Movement[]>();
  for (const m of movements) {
    const list = byProduct.get(m.product_id) ?? [];
    list.push(m);
    byProduct.set(m.product_id, list);
  }

  const out = new Map<string, Movement>();
  for (const m of movements) {
    out.set(m.id, { ...normalizeMovement(m) });
  }

  for (const [, list] of byProduct) {
    const ordered = [...list].sort(compareMovementOrder);
    const product = products.find((p) => p.id === ordered[0]?.product_id);
    if (!product) continue;
    const ctx = conversionContextForProduct(product, conversions);
    const qbByMovementId = new Map<string, number>();
    let runningDelta = 0;
    let minRunningDelta = 0;
    for (const m of ordered) {
      const cur = out.get(m.id)!;
      let qb = cur.quantity_base;
      if (qb === undefined) {
        try {
          qb = quantityBaseForCreate(cur.type, cur.quantity, cur.unit, ctx);
        } catch {
          qb = cur.quantity;
        }
      }
      qbByMovementId.set(cur.id, qb);
      runningDelta += fallbackSignedDeltaBase(cur.type, qb);
      minRunningDelta = Math.min(minRunningDelta, runningDelta);
    }

    // Legacy datasets can start with outbound transactions.
    // Start from the minimum required opening stock to avoid negative replay.
    let stock = Math.abs(minRunningDelta);
    for (const m of ordered) {
      const cur = out.get(m.id)!;
      const qb = qbByMovementId.get(cur.id) ?? cur.quantity;
      try {
        const r = applyMovement({
          currentStockBase: stock,
          type: cur.type,
          quantityBase: qb,
        });
        cur.quantity_base = qb;
        cur.signed_delta_base = r.signedDeltaBase;
        cur.quantity_before_base = r.quantityBeforeBase;
        cur.quantity_after_base = r.quantityAfterBase;
        stock = r.nextStockBase;
      } catch {
        // Fallback protects app boot when historical data is inconsistent.
        const before = stock;
        const signedDelta = fallbackSignedDeltaBase(cur.type, qb);
        const after = Math.max(0, before + signedDelta);
        cur.quantity_base = qb;
        cur.signed_delta_base = after - before;
        cur.quantity_before_base = before;
        cur.quantity_after_base = after;
        stock = after;
      }
    }
  }

  return movements.map((m) => out.get(m.id)!);
}

function syncProductStockFromReplay(movements: Movement[], products: Product[]) {
  const byProduct = new Map<string, Movement[]>();
  for (const m of movements) {
    const list = byProduct.get(m.product_id) ?? [];
    list.push(m);
    byProduct.set(m.product_id, list);
  }
  for (const p of products) {
    const list = byProduct.get(p.id);
    if (!list?.length) continue;
    const slices = list.map((m) => ({
      id: m.id,
      capturedAt: m.timestamp,
      type: m.type,
      quantityBase: m.quantity_base ?? 0,
    }));
    let runningDelta = 0;
    let minRunningDelta = 0;
    for (const s of slices) {
      runningDelta += fallbackSignedDeltaBase(s.type, s.quantityBase);
      minRunningDelta = Math.min(minRunningDelta, runningDelta);
    }
    const initialStockBase = Math.abs(minRunningDelta);
    try {
      const final = replayMovements(slices, { initialStockBase });
      p.stock_quantity = final;
    } catch {
      // Keep app usable when legacy history contains inconsistent sequences.
      p.stock_quantity = Math.max(0, initialStockBase + runningDelta);
    }
  }
}

const LEGACY_INIT_KEY = "hw_store_v1";

function initStore() {
  if (localStorage.getItem(INIT_KEY)) return;
  try {
    if (!localStorage.getItem(LEGACY_INIT_KEY)) {
      localStorage.setItem("hw_products", JSON.stringify(mockProducts));
      localStorage.setItem("hw_movements", JSON.stringify(mockMovements));
      localStorage.setItem("hw_unit_conversions", JSON.stringify(mockConversions));
      localStorage.setItem("hw_suppliers", JSON.stringify(mockSuppliers));
      localStorage.setItem(LEGACY_INIT_KEY, "true");
    }
    localStorage.setItem(INIT_KEY, "true");
  } catch (e) {
    console.error("Store init failed:", e);
  }
}

function safeRead<T>(key: string, fallback: T[]): T[] {
  initStore();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

export function getProducts(): Product[] {
  return safeRead("hw_products", mockProducts as Product[]).map(normalizeProduct);
}

export function saveProducts(products: Product[]) {
  localStorage.setItem("hw_products", JSON.stringify(products.map(normalizeProduct)));
}

export function getMovements(): Movement[] {
  let list = safeRead("hw_movements", mockMovements as Movement[]).map(
    normalizeMovement,
  );
  if (needsLedgerBackfill(list)) {
    const products = getProducts();
    const conversions = getConversions();
    list = backfillMovementLedger(list, products, conversions);
    saveMovements(list);
    const updated = [...products];
    syncProductStockFromReplay(list, updated);
    saveProducts(updated);
  }
  return list;
}

export function saveMovements(movements: Movement[]) {
  localStorage.setItem(
    "hw_movements",
    JSON.stringify(movements.map(normalizeMovement)),
  );
}

export function getConversions(): UnitConversion[] {
  return safeRead("hw_unit_conversions", mockConversions as UnitConversion[]);
}

export function saveConversions(conversions: UnitConversion[]) {
  localStorage.setItem("hw_unit_conversions", JSON.stringify(conversions));
}

export function getSuppliers(): Supplier[] {
  return safeRead("hw_suppliers", mockSuppliers as Supplier[]);
}

export function saveSuppliers(suppliers: Supplier[]) {
  localStorage.setItem("hw_suppliers", JSON.stringify(suppliers));
}

export function updateProductStock(productId: string, newQty: number) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === productId);
  if (idx >= 0) {
    products[idx].stock_quantity = Math.max(0, newQty);
    saveProducts(products);
    return products[idx];
  }
  return null;
}

export function rebuildStockFromMovements(): void {
  const movements = getMovements();
  const products = getProducts();
  syncProductStockFromReplay(movements, products);
  saveProducts(products);
}

export function addProduct(product: Product, conversions: UnitConversion[] = []) {
  const products = getProducts();
  products.push(normalizeProduct(product));
  saveProducts(products);
  if (conversions.length > 0) {
    const existing = getConversions();
    saveConversions([...existing, ...conversions]);
  }
}

/**
 * Applies movement using the stock engine (base units), persists ledger snapshots, updates product stock.
 */
export function addMovementAndUpdateStock(movement: Movement): { newStock: number } {
  getMovements();
  const normalizedMovement = normalizeMovement(movement);
  const products = getProducts();
  const idx = products.findIndex(
    (p) => p.id === normalizedMovement.product_id,
  );
  if (idx < 0) {
    return { newStock: 0 };
  }

  const product = products[idx];
  const ctx = conversionContextForProduct(product, getConversions());
  let quantityBase: number;
  try {
    quantityBase = quantityBaseForCreate(
      normalizedMovement.type,
      normalizedMovement.quantity,
      normalizedMovement.unit,
      ctx,
    );
  } catch (e) {
    if (normalizedMovement.quantity_base !== undefined) {
      quantityBase = normalizedMovement.quantity_base;
    } else if (normalizedMovement.unit === product.primary_unit) {
      quantityBase = normalizedMovement.quantity;
    } else {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  const applied = applyMovement({
    currentStockBase: product.stock_quantity,
    type: normalizedMovement.type,
    quantityBase,
  });

  const enriched: Movement = {
    ...normalizedMovement,
    quantity_base: quantityBase,
    signed_delta_base: applied.signedDeltaBase,
    quantity_before_base: applied.quantityBeforeBase,
    quantity_after_base: applied.quantityAfterBase,
  };

  const movements = getMovements();
  movements.unshift(enriched);
  saveMovements(movements);

  products[idx].stock_quantity = applied.nextStockBase;

  if (
    normalizedMovement.type === "DELIVERY_RECEIVED" &&
    products[idx].incoming_quantity != null
  ) {
    const currentIncoming = products[idx].incoming_quantity ?? 0;
    products[idx].incoming_quantity = Math.max(
      0,
      currentIncoming - normalizedMovement.quantity,
    );
  }

  const newStock = products[idx].stock_quantity;
  saveProducts(products);
  return { newStock };
}

export function assertMovementApply(
  movement: Pick<Movement, "type" | "quantity" | "unit" | "product_id"> & {
    quantity_base?: number;
  },
  product: Product,
): void {
  const ctx = conversionContextForProduct(product, getConversions());
  const qb =
    movement.quantity_base ??
    quantityBaseForCreate(
      normalizeMovementType(movement.type as string),
      movement.quantity,
      movement.unit,
      ctx,
    );
  applyMovement({
    currentStockBase: product.stock_quantity,
    type: normalizeMovementType(movement.type as string),
    quantityBase: qb,
  });
}

export { sortMovementsForReplay, replayMovements, StockEngineError };
