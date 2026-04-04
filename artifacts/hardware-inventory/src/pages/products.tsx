import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, Filter, Plus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { products, categories } from "@/lib/mock-data";
import { formatPeso, cn } from "@/lib/utils";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory ? product.category_id === selectedCategory : true;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm">Manage your inventory catalog</p>
        </div>
        <Link href="/movements/new" className="hidden">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search by product name or SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-slate-50 border-slate-200 text-base rounded-lg"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0 mr-1" />
          <Badge 
            variant="outline"
            className={cn(
              "px-3 py-1.5 cursor-pointer whitespace-nowrap rounded-lg text-sm transition-colors font-medium border-slate-200",
              selectedCategory === null ? "bg-blue-50 text-blue-700 border-blue-200" : "hover:bg-slate-100 text-slate-600"
            )}
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </Badge>
          {categories.map((cat) => (
            <Badge 
              key={cat.id}
              variant="outline"
              className={cn(
                "px-3 py-1.5 cursor-pointer whitespace-nowrap rounded-lg text-sm transition-colors font-medium border-slate-200 flex items-center gap-1.5",
                selectedCategory === cat.id ? "bg-blue-50 text-blue-700 border-blue-200" : "hover:bg-slate-100 text-slate-600"
              )}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const category = categories.find(c => c.id === product.category_id);
          const isOutOfStock = product.stock_quantity === 0;
          const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.reorder_level;
          
          return (
            <Link key={product.id} href={`/products/${product.id}`} className="block group">
              <Card className="h-full rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-blue-300 border border-slate-200">
                <CardContent className="p-0">
                  <div className="p-4 flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-105 transition-transform">
                      {product.image_placeholder}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-900 truncate" title={product.name}>
                          {product.name}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className="px-1.5 py-0 text-[10px] bg-slate-50 font-medium whitespace-nowrap"
                        >
                          {product.sku}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 mb-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded text-slate-600" style={{ backgroundColor: `${category?.color}15`, color: category?.color }}>
                          {category?.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mt-auto">
                        <div className="flex flex-col border-r border-slate-100 pr-2">
                          <span className="text-slate-500 text-xs mb-0.5">Stock</span>
                          <span className={cn(
                            "font-bold",
                            isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-green-600"
                          )}>
                            {product.stock_quantity} <span className="text-xs font-normal opacity-75">{product.primary_unit}</span>
                          </span>
                        </div>
                        <div className="flex flex-col pl-2">
                          <span className="text-slate-500 text-xs mb-0.5">Price</span>
                          <span className="font-bold text-slate-900">
                            {formatPeso(product.selling_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {(isOutOfStock || isLowStock) && (
                    <div className={cn(
                      "px-4 py-2 text-xs font-medium flex items-center gap-1.5",
                      isOutOfStock ? "bg-red-50 text-red-700 border-t border-red-100" : "bg-amber-50 text-amber-700 border-t border-amber-100"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", isOutOfStock ? "bg-red-500" : "bg-amber-500")} />
                      {isOutOfStock ? "Out of Stock" : "Low Stock Alert"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No products found</h3>
            <p className="text-slate-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
