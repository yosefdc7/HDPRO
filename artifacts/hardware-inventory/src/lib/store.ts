import {
  products as mockProducts,
  stockMovements as mockMovements,
  unitConversions as mockConversions,
  suppliers as mockSuppliers,
} from "./mock-data";

const INIT_KEY = "hw_store_v1";

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
};

export type Movement = {
  id: string;
  type: "in" | "out" | "adjustment";
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
  return safeRead("hw_products", mockProducts as Product[]);
}

export function saveProducts(products: Product[]) {
  localStorage.setItem("hw_products", JSON.stringify(products));
}

export function getMovements(): Movement[] {
  return safeRead("hw_movements", mockMovements as Movement[]);
}

export function saveMovements(movements: Movement[]) {
  localStorage.setItem("hw_movements", JSON.stringify(movements));
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
  const movements = getMovements();
  movements.unshift(movement);
  saveMovements(movements);

  const products = getProducts();
  const idx = products.findIndex((p) => p.id === movement.product_id);
  let newStock = 0;
  if (idx >= 0) {
    if (movement.type === "in") {
      products[idx].stock_quantity += movement.quantity;
    } else if (movement.type === "out") {
      products[idx].stock_quantity = Math.max(0, products[idx].stock_quantity - movement.quantity);
    } else {
      products[idx].stock_quantity = Math.max(0, products[idx].stock_quantity + movement.quantity);
    }
    newStock = products[idx].stock_quantity;
    saveProducts(products);
  }
  return { newStock };
}

export function addProduct(product: Product, conversions: UnitConversion[] = []) {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
  if (conversions.length > 0) {
    const existing = getConversions();
    saveConversions([...existing, ...conversions]);
  }
}

export function getProductByBarcode(barcode: string): Product | null {
  return getProducts().find((p) => p.barcode === barcode) ?? null;
}
