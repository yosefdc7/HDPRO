import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import {
  Package,
  AlertTriangle,
  ArrowDownUp,
  PhilippinePeso,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { categories, currentUser } from "@/lib/mock-data";
import {
  getProducts,
  getMovements,
  getConversions,
  type Product,
  type Movement,
  type UnitConversion,
} from "@/lib/store";
import { getProductInventoryInsight } from "@/lib/inventory-insights";
import { computeProductReorder } from "@/lib/product-reorder";
import { MOVEMENT_UI_META, getMovementDisplaySign } from "@/lib/movement-config";
import { formatPeso, cn } from "@/lib/utils";
import PullToRefresh from "@/components/layout/pull-to-refresh";

function relativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function isToday(timestamp: string): boolean {
  const d = new Date(timestamp);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const SKELETON_MS = 800;

function useCountUp(target: number, duration = 600, enabled = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);
  return enabled ? value : target;
}

function SkeletonCard() {
  return (
    <Card className="rounded-xl shadow-sm border-slate-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatValue({ value, loaded, format }: { value: number; loaded: boolean; format?: (n: number) => string }) {
  const displayed = useCountUp(value, 700, loaded);
  return <>{format ? format(displayed) : displayed}</>;
}

export default function DashboardPage() {
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);

  function loadData() {
    setProducts(getProducts());
    setMovements(getMovements());
    setConversions(getConversions());
  }

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => setLoaded(true), SKELETON_MS);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const criticalStock = products.filter(
      (p) => getProductInventoryInsight(p).health === "critical"
    );
    const lowStock = products.filter(
      (p) => getProductInventoryInsight(p).health === "low"
    );
    const overstock = products.filter(
      (p) => getProductInventoryInsight(p).health === "overstock"
    );
    const todayMovements = movements.filter((m) => isToday(m.timestamp));
    const inventoryValue = products.reduce(
      (sum, p) => sum + p.stock_quantity * p.cost_price,
      0
    );
    return { totalProducts, criticalStock, lowStock, overstock, todayMovements, inventoryValue };
  }, [products, movements]);

  const needsRestock = useMemo(() => {
    return [...products]
      .map((p) => ({ p, r: computeProductReorder(p, movements, conversions) }))
      .filter(({ r }) => r.shouldReorder && r.suggestedOrderBase > 0)
      .sort((a, b) => b.r.suggestedOrderBase - a.r.suggestedOrderBase)
      .slice(0, 5);
  }, [products, movements, conversions]);

  const recentActivity = useMemo(() => movements.slice(0, 10), [movements]);

  const categoryValues = useMemo(() => {
    const map: Record<string, { name: string; icon: string; color: string; value: number }> = {};
    for (const cat of categories) {
      map[cat.id] = { name: cat.name, icon: cat.icon, color: cat.color, value: 0 };
    }
    for (const p of products) {
      if (map[p.category_id]) {
        map[p.category_id].value += p.stock_quantity * p.cost_price;
      }
    }
    return Object.values(map)
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const totalInventoryValue = categoryValues.reduce((sum, c) => sum + c.value, 0) || 1;

  const alertCount = stats.criticalStock.length + stats.lowStock.length;

  const statCards = [
    {
      label: "Total Products",
      numericValue: stats.totalProducts,
      icon: <Package className="h-8 w-8" />,
      iconBg: "bg-blue-100 text-blue-700",
      valueColor: "text-slate-900",
      badge: null,
    },
    {
      label: "Low Stock Items",
      numericValue: alertCount,
      icon: <AlertTriangle className="h-8 w-8" />,
      iconBg: "bg-red-100 text-red-700",
      valueColor: alertCount > 0 ? "text-red-700" : "text-green-700",
      badge: alertCount > 0 ? `${stats.criticalStock.length} critical · ${stats.lowStock.length} low` : "All stocked",
    },
    {
      label: "Today's Movements",
      numericValue: stats.todayMovements.length,
      icon: <ArrowDownUp className="h-8 w-8" />,
      iconBg: "bg-emerald-100 text-emerald-700",
      valueColor: "text-slate-900",
      badge: null,
    },
    {
      label: "Inventory Value",
      numericValue: stats.inventoryValue,
      icon: <PhilippinePeso className="h-8 w-8" />,
      iconBg: "bg-violet-100 text-violet-700",
      valueColor: "text-slate-900",
      isLarge: true,
      badge: null,
    },
  ];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PullToRefresh onRefresh={loadData} />
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {greeting}, {currentUser.name.split(" ")[0]}!
        </h1>
        <p className="text-slate-500 mt-2 text-xl font-medium">
          Here's what's happening in your store today.
        </p>
      </div>

      {/* Quick Actions */}
      {loaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Add Product", href: "/products", emoji: "➕", color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" },
            { label: "Stock In", href: "/movements", emoji: "📥", color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200" },
            { label: "Stock Out", href: "/movements", emoji: "📤", color: "bg-red-50 hover:bg-red-100 text-red-700 border-red-200" },
            { label: "Scan Barcode", href: "/scan", emoji: "📷", color: "bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "flex items-center justify-center gap-4 p-6 rounded-2xl border-2 font-bold text-lg transition-all duration-200 active:scale-95 shadow-sm",
                action.color
              )}
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="text-3xl">{action.emoji}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {!loaded
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, i) => (
              <Card
                key={i}
                className="rounded-2xl shadow-md border-2 border-slate-100 transition-all duration-300 hover:shadow-lg"
                data-testid={`stat-card-${i}`}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-base font-bold text-slate-500 uppercase tracking-wider">
                        {card.label}
                      </p>
                      <p
                        className={cn(
                          "font-black tabular-nums tracking-tighter",
                          card.isLarge ? "text-2xl" : "text-4xl",
                          card.valueColor
                        )}
                      >
                        <StatValue
                          value={card.numericValue}
                          loaded={loaded}
                          format={card.isLarge ? formatPeso : undefined}
                        />
                      </p>
                      {card.badge && (
                        <p className={cn("text-sm mt-2 font-bold px-2 py-1 rounded-md inline-block", alertCount > 0 && i === 1 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
                          {card.badge}
                        </p>
                      )}
                    </div>
                    <div className={cn("p-4 rounded-2xl shadow-inner", card.iconBg)}>
                      {card.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-10">

          {/* Needs Restock */}
          <Card className="rounded-2xl shadow-md border-2 border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b-2 border-slate-100 p-8">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <AlertTriangle className="h-7 w-7 text-amber-500" />
                  Needs Restock
                </CardTitle>
                <Link
                  href="/reorders"
                  className="text-base font-bold text-blue-700 hover:text-blue-900 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                  data-testid="needs-restock-view-all"
                >
                  View all <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {needsRestock.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xl font-medium">
                  All items are well stocked! 🎉
                </div>
              ) : (
                <div className="divide-y-2 divide-slate-100">
                  {needsRestock.map(({ p: product, r: reorder }) => {
                    const insight = getProductInventoryInsight(product);
                    const isCritical = insight.health === "critical";
                    const pct = insight.reorderPoint === 0
                      ? 100
                      : Math.min(100, (reorder.projectedPositionBase / insight.reorderPoint) * 100);
                    const packLine =
                      reorder.purchaseUnitLabel != null && reorder.suggestedPurchaseUnits > 0
                        ? `${reorder.suggestedPurchaseUnits} ${reorder.purchaseUnitLabel}${reorder.suggestedPurchaseUnits === 1 ? "" : "s"}`
                        : null;
                    return (
                      <div
                        key={product.id}
                        className="p-6 hover:bg-slate-50 transition-colors"
                        data-testid={`restock-item-${product.id}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl bg-white p-3 rounded-2xl shadow-sm border-2 border-slate-50">{product.image_placeholder}</span>
                            <div>
                              <Link
                                href={`/products/${product.id}`}
                                className="font-bold text-slate-900 hover:text-blue-700 text-lg leading-tight block"
                              >
                                {product.name}
                              </Link>
                              <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">{product.sku}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isCritical ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 shadow-none text-sm px-3 py-1">
                                Critical
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none text-sm px-3 py-1">
                                Low Stock
                              </Badge>
                            )}
                            <p className="text-sm text-slate-600 font-bold mt-2">
                              {Math.round(reorder.projectedPositionBase)} / {insight.reorderPoint}{" "}
                              {product.primary_unit}
                            </p>
                            <p className="text-sm text-blue-700 font-black mt-1">
                              Order: {Math.round(reorder.suggestedOrderBase)} {product.primary_unit}
                              {packLine ? ` · ${packLine}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              isCritical ? "bg-red-500" : "bg-amber-400"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="rounded-2xl shadow-md border-2 border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b-2 border-slate-100 p-8">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-black text-slate-900">
                  Recent Activity
                </CardTitle>
                <Link
                  href="/movements"
                  className="text-base font-bold text-blue-700 hover:text-blue-900 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                  data-testid="recent-activity-view-all"
                >
                  View all <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y-2 divide-slate-100">
                {recentActivity.map((movement) => {
                  const movementMeta = MOVEMENT_UI_META[movement.type];
                  const isInbound = movementMeta.direction === "in";
                  const isNeutral = movementMeta.direction === "neutral";
                  return (
                    <div
                      key={movement.id}
                      className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                      data-testid={`activity-item-${movement.id}`}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border-2",
                          movementMeta.iconBgClass,
                          isInbound ? "border-green-100" : isNeutral ? "border-slate-100" : "border-red-100"
                        )}
                      >
                        {isInbound ? (
                          <ArrowUpCircle className="h-7 w-7" />
                        ) : isNeutral ? (
                          <RefreshCw className="h-6 w-6" />
                        ) : (
                          <ArrowDownCircle className="h-7 w-7" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-slate-900 truncate">
                          {movement.product_name}
                        </p>
                        <p className="text-sm text-slate-500 font-medium truncate mt-1">
                          {movement.note} · <span className="text-slate-700 font-bold">by {movement.by}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-lg font-black", movementMeta.textClass)}>
                          {getMovementDisplaySign(movement.type)}
                          {Math.abs(movement.quantity)} {movement.unit}
                        </p>
                        <p className="text-sm text-slate-400 font-bold mt-1">
                          {relativeTime(movement.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-10">
          {/* Stock by Category */}
          <Card className="rounded-2xl shadow-md border-2 border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b-2 border-slate-100 p-8">
              <CardTitle className="text-2xl font-black text-slate-900">
                Stock by Category
              </CardTitle>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mt-1">By inventory value</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {categoryValues.map((cat) => {
                const pct = Math.max(4, (cat.value / totalInventoryValue) * 100);
                return (
                  <div key={cat.name} data-testid={`cat-bar-${cat.name}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-bold text-slate-700 flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        {cat.name}
                      </span>
                      <span className="text-sm text-slate-900 font-black">
                        {formatPeso(cat.value)}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
