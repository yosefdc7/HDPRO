import {
  products as mockProducts,
  stockMovements as mockMovements,
  unitConversions as mockConversions,
  suppliers as mockSuppliers,
} from "./mock-data";

const INIT_KEY = "hw_store_v1";
export const MOVEMENT_TYPES = [
  "in",
  "out",
  "adjustment",
  "delivery",
  "damage",
  "return",
  "transfer",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

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
};

export type Movement = {
  id: string;
  type: MovementType;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  note: string;
  by: string;
  timestamp: string;
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

const STOCK_INCREASING_TYPES = new Set<MovementType>(["in", "delivery", "return"]);
const STOCK_DECREASING_TYPES = new Set<MovementType>(["out", "damage", "transfer"]);

function normalizeProduct(product: Product): Product {
  const incoming = Number(product.incoming_quantity ?? 0);
  return {
    ...product,
    incoming_quantity: Number.isFinite(incoming) ? Math.max(0, incoming) : 0,
  };
}

function normalizeMovement(movement: Movement): Movement {
  const normalizedType = MOVEMENT_TYPES.includes(movement.type)
    ? movement.type
    : "adjustment";
  const rawQuantity = Number(movement.quantity);
  const safeQuantity = Number.isFinite(rawQuantity) ? rawQuantity : 0;
  return {
    ...movement,
    type: normalizedType,
    quantity:
      normalizedType === "adjustment" ? safeQuantity : Math.abs(safeQuantity),
  };
}

function applyMovementToStock(currentStock: number, movement: Movement): number {
  if (STOCK_INCREASING_TYPES.has(movement.type)) {
    return currentStock + movement.quantity;
  }
  if (STOCK_DECREASING_TYPES.has(movement.type)) {
    return Math.max(0, currentStock - movement.quantity);
  }
  return Math.max(0, currentStock + movement.quantity);
}

function initStore() {
  if (localStorage.getItem(INIT_KEY)) return;
  try {
    localStorage.setItem("hw_products", JSON.stringify(mockProducts));
    localStorage.setItem("hw_movements", JSON.stringify(mockMovements));
    localStorage.setItem("hw_unit_conversions", JSON.stringify(mockConversions));
    localStorage.setItem("hw_suppliers", JSON.stringify(mockSuppliers));
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
  return safeRead("hw_movements", mockMovements as Movement[]).map(
    normalizeMovement,
  );
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

export function addMovementAndUpdateStock(movement: Movement): { newStock: number } {
  const normalizedMovement = normalizeMovement(movement);
  const movements = getMovements();
  movements.unshift(normalizedMovement);
  saveMovements(movements);

  const products = getProducts();
  const idx = products.findIndex((p) => p.id === normalizedMovement.product_id);
  let newStock = 0;
  if (idx >= 0) {
    products[idx].stock_quantity = applyMovementToStock(
      products[idx].stock_quantity,
      normalizedMovement,
    );

    if (normalizedMovement.type === "delivery") {
      const currentIncoming = products[idx].incoming_quantity ?? 0;
      products[idx].incoming_quantity = Math.max(
        0,
        currentIncoming - normalizedMovement.quantity,
      );
    }
    newStock = products[idx].stock_quantity;
    saveProducts(products);
  }
  return { newStock };
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

export function getProductByBarcode(barcode: string): Product | null {
  return getProducts().find((p) => p.barcode === barcode) ?? null;
}
