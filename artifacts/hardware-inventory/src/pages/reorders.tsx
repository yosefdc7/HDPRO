import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ChevronRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { reorderManagerCopy } from "@workspace/reorder-engine";
import {
  getConversions,
  getMovements,
  getProducts,
  type Movement,
  type Product,
  type UnitConversion,
} from "@/lib/store";
import { computeProductReorder } from "@/lib/product-reorder";

export default function ReordersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);

  useEffect(() => {
    setProducts(getProducts());
    setMovements(getMovements());
    setConversions(getConversions());
  }, []);

  const lines = useMemo(() => {
    return products
      .map((p) => {
        const r = computeProductReorder(p, movements, conversions);
        return { product: p, r };
      })
      .filter(({ r }) => r.shouldReorder && r.suggestedOrderBase > 0)
      .sort((a, b) => b.r.suggestedOrderBase - a.r.suggestedOrderBase);
  }, [products, movements, conversions]);

  const reviewFlags = useMemo(
    () =>
      lines.filter(
        ({ r }) =>
          r.flags.includes("slow_mover") ||
          r.flags.includes("seasonal_profile") ||
          r.flags.includes("zero_or_unknown_usage"),
      ),
    [lines],
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{reorderManagerCopy.screenTitle}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Based on stock position, incoming orders, usage ({lines[0]?.r.usageLookbackDays ?? 28}-day window), lead time, and pack sizes.
        </p>
      </div>

      {reviewFlags.length > 0 && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/80 shadow-sm">
          <CardHeader className="py-3 pb-0">
            <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {reorderManagerCopy.reviewQueueTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <p className="text-xs text-amber-900/90 leading-relaxed">{reorderManagerCopy.reviewQueueBody}</p>
            <ul className="mt-2 text-xs text-amber-950 space-y-1">
              {reviewFlags.slice(0, 6).map(({ product }) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            {reorderManagerCopy.columnSuggested}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lines.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm leading-relaxed">{reorderManagerCopy.emptyState}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lines.map(({ product, r }) => {
                const packLabel = r.purchaseUnitLabel;
                const showPacks = packLabel != null && r.suggestedPurchaseUnits > 0;
                return (
                  <div
                    key={product.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors"
                    data-testid={`reorder-line-${product.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-xl flex-shrink-0">{product.image_placeholder}</span>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-700 text-sm block truncate"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-slate-500">{product.sku}</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {reorderManagerCopy.columnProjected}:{" "}
                            <span className="font-medium text-slate-700">
                              {Math.round(r.projectedPositionBase)} {product.primary_unit}
                            </span>
                            {" · "}
                            ROP {product.reorder_level}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-blue-700 tabular-nums">
                          {Math.round(r.suggestedOrderBase)} {product.primary_unit}
                        </p>
                        {showPacks && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {r.suggestedPurchaseUnits} {packLabel}
                            {r.suggestedPurchaseUnits === 1 ? "" : "s"}
                          </p>
                        )}
                        {r.roundingSurplusBase > 0 && (
                          <Badge variant="outline" className="mt-1 text-[10px] border-violet-200 text-violet-800 bg-violet-50">
                            +{Math.round(r.roundingSurplusBase)} base from pack rounding
                          </Badge>
                        )}
                      </div>
                    </div>
                    {r.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.flags.includes("seasonal_profile") && (
                          <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-800">
                            Seasonal
                          </Badge>
                        )}
                        {r.flags.includes("slow_mover") && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                            Slow mover
                          </Badge>
                        )}
                        {r.flags.includes("zero_or_unknown_usage") && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-900">
                            Usage unclear
                          </Badge>
                        )}
                        {r.flags.includes("pack_rounding_overshoot") && (
                          <Badge variant="secondary" className="text-[10px]">
                            Rounded up
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        Browse products <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
