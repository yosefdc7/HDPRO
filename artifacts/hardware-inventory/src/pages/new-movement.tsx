import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowUpDown, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { currentUser } from "@/lib/mock-data";
import { getProducts, addMovementAndUpdateStock, type MovementType } from "@/lib/store";

export default function NewMovementPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract product_id from query string if present manually
  const [initialProductId, setInitialProductId] = useState("");
  useEffect(() => {
    const search = window.location.search;
    const match = search.match(/product_id=([^&]+)/);
    if (match && match[1]) {
      setInitialProductId(match[1]);
    }
  }, []);

  const [type, setType] = useState<Extract<
    MovementType,
    "PURCHASE_RECEIVED" | "SALE" | "ADJUSTMENT"
  >>("PURCHASE_RECEIVED");
  const [productId, setProductId] = useState(initialProductId);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  // Sync initialProductId when it loads
  useEffect(() => {
    if (initialProductId && !productId) {
      setProductId(initialProductId);
    }
  }, [initialProductId, productId]);

  const products = getProducts();
  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(quantity);
    if (!productId || quantity === "" || Number.isNaN(n)) return;
    if (type !== "ADJUSTMENT" && n <= 0) return;
    if (type === "ADJUSTMENT" && n === 0) return;

    const reason =
      note.trim() ||
      (type === "PURCHASE_RECEIVED"
        ? "Received stock"
        : type === "SALE"
          ? "Issued stock"
          : "Inventory adjustment");

    addMovementAndUpdateStock({
      id: crypto.randomUUID(),
      type,
      product_id: productId,
      product_name: selectedProduct?.name || "Unknown Product",
      quantity: n,
      unit: selectedProduct?.primary_unit || "unit",
      reason,
      note: note.trim(),
      by: currentUser.name.split(" ")[0],
      timestamp: new Date().toISOString(),
    });

    toast({
      title: "Movement Recorded",
      description: `Successfully recorded ${type} for ${selectedProduct?.name ?? "product"}.`,
      variant: "default",
    });

    setLocation("/movements");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Record Stock Movement</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="rounded-xl shadow-sm border-slate-200">
          <CardContent className="p-6 space-y-8">
            
            {/* Movement Type */}
            <div className="space-y-4">
              <Label className="text-base font-bold text-slate-900">Movement Type</Label>
              <RadioGroup
                value={type}
                onValueChange={(val) =>
                  setType(
                    val as Extract<
                      MovementType,
                      "PURCHASE_RECEIVED" | "SALE" | "ADJUSTMENT"
                    >,
                  )
                }
                className="grid grid-cols-3 gap-3"
              >
                <div>
                  <RadioGroupItem
                    value="PURCHASE_RECEIVED"
                    id="PURCHASE_RECEIVED"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="PURCHASE_RECEIVED"
                    className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 transition-all"
                  >
                    <Plus className="h-6 w-6 mb-2" />
                    <span className="font-bold">IN</span>
                    <span className="text-[10px] font-normal mt-1 opacity-80">Receive Stock</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="SALE" id="SALE" className="peer sr-only" />
                  <Label
                    htmlFor="SALE"
                    className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:text-blue-700 transition-all"
                  >
                    <ArrowLeft className="h-6 w-6 mb-2 -rotate-45" />
                    <span className="font-bold">OUT</span>
                    <span className="text-[10px] font-normal mt-1 opacity-80">Issue Stock</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="ADJUSTMENT"
                    id="ADJUSTMENT"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="ADJUSTMENT"
                    className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 peer-data-[state=checked]:text-amber-700 transition-all"
                  >
                    <ArrowUpDown className="h-6 w-6 mb-2" />
                    <span className="font-bold">ADJUST</span>
                    <span className="text-[10px] font-normal mt-1 opacity-80">Correction</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product" className="font-bold">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="product" className="h-12 border-slate-200 text-base">
                  <SelectValue placeholder="Search and select product..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.image_placeholder} {p.name} <span className="text-slate-400 text-xs ml-2">({p.sku})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <p className="text-sm text-slate-500 mt-2">
                  Current Stock: <strong className="text-slate-900">{selectedProduct.stock_quantity} {selectedProduct.primary_unit}s</strong>
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty" className="font-bold">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  placeholder={type === "ADJUSTMENT" ? "e.g. -3 or 5" : "0"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-12 text-lg font-bold border-slate-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="font-bold">Unit</Label>
                <Input 
                  id="unit" 
                  value={selectedProduct?.primary_unit || ""} 
                  readOnly 
                  className="h-12 bg-slate-50 border-slate-200 text-slate-500 font-medium"
                />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="font-bold">Reference / Note</Label>
              <Textarea 
                id="note" 
                placeholder="Supplier invoice #, Customer name, reason for adjustment..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none h-24 border-slate-200"
              />
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 p-6 border-t border-slate-100 rounded-b-xl flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => window.history.back()} className="border-slate-200">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white min-w-[120px] font-bold">
              <Save className="h-4 w-4 mr-2" /> Save Movement
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
