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
import { getProducts, getMovements, type Product, type Movement } from "@/lib/store";
import { getProductInventoryInsight } from "@/lib/inventory-insights";
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

  function loadData() {
    setProducts(getProducts());
    setMovements(getMovements());
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
      .filter((p) => getProductInventoryInsight(p).reorderQuantity > 0)
      .sort(
        (a, b) =>
          getProductInventoryInsight(b).reorderQuantity -
          getProductInventoryInsight(a).reorderQuantity
      )
      .slice(0, 5);
  }, [products]);

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
      icon: <Package className="h-6 w-6" />,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
      badge: null,
    },
    {
      label: "Low Stock Items",
      numericValue: alertCount,
      icon: <AlertTriangle className="h-6 w-6" />,
      iconBg: "bg-red-50 text-red-600",
      valueColor: alertCount > 0 ? "text-red-600" : "text-green-600",
      badge: alertCount > 0 ? `${stats.criticalStock.length} critical · ${stats.lowStock.length} low` : "All stocked",
    },
    {
      label: "Today's Movements",
      numericValue: stats.todayMovements.length,
      icon: <ArrowDownUp className="h-6 w-6" />,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-slate-900",
      badge: null,
    },
    {
      label: "Inventory Value",
      numericValue: stats.inventoryValue,
      icon: <PhilippinePeso className="h-6 w-6" />,
      iconBg: "bg-violet-50 text-violet-600",
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PullToRefresh onRefresh={loadData} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {currentUser.name.split(" ")[0]}!
        </h1>
        <p className="text-slate-500 mt-1">
          Here's what's happening in your store today.
        </p>
      </div>

      {/* Quick Actions */}
      {loaded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Product", href: "/products", emoji: "➕", color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100" },
            { label: "Stock In", href: "/movements", emoji: "📥", color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-100" },
            { label: "Stock Out", href: "/movements", emoji: "📤", color: "bg-red-50 hover:bg-red-100 text-red-700 border-red-100" },
            { label: "Scan Barcode", href: "/scan", emoji: "📷", color: "bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-100" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border font-medium text-sm transition-all duration-200 active:scale-95",
                action.color
              )}
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="text-xl">{action.emoji}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {!loaded
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, i) => (
              <Card
                key={i}
                className="rounded-xl shadow-sm border-slate-100 transition-all duration-300"
                data-testid={`stat-card-${i}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">
                        {card.label}
                      </p>
                      <p
                        className={cn(
                          "font-bold tabular-nums",
                          card.isLarge ? "text-xl" : "text-3xl",
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
                        <p className={cn("text-xs mt-1 font-medium", alertCount > 0 && i === 1 ? "text-red-500" : "text-green-600")}>
                          {card.badge}
                        </p>
                      )}
                    </div>
                    <div className={cn("p-3 rounded-xl", card.iconBg)}>
                      {card.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Needs Restock */}
          <Card className="rounded-xl shadow-sm border-slate-100">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Needs Restock
                </CardTitle>
                <Link
                  href="/products"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  data-testid="needs-restock-view-all"
                >
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {needsRestock.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  All items are well stocked! 🎉
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {needsRestock.map((product) => {
                    const insight = getProductInventoryInsight(product);
                    const isCritical = insight.health === "critical";
                    const pct = insight.reorderPoint === 0
                      ? 100
                      : Math.min(100, (insight.availableSoonQuantity / insight.reorderPoint) * 100);
                    return (
                      <div
                        key={product.id}
                        className="p-4 hover:bg-slate-50 transition-colors"
                        data-testid={`restock-item-${product.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{product.image_placeholder}</span>
                            <div>
                              <Link
                                href={`/products/${product.id}`}
                                className="font-medium text-slate-900 hover:text-blue-700 text-sm"
                              >
                                {product.name}
                              </Link>
                              <p className="text-xs text-slate-500">{product.sku}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isCritical ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 shadow-none text-xs">
                                Critical
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none text-xs">
                                Low Stock
                              </Badge>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              {insight.availableSoonQuantity} / {insight.reorderPoint}{" "}
                              {product.primary_unit}
                            </p>
                            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                              Reorder: {insight.reorderQuantity} {product.primary_unit}
                            </p>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
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
          <Card className="rounded-xl shadow-sm border-slate-100">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Recent Activity
                </CardTitle>
                <Link
                  href="/movements"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  data-testid="recent-activity-view-all"
                >
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentActivity.map((movement) => {
                  const movementMeta = MOVEMENT_UI_META[movement.type];
                  const isInbound = movementMeta.direction === "in";
                  const isNeutral = movementMeta.direction === "neutral";
                  return (
                    <div
                      key={movement.id}
                      className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                      data-testid={`activity-item-${movement.id}`}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                          movementMeta.iconBgClass
                        )}
                      >
                        {isInbound ? (
                          <ArrowUpCircle className="h-5 w-5" />
                        ) : isNeutral ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {movement.product_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {movement.note} · by {movement.by}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-sm font-bold", movementMeta.textClass)}>
                          {getMovementDisplaySign(movement.type)}
                          {Math.abs(movement.quantity)} {movement.unit}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
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
        <div className="space-y-8">
          {/* Stock by Category */}
          <Card className="rounded-xl shadow-sm border-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-slate-900">
                Stock by Category
              </CardTitle>
              <p className="text-xs text-slate-500">By inventory value</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryValues.map((cat) => {
                const pct = Math.max(4, (cat.value / totalInventoryValue) * 100);
                return (
                  <div key={cat.name} data-testid={`cat-bar-${cat.name}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {formatPeso(cat.value)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
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
