import type { ConversionContext, UnitId } from "@workspace/inventory-units";
import type { Product, UnitConversion } from "@/lib/store";

export function productConversionContext(
  product: Product,
  conversions: UnitConversion[],
): ConversionContext {
  return {
    baseUnit: product.primary_unit as UnitId,
    rules: conversions
      .filter((c) => c.product_id === product.id)
      .map((c) => ({
        fromUnit: c.from_unit as UnitId,
        toUnit: c.to_unit as UnitId,
        factor: c.factor,
      })),
  };
}
