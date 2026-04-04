import { useMemo } from "react";
import { Link } from "wouter";
import { Package, AlertTriangle, XCircle, BarChart3, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { products, stockMovements, categories, currentUser } from "@/lib/mock-data";
import { formatPeso, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level);
    const outOfStock = products.filter(p => p.stock_quantity === 0);
    const totalSKUs = products.length;

    return { totalProducts, lowStock, outOfStock, totalSKUs };
  }, []);

  const recentMovements = stockMovements.slice(0, 8);

  const getMovementBadge = (type: string) => {
    switch(type) {
      case 'in': return <Badge className="bg-green-600 hover:bg-green-700">IN</Badge>;
      case 'out': return <Badge className="bg-blue-600 hover:bg-blue-700">OUT</Badge>;
      case 'adjustment': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">ADJ</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good morning, {currentUser.name.split(' ')[0]}! 👋</h1>
        <p className="text-slate-500 mt-1">Here's what's happening in your store today.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl shadow-sm border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalProducts}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Low Stock Items</p>
                <p className="text-3xl font-bold text-amber-600">{stats.lowStock.length}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">{stats.outOfStock.length}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-xl text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Categories</p>
                <p className="text-3xl font-bold text-slate-900">{categories.length}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Low Stock Alerts */}
          <Card className="rounded-xl shadow-sm border-slate-100">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Low Stock Alerts
                </CardTitle>
                <Link href="/products" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {[...stats.outOfStock, ...stats.lowStock].slice(0, 5).map((product) => (
                  <div key={product.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                        {product.image_placeholder}
                      </div>
                      <div>
                        <Link href={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
                          {product.name}
                        </Link>
                        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {product.stock_quantity === 0 ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 shadow-none">Out of Stock</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 shadow-none">Low Stock</Badge>
                      )}
                      <p className="text-sm font-medium text-slate-700">
                        {product.stock_quantity} / {product.reorder_level} {product.primary_unit}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.lowStock.length === 0 && stats.outOfStock.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <p>All items are well stocked! 🎉</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card className="rounded-xl shadow-sm border-slate-100">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-400" />
                  Recent Movements
                </CardTitle>
                <Link href="/movements" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View all log
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {getMovementBadge(movement.type)}
                        <span className="font-medium text-slate-900 text-sm">{movement.product_name}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-md">{movement.note}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-sm",
                        movement.type === 'in' ? "text-green-600" : 
                        movement.type === 'out' ? "text-blue-600" : "text-amber-600"
                      )}>
                        {movement.type === 'out' ? '-' : '+'}{movement.quantity} {movement.unit}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(movement.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          
          <Card className="rounded-xl shadow-sm border-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => {
                  const count = products.filter(p => p.category_id === category.id).length;
                  return (
                    <div 
                      key={category.id} 
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col justify-between"
                      style={{ borderLeftColor: category.color, borderLeftWidth: '3px' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl">{category.icon}</span>
                        <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                          {count}
                        </span>
                      </div>
                      <span className="font-medium text-sm text-slate-800">{category.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}