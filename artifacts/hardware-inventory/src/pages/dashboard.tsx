import { useState, useEffect, useMemo } from "react";
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
import { formatPeso, cn } from "@/lib/utils";

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

export default function DashboardPage() {
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    setProducts(getProducts());
    setMovements(getMovements());
    const timer = setTimeout(() => setLoaded(true), SKELETON_MS);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level
    );
    const outOfStock = products.filter((p) => p.stock_quantity === 0);
    const todayMovements = movements.filter((m) => isToday(m.timestamp));
    const inventoryValue = products.reduce(
      (sum, p) => sum + p.stock_quantity * p.cost_price,
      0
    );
    return { totalProducts, lowStock, outOfStock, todayMovements, inventoryValue };
  }, [products, movements]);

  const needsRestock = useMemo(() => {
    return [...products]
      .filter((p) => p.stock_quantity <= p.reorder_level)
      .sort((a, b) => a.stock_quantity - b.stock_quantity)
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

  const alertCount = stats.lowStock.length + stats.outOfStock.length;

  const statCards = [
    {
      label: "Total Products",
      value: stats.totalProducts,
      icon: <Package className="h-6 w-6" />,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
      badge: null,
    },
    {
      label: "Low Stock Items",
      value: alertCount,
      icon: <AlertTriangle className="h-6 w-6" />,
      iconBg: "bg-red-50 text-red-600",
      valueColor: alertCount > 0 ? "text-red-600" : "text-green-600",
      badge: alertCount > 0 ? `${stats.outOfStock.length} out · ${stats.lowStock.length} low` : "All stocked",
    },
    {
      label: "Today's Movements",
      value: stats.todayMovements.length,
      icon: <ArrowDownUp className="h-6 w-6" />,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-slate-900",
      badge: null,
    },
    {
      label: "Inventory Value",
      value: formatPeso(stats.inventoryValue),
      icon: <PhilippinePeso className="h-6 w-6" />,
      iconBg: "bg-violet-50 text-violet-600",
      valueColor: "text-slate-900",
      isLarge: true,
      badge: null,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning, {currentUser.name.split(" ")[0]}!
        </h1>
        <p className="text-slate-500 mt-1">
          Here's what's happening in your store today.
        </p>
      </div>

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
                          "font-bold",
                          card.isLarge ? "text-xl" : "text-3xl",
                          card.valueColor
                        )}
                      >
                        {card.value}
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
                    const isOut = product.stock_quantity === 0;
                    const pct = isOut
                      ? 0
                      : Math.min(
                          100,
                          (product.stock_quantity / product.reorder_level) * 100
                        );
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
                            {isOut ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 shadow-none text-xs">
                                Out of Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none text-xs">
                                Low Stock
                              </Badge>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              {product.stock_quantity} / {product.reorder_level}{" "}
                              {product.primary_unit}
                            </p>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              isOut ? "w-0" : pct < 50 ? "bg-red-500" : "bg-amber-400"
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
                  const isIn = movement.type === "in";
                  const isAdj = movement.type === "adjustment";
                  return (
                    <div
                      key={movement.id}
                      className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                      data-testid={`activity-item-${movement.id}`}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                          isIn
                            ? "bg-green-100 text-green-600"
                            : isAdj
                            ? "bg-blue-100 text-blue-600"
                            : "bg-red-100 text-red-600"
                        )}
                      >
                        {isIn ? (
                          <ArrowUpCircle className="h-5 w-5" />
                        ) : isAdj ? (
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
                        <p
                          className={cn(
                            "text-sm font-bold",
                            isIn
                              ? "text-green-600"
                              : isAdj
                              ? "text-blue-600"
                              : "text-red-600"
                          )}
                        >
                          {isIn ? "+" : isAdj ? "±" : "-"}
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
