import { useEffect, useMemo, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle, Package, ArrowUpDown, Tag, DollarSign, Layers, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { categories } from "@/lib/mock-data";
import {
  getConversions,
  getMovements,
  getProducts,
  type Movement,
  type Product,
  type UnitConversion,
} from "@/lib/store";
import { getProductInventoryInsight } from "@/lib/inventory-insights";
import { MOVEMENT_UI_META, getMovementDisplaySign } from "@/lib/movement-config";
import { formatPeso, formatDate, cn } from "@/lib/utils";

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

  const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);
  const category = useMemo(() => categories.find(c => c.id === product?.category_id), [product]);
  const conversions = useMemo(
    () => unitConversions.filter((uc) => uc.product_id === productId),
    [unitConversions, productId],
  );
  const movements = useMemo(
    () => stockMovements.filter((sm) => sm.product_id === productId).slice(0, 10),
    [stockMovements, productId],
  );

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Product not found</h2>
        <Button onClick={() => setLocation("/products")} variant="outline">Back to Products</Button>
      </div>
    );
  }

  const insight = getProductInventoryInsight(product);
  const stockBadgeClass =
    insight.health === "critical"
      ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
      : insight.health === "low"
      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
      : insight.health === "overstock"
      ? "bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200"
      : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200";
  const stockValueClass =
    insight.health === "critical"
      ? "text-red-600"
      : insight.health === "low"
      ? "text-amber-600"
      : insight.health === "overstock"
      ? "text-violet-600"
      : "text-green-600";
  const stockFillClass =
    insight.health === "critical"
      ? "bg-red-500"
      : insight.health === "low"
      ? "bg-amber-500"
      : insight.health === "overstock"
      ? "bg-violet-500"
      : "bg-green-500";
  const markup = product.cost_price > 0
    ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-4xl bg-white w-14 h-14 rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
              {product.image_placeholder}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                  {product.sku}
                </Badge>
                <span className="text-xs font-medium px-2 py-0.5 rounded text-slate-600" style={{ backgroundColor: `${category?.color}15`, color: category?.color }}>
                  {category?.icon} {category?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/movements/new?product_id=${product.id}`}>
            <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Add Movement
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Current Stock</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-5xl font-bold",
                      stockValueClass
                    )}>
                      {insight.onHandQuantity}
                    </span>
                    <span className="text-xl text-slate-500 font-medium">{product.primary_unit}s</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge className={cn(stockBadgeClass, "px-3 py-1.5 text-sm gap-1.5")}>
                    {insight.health === "healthy" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {insight.healthLabel}
                  </Badge>
                  <p className="text-sm text-slate-500 mt-2">
                    Reorder point:{" "}
                    <span className="font-bold text-slate-700">{insight.reorderPoint}</span>
                  </p>
                </div>
              </div>

              {/* Visual Stock Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Critical ≤ {insight.criticalLevel}</span>
                  <span>Reorder ≤ {insight.reorderPoint}</span>
                  <span>Overstock ≥ {insight.overstockLevel}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      stockFillClass
                    )} 
                    style={{ width: `${Math.min(100, Math.max(0, (insight.onHandQuantity / Math.max(1, insight.overstockLevel)) * 100))}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="movements" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none p-0 h-auto mb-4 space-x-6">
              <TabsTrigger value="movements" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-3 shadow-none text-base">
                Recent Movements
              </TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-3 shadow-none text-base">
                More Details
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="movements" className="m-0">
              <Card className="rounded-xl shadow-sm border-slate-200">
                <div className="divide-y divide-slate-100">
                  {movements.length > 0 ? movements.map((movement) => (
                    <div key={movement.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn(MOVEMENT_UI_META[movement.type].badgeClass, "border text-xs")}>
                            {MOVEMENT_UI_META[movement.type].shortLabel}
                          </Badge>
                          <span className="text-sm font-medium text-slate-700">{formatDate(movement.timestamp)}</span>
                        </div>
                        <p className="text-sm text-slate-900">{movement.note}</p>
                        <p className="text-xs text-slate-500 mt-1">By {movement.by}</p>
                      </div>
                      <div className={cn(
                        "font-bold text-lg",
                        MOVEMENT_UI_META[movement.type].textClass
                      )}>
                        {getMovementDisplaySign(movement.type)}{Math.abs(movement.quantity)}
                        <span className="text-xs ml-1 font-normal opacity-70">{movement.unit}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-500">No recent movements found.</div>
                  )}
                </div>
                {movements.length > 0 && (
                  <div className="p-3 border-t border-slate-100 text-center bg-slate-50 rounded-b-xl">
                    <Link href={`/movements?product_id=${product.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View Full History
                    </Link>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="details" className="m-0">
              <Card className="rounded-xl shadow-sm border-slate-200">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Identifiers
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Barcode / EAN</p>
                        <p className="font-medium text-slate-900">{product.barcode || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">System ID</p>
                        <p className="font-mono text-xs text-slate-700 bg-slate-100 p-1.5 rounded inline-block">{product.id}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {conversions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Layers className="h-4 w-4" /> Unit Conversions
                      </h3>
                      <div className="space-y-2">
                        {conversions.map(conv => (
                          <div key={conv.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="font-medium text-slate-700">1 {conv.from_unit}</span>
                            <ArrowLeft className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-900">{conv.factor} {conv.to_unit}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>

        {/* Right Column - Pricing & Supplier */}
        <div className="space-y-6">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" /> Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Cost Price</span>
                <span className="font-bold text-slate-900">{formatPeso(product.cost_price)}</span>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm flex justify-between items-center ring-1 ring-blue-50">
                <span className="text-sm font-medium text-blue-800">Selling Price</span>
                <span className="text-xl font-bold text-blue-700">{formatPeso(product.selling_price)}</span>
              </div>

              <div className="flex justify-between items-center px-2">
                <span className="text-sm text-slate-500">Markup</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold">
                  {markup}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" /> Reorder Guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-600">Incoming stock</span>
                <span className="font-bold text-slate-900">
                  {insight.incomingQuantity} {product.primary_unit}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-600">Target stock level</span>
                <span className="font-bold text-slate-900">
                  {insight.targetLevel} {product.primary_unit}
                </span>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                <span className="text-sm text-blue-800">Suggested reorder</span>
                <span className="font-bold text-blue-700">
                  {insight.reorderQuantity} {product.primary_unit}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Suggested reorder uses <span className="font-semibold">on-hand + incoming</span> against target stock.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
