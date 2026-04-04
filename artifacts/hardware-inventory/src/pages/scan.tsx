import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { X, Search, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getProducts, getMovements, addMovementAndUpdateStock, type Product, type Movement } from "@/lib/store";
import { categories, currentUser } from "@/lib/mock-data";
import { formatPeso, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function StockActionModal({
  open,
  product,
  action,
  onClose,
  onDone,
}: {
  open: boolean;
  product: Product | null;
  action: "in" | "out";
  onClose: () => void;
  onDone: (newQty: number) => void;
}) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) { setQty(""); setNote(""); setErr(""); }
  }, [open]);

  function handleConfirm() {
    const n = Number(qty);
    if (!qty || isNaN(n) || n <= 0) { setErr("Enter a valid quantity"); return; }
    if (!product) return;
    if (action === "out" && n > product.stock_quantity) { setErr(`Exceeds current stock (${product.stock_quantity})`); return; }
    const movement: Movement = {
      id: `sm-${Date.now()}`,
      type: action,
      product_id: product.id,
      product_name: product.name,
      quantity: n,
      unit: product.primary_unit,
      note: note.trim() || (action === "in" ? "Stock In (scan)" : "Stock Out (scan)"),
      by: currentUser.name.split(" ")[0],
      timestamp: new Date().toISOString(),
    };
    const { newStock } = addMovementAndUpdateStock(movement);
    toast({ title: action === "in" ? "Stock added!" : "Stock removed!", description: `${n} ${product.primary_unit} ${action === "in" ? "added" : "removed"}.`, variant: "success" });
    onDone(newStock);
    onClose();
  }

  if (!product) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{action === "in" ? "📥 Stock In" : "📤 Stock Out"} — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-500">Current stock: <span className="font-bold text-slate-900">{product.stock_quantity} {product.primary_unit}</span></p>
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Quantity ({product.primary_unit}) *</Label>
            <Input type="number" min="1" value={qty} onChange={(e) => { setQty(e.target.value); setErr(""); }} placeholder="e.g. 10" autoFocus className={cn(err && "border-red-400")} />
            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === "in" ? "Supplier delivery..." : "Walk-in sale..."} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleConfirm} className={cn("flex-1 text-white", action === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}>Confirm</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductResultCard({
  product,
  onAction,
  onScanAgain,
}: {
  product: Product;
  onAction: (action: "in" | "out") => void;
  onScanAgain: () => void;
}) {
  const [, navigate] = useLocation();
  const cat = categories.find((c) => c.id === product.category_id);
  const isOut = product.stock_quantity === 0;
  const isLow = product.stock_quantity > 0 && product.stock_quantity <= product.reorder_level;

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500 bg-white rounded-2xl shadow-2xl p-5 space-y-4 border border-slate-100">
      <div className="flex items-start gap-4">
        <div className="text-5xl">{product.image_placeholder}</div>
        <div className="flex-1">
          <h2 className="font-bold text-slate-900 text-lg leading-tight">{product.name}</h2>
          <p className="text-sm text-slate-500">{product.sku}</p>
          {product.barcode && <p className="text-xs text-slate-400 font-mono mt-0.5">{product.barcode}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}>{cat?.icon} {cat?.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">Current Stock</p>
          <p className={cn("font-bold text-lg", isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600")}>
            {product.stock_quantity} <span className="text-sm font-normal">{product.primary_unit}</span>
          </p>
          {isOut ? <Badge className="text-xs bg-red-100 text-red-700 border-red-200 shadow-none">Out of Stock</Badge>
            : isLow ? <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 shadow-none">Low Stock</Badge>
            : <Badge className="text-xs bg-green-100 text-green-700 border-green-200 shadow-none">In Stock</Badge>}
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">Selling Price</p>
          <p className="font-bold text-lg text-blue-700">{formatPeso(product.selling_price)}</p>
          <p className="text-xs text-slate-400">/ {product.primary_unit}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => onAction("in")} className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1">📥 Stock In</Button>
        <Button onClick={() => onAction("out")} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 text-xs gap-1" disabled={isOut}>📤 Stock Out</Button>
        <Button onClick={() => navigate(`/products/${product.id}`)} variant="outline" className="text-xs gap-1">📋 Details</Button>
      </div>

      <button onClick={onScanAgain} className="w-full text-center text-sm text-blue-600 hover:underline">
        ↻ Scan Again
      </button>
    </div>
  );
}

export default function ScanPage() {
  const [, navigate] = useLocation();
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [stockAction, setStockAction] = useState<{ action: "in" | "out" } | null>(null);
  const [linePos, setLinePos] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const DURATION = 2000;
    const HEIGHT = 180;
    function animate(ts: number) {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = (ts - startTimeRef.current) % (DURATION * 2);
      const progress = elapsed < DURATION ? elapsed / DURATION : 2 - elapsed / DURATION;
      setLinePos(progress * HEIGHT);
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  function simulateScan() {
    setScanning(true);
    setScannedProduct(null);
    setNotFound(false);
    setTimeout(() => {
      const products = getProducts();
      const random = products[Math.floor(Math.random() * products.length)];
      setScannedProduct(random);
      setScanning(false);
    }, 1200);
  }

  function handleManualSearch() {
    setNotFound(false);
    const products = getProducts();
    const found = products.find((p) => p.barcode === manualBarcode.trim());
    if (found) {
      setScannedProduct(found);
    } else {
      setNotFound(true);
    }
  }

  function handleScanAgain() {
    setScannedProduct(null);
    setNotFound(false);
    setManualBarcode("");
  }

  function handleStockDone(newQty: number) {
    if (scannedProduct) {
      setScannedProduct({ ...scannedProduct, stock_quantity: newQty });
    }
    setStockAction(null);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Camera className="h-5 w-5" /> Scan Barcode
        </h1>
        <button
          onClick={() => navigate("/products")}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          data-testid="scan-close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex flex-col items-center justify-center flex-1 px-8 gap-6">
        <div className="relative w-64 h-48">
          {/* Corners */}
          {[["top-0 left-0 border-t-4 border-l-4 rounded-tl-xl", "top-0 left-0"], ["top-0 right-0 border-t-4 border-r-4 rounded-tr-xl", "top-0 right-0"], ["bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl", "bottom-0 left-0"], ["bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl", "bottom-0 right-0"]].map(([cls]) => (
            <div key={cls} className={cn("absolute w-8 h-8 border-green-400", cls)} />
          ))}

          {/* Scanning line */}
          <div className="absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-lg">
            <div
              className="absolute inset-x-0 h-0.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"
              style={{ top: `${linePos}px` }}
            />
          </div>

          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <p className="text-slate-400 text-sm text-center">
          {scanning ? "Scanning..." : "Position barcode within the frame"}
        </p>

        {/* Manual entry */}
        <div className="w-full max-w-xs space-y-2">
          <p className="text-slate-500 text-xs text-center">Or enter barcode manually</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                placeholder="e.g. 8850001001234"
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                data-testid="manual-barcode-input"
              />
            </div>
            <Button onClick={handleManualSearch} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Search
            </Button>
          </div>
          {notFound && (
            <div className="text-center space-y-2">
              <p className="text-red-400 text-xs">Product not found for that barcode.</p>
              <button onClick={() => navigate("/products")} className="text-blue-400 text-xs hover:underline">Register New Product →</button>
            </div>
          )}
        </div>

        {/* Simulate button */}
        {!scannedProduct && (
          <Button
            onClick={simulateScan}
            disabled={scanning}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-base"
            data-testid="simulate-scan-btn"
          >
            {scanning ? "Scanning..." : "📷 Simulate Scan"}
          </Button>
        )}
      </div>

      {/* Result Card */}
      {scannedProduct && (
        <div className="px-4 pb-6">
          <ProductResultCard
            product={scannedProduct}
            onAction={(action) => setStockAction({ action })}
            onScanAgain={handleScanAgain}
          />
        </div>
      )}

      <StockActionModal
        open={!!stockAction}
        product={scannedProduct}
        action={stockAction?.action ?? "in"}
        onClose={() => setStockAction(null)}
        onDone={handleStockDone}
      />
    </div>
  );
}
