import type { Product, Supplier } from "@/lib/store";

export function resolveSupplierForProduct(product: Product, suppliers: Supplier[]): Supplier | null {
  if (product.supplier_id) {
    return suppliers.find((s) => s.id === product.supplier_id) ?? null;
  }
  const name = product.name.toLowerCase();
  for (const s of suppliers) {
    for (const hint of s.products) {
      const h = hint.toLowerCase();
      if (h && (name.includes(h) || h.includes(name))) {
        return s;
      }
    }
  }
  return null;
}
