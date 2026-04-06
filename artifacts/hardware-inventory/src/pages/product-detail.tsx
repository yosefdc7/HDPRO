import { useEffect, useMemo, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Package,
  ArrowUpDown,
  Tag,
  DollarSign,
  TrendingUp,
  Copy,
  Building2,
  Ruler,
  ClipboardList,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/mock-data";
import {
  getConversions,
  getMovements,
  getProducts,
  getSuppliers,
  type Movement,
  type Product,
  type UnitConversion,
} from "@/lib/store";
import { getProductInventoryInsight, type ProductInventoryInsight } from "@/lib/inventory-insights";
import { computeProductReorder } from "@/lib/product-reorder";
import { reorderManagerCopy } from "@workspace/reorder-engine";
import { MOVEMENT_UI_META, getMovementDisplaySign } from "@/lib/movement-config";
import { getMixedStockDisplay } from "@/lib/mixed-stock-display";
import { resolveSupplierForProduct } from "@/lib/supplier-resolve";
import { formatPeso, formatDate, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function healthHint(insight: ProductInventoryInsight, primaryUnit: string): string {
  const u = primaryUnit;
  if (insight.health === "critical") {
    return `At or below critical level (${insight.criticalLevel.toLocaleString()} ${u}).`;
  }
  if (insight.health === "low") {
    return `At or below reorder point (${insight.reorderPoint.toLocaleString()} ${u}).`;
  }
  if (insight.health === "overstock") {
    return `At or above overstock threshold (${insight.overstockLevel.toLocaleString()} ${u}).`;
  }
  return `Above reorder point (${insight.reorderPoint.toLocaleString()} ${u}).`;
}

function copyField(label: string, value: string) {
  void navigator.clipboard.writeText(value);
  toast({ title: "Copied", description: `${label} copied to clipboard.`, variant: "success" });
}

function SectionEmpty({
  title,
  body,
  action,
  href,
}: {
  title: string;
  body: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{body}</p>
      {action && href && (
        <Button asChild variant="outline" size="sm" className="mt-3 h-9 text-xs">
          <Link href={href}>{action}</Link>
        </Button>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const [, params] = useRoute("/products/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);
  const [stockMovements, setStockMovements] = useState<Movement[]>([]);

  useEffect(() => {
    setProducts(getProducts());
    setUnitConversions(getConversions());
    setStockMovements(getMovements());
  }, [productId]);

  useEffect(() => {
    setNotesExpanded(false);
  }, [productId]);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const category = useMemo(() => categories.find((c) => c.id === product?.category_id), [product]);
  const conversions = useMemo(
    () => unitConversions.filter((uc) => uc.product_id === productId),
    [unitConversions, productId],
  );
  const movements = useMemo(
    () =>
      [...stockMovements.filter((sm) => sm.product_id === productId)].sort(
        (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
      ).slice(0, 12),
    [stockMovements, productId],
  );

  const suppliers = useMemo(() => getSuppliers(), []);
  const supplier = useMemo(
    () => (product ? resolveSupplierForProduct(product, suppliers) : null),
    [product, suppliers],
  );

  const [notesExpanded, setNotesExpanded] = useState(false);

  const conversionRows = useMemo(() => {
    if (!product) {
      return [] as { id: string; displayUnit: string; baseMultiple: number; detail: string }[];
    }
    const primary = product.primary_unit;
    const baseRow = {
      id: `base-${primary}`,
      displayUnit: primary,
      baseMultiple: 1,
      detail: "Base unit",
    };
    const alt = conversions
      .filter((c) => c.to_unit === primary && c.factor > 0)
      .map((c) => ({
        id: c.id,
        displayUnit: c.from_unit,
        baseMultiple: c.factor,
        detail: `1 ${c.from_unit} = ${c.factor} ${primary}`,
      }));
    return [baseRow, ...alt];
  }, [conversions, product]);

  if (!productId || !product) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Product not found</h2>
        <Button onClick={() => setLocation("/products")} variant="outline">
          Back to products
        </Button>
      </div>
    );
  }

  const insight = getProductInventoryInsight(product);
  const reorder = computeProductReorder(product, stockMovements, unitConversions);
  const onHandMixed = getMixedStockDisplay(insight.onHandQuantity, product.primary_unit, conversions);
  const incomingMixed = getMixedStockDisplay(insight.incomingQuantity, product.primary_unit, conversions);

  const stockBadgeClass =
    insight.health === "critical"
      ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
      : insight.health === "low"
        ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
        : insight.health === "overstock"
          ? "bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200"
          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200";
  const stockValueClass =
    insight.health === "critical"
      ? "text-red-600"
      : insight.health === "low"
        ? "text-amber-600"
        : insight.health === "overstock"
          ? "text-violet-600"
          : "text-emerald-700";
  const stockFillClass =
    insight.health === "critical"
      ? "bg-red-500"
      : insight.health === "low"
        ? "bg-amber-500"
        : insight.health === "overstock"
          ? "bg-violet-500"
          : "bg-emerald-500";

  const markup =
    product.cost_price > 0
      ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
      : "0.0";

  const hasPackConversions = conversions.some((c) => c.to_unit === product.primary_unit);
  const notesText = (product.notes ?? "").trim();
  const notesLong = notesText.length > 220;

  const conversionRows = useMemo(() => {
    const primary = product.primary_unit;
    const baseRow = {
      id: `base-${primary}`,
      displayUnit: primary,
      baseMultiple: 1,
      detail: "Base unit",
    };
    const alt = conversions
      .filter((c) => c.to_unit === primary && c.factor > 0)
      .map((c) => ({
        id: c.id,
        displayUnit: c.from_unit,
        baseMultiple: c.factor,
        detail: `1 ${c.from_unit} = ${c.factor} ${primary}`,
      }));
    return [baseRow, ...alt];
  }, [conversions, product.primary_unit]);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 md:pb-12 max-w-6xl mx-auto">
      {/* Header — mobile-first */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/products">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 shrink-0 touch-manipulation"
              aria-label="Back to products"
            >
              <_arrow_left_fix />
            </Button>
          </Link>
          <div className="flex gap-3 min-w-0 flex-1">
            <div className="text-3xl sm:text-4xl bg-white w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
              {product.image_placeholder}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight line-clamp-2">
                {product.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600">
                <span
                  className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${category?.color}15`, color: category?.color }}
                >
                  {category?.icon} {category?.name}
                </span>
                <span className="text-slate-400 hidden sm:inline" aria-hidden>
                  ·
                </span>
                {supplier ? (
                  <span className="inline-flex items-center gap-1 text-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{supplier.name}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 italic">No linked supplier</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:shrink-0">
          <Link href={`/movements/new?product_id=${product.id}`} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm touch-manipulation min-h-11">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Record movement
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 lg:items-start">
        <div className="lg:col-span-2 space-y-4 order-1">
          {/* Stock summary — above the fold */}
          <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 sm:py-4 space-y-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-semibold">
                  <Package className="h-5 w-5 text-slate-500 shrink-0" />
                  Stock on hand
                </CardTitle>
                <Badge
                  className={cn(stockBadgeClass, "px-2.5 py-1 text-xs gap-1 font-medium shrink-0")}
                >
                  {insight.health === "healthy" ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {insight.healthLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5">
              <p className="text-xs text-slate-500 leading-relaxed">{healthHint(insight, product.primary_unit)}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">On hand (mixed)</p>
                  <p className={cn("mt-1 text-lg sm:text-xl font-bold tabular-nums leading-snug", stockValueClass)}>
                    {onHandMixed.line}
                  </p>
                  {!hasPackConversions && (
                    <p className="text-[11px] text-slate-400 mt-1">Single-unit item — same as base below.</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total (base)</p>
                  <p className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
                    {insight.onHandQuantity.toLocaleString()}{" "}
                    <span className="text-sm font-semibold text-slate-500">{product.primary_unit}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Incoming</p>
                  {insight.incomingQuantity > 0 ? (
                    <>
                      <p className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tabular-nums leading-snug">
                        +{incomingMixed.line}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                        +{insight.incomingQuantity.toLocaleString()} {product.primary_unit} base
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No incoming stock</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Critical ≤ {insight.criticalLevel.toLocaleString()}</span>
                  <span>Reorder ≤ {insight.reorderPoint.toLocaleString()}</span>
                  <span>Overstock ≥ {insight.overstockLevel.toLocaleString()}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", stockFillClass)}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          (insight.onHandQuantity / Math.max(1, insight.overstockLevel)) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identifiers */}
          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="py-3 sm:py-4 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                SKU & barcode
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">SKU</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono bg-slate-100 px-2 py-1.5 rounded border border-slate-200 break-all">
                      {product.sku}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 text-xs shrink-0 touch-manipulation"
                      onClick={() => copyField("SKU", product.sku)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Barcode</p>
                  {product.barcode ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono bg-slate-100 px-2 py-1.5 rounded border border-slate-200 break-all">
                        {product.barcode}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1 text-xs shrink-0 touch-manipulation"
                        onClick={() => copyField("Barcode", product.barcode!)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  ) : (
                    <SectionEmpty
                      title="No barcode on file"
                      body="Add a barcode to speed up receiving and cycle counts."
                      action="Back to products"
                      href="/products"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {!supplier && (
            <SectionEmpty
              title="No default supplier"
              body="Link a supplier in your catalog workflow for faster POs and cost history."
            />
          )}

          {/* Conversion table */}
          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="py-3 sm:py-4 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="h-4 w-4 text-slate-500" />
                Units & conversion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {conversionRows.length <= 1 ? (
                <div className="p-6">
                  <SectionEmpty
                    title="Single-unit item"
                    body="Conversions appear when this SKU is stocked in multiple pack sizes."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 font-medium">Unit</th>
                        <th className="px-4 py-3 font-medium text-right tabular-nums">× base</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {conversionRows.map((row) => (
                        <tr key={row.id} className={row.baseMultiple === 1 ? "bg-emerald-50/40" : undefined}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.displayUnit}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                            {row.baseMultiple.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600 hidden sm:table-cell text-xs">{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent movements */}
          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="py-3 sm:py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                Recent activity
              </CardTitle>
              {movements.length > 0 && (
                <Link
                  href={`/movements?product_id=${product.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
                >
                  View all
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="p-6">
                  <SectionEmpty
                    title="No stock history yet"
                    body="Movements appear after you receive, issue, or adjust this item."
                    action="Record movement"
                    href={`/movements/new?product_id=${product.id}`}
                  />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {movements.map((movement) => (
                    <li
                      key={movement.id}
                      className="px-4 py-3.5 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between gap-y-2 hover:bg-slate-50/80 min-h-[3.25rem]"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              MOVEMENT_UI_META[movement.type].badgeClass,
                              "border text-[10px] uppercase tracking-wide",
                            )}
                          >
                            {MOVEMENT_UI_META[movement.type].shortLabel}
                          </Badge>
                          <span className="text-xs text-slate-500">{formatDate(movement.timestamp)}</span>
                        </div>
                        <p className="text-sm text-slate-800 line-clamp-2">
                          {movement.note || movement.reason || "—"}
                        </p>
                        <p className="text-xs text-slate-500">By {movement.by}</p>
                      </div>
                      <div
                        className={cn(
                          "font-bold text-base tabular-nums text-right sm:text-left sm:min-w-[5rem]",
                          MOVEMENT_UI_META[movement.type].textClass,
                        )}
                      >
                        {getMovementDisplaySign(movement.type)}
                        {Math.abs(movement.quantity).toLocaleString()}
                        <span className="text-xs ml-1 font-semibold opacity-80">{movement.unit}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="py-3 sm:py-4 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-slate-500" />
                Internal notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {!notesText ? (
                <SectionEmpty
                  title="No notes"
                  body="Add shelf location, handling notes, or vendor quirks for the floor."
                />
              ) : notesLong ? (
                <>
                  <p
                    className={cn(
                      "text-sm text-slate-700 whitespace-pre-wrap",
                      !notesExpanded && "line-clamp-4",
                    )}
                  >
                    {notesText}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 px-2 text-xs text-blue-700 gap-1"
                    onClick={() => setNotesExpanded((v) => !v)}
                  >
                    {notesExpanded ? "Show less" : "Read more"}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", notesExpanded && "rotate-180")}
                    />
                  </Button>
                </>
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{notesText}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — pricing & reorder; stacks below on mobile */}
        <aside className="space-y-4 order-2 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center text-sm">
                <span className="text-slate-600">Cost</span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatPeso(product.cost_price)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100 flex justify-between items-center ring-1 ring-blue-50 text-sm">
                <span className="text-blue-800">Sell</span>
                <span className="text-lg font-bold text-blue-700 tabular-nums">{formatPeso(product.selling_price)}</span>
              </div>
              <div className="flex justify-between items-center px-1 text-xs">
                <span className="text-slate-500">Markup</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                  {markup}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Reorder guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-0.5">
                <span className="text-xs text-slate-500">Projected position</span>
                <span
                  className="font-bold text-slate-900 tabular-nums"
                  title={reorderManagerCopy.tooltipProjected}
                >
                  {Math.round(reorder.projectedPositionBase).toLocaleString()} {product.primary_unit}
                </span>
                <span className="text-[11px] text-slate-500">On hand + incoming</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center gap-2">
                <span className="text-slate-600">Avg. usage / day</span>
                <span className="font-bold text-slate-900 tabular-nums text-right">
                  {reorder.usage.basis === "daily"
                    ? `${reorder.dailyDemandBase.toFixed(2)} (${reorder.usageLookbackDays}d)`
                    : "—"}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600">Policy target (base)</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {Math.round(reorder.targetPositionBase).toLocaleString()} {product.primary_unit}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600">Quick target (UI)</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {insight.targetLevel.toLocaleString()} {product.primary_unit}
                </span>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-blue-800">Suggested order</span>
                  <span
                    className="font-bold text-blue-700 tabular-nums text-right"
                    title={reorderManagerCopy.tooltipSuggestedBase}
                  >
                    {reorder.shouldReorder
                      ? `${Math.round(reorder.suggestedOrderBase).toLocaleString()} ${product.primary_unit}`
                      : "—"}
                  </span>
                </div>
                {reorder.shouldReorder &&
                  reorder.purchaseUnitLabel != null &&
                  reorder.suggestedPurchaseUnits > 0 && (
                    <p className="text-xs text-blue-900/90" title={reorderManagerCopy.tooltipSuggestedPacks}>
                      {reorder.suggestedPurchaseUnits} {reorder.purchaseUnitLabel}
                      {reorder.suggestedPurchaseUnits === 1 ? "" : "s"} (full {reorder.purchaseUnitLabel}s)
                    </p>
                  )}
              </div>
              {(reorder.flags.length > 0 || reorder.notes.length > 0) && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-1.5">
                  {reorder.flags.includes("slow_mover") && <p>{reorderManagerCopy.flagSlowMover}</p>}
                  {reorder.flags.includes("seasonal_profile") && <p>{reorderManagerCopy.flagSeasonal}</p>}
                  {reorder.flags.includes("zero_or_unknown_usage") && (
                    <p>{reorderManagerCopy.flagZeroUsage}</p>
                  )}
                  {reorder.flags.includes("pack_rounding_overshoot") && (
                    <p>{reorderManagerCopy.flagHighOvershoot}</p>
                  )}
                  {reorder.notes.slice(0, 2).map((n, i) => (
                    <p key={i} className="text-amber-900/85">
                      {n}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Engine uses reorder point, usage, lead time, safety, and purchase packs when configured.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
