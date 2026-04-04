import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PackageSearch,
  Minus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { categories, currentUser } from "@/lib/mock-data";
import {
  getMovements,
  getProducts,
  getConversions,
  addMovementAndUpdateStock,
  type Movement,
  type Product,
  type UnitConversion,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

type TypeFilter = "all" | "in" | "out" | "adjustment";
type DateFilter = "today" | "week" | "month" | "all";

function relativeTime(ts: string): string {
  const now = new Date();
  const d = new Date(ts);
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function dateDayKey(ts: string): string {
  return ts.split("T")[0];
}

function formatDateHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const formatted = date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  const dateTime = date.getTime();
  if (dateTime === today.getTime()) return `TODAY — ${formatted}`;
  if (dateTime === yesterday.getTime()) return `YESTERDAY — ${formatted}`;
  return `${date.toLocaleDateString("en-PH", { weekday: "long" }).toUpperCase()} — ${formatted}`;
}

function isInDateRange(ts: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const d = new Date(ts);
  const now = new Date();
  if (filter === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (filter === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo;
  }
  if (filter === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-2 w-52 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-3 w-16 bg-slate-200 rounded animate-pulse ml-auto" />
        <div className="h-2 w-10 bg-slate-100 rounded animate-pulse ml-auto" />
      </div>
    </div>
  );
}

// ─── Record Movement Modal ────────────────────────────────────────────────────

interface RecordMovementModalProps {
  open: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  onRecorded: (m: Movement) => void;
}

function RecordMovementModal({ open, onClose, initialProduct, onRecorded }: RecordMovementModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<"in" | "out" | "adjustment">("in");
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [note, setNote] = useState("");
  const [qtyError, setQtyError] = useState("");

  useEffect(() => {
    if (open) {
      const prods = getProducts();
      const convs = getConversions();
      setProducts(prods);
      setConversions(convs);
      if (initialProduct) {
        setSelectedProduct(initialProduct);
        setSelectedUnit(initialProduct.primary_unit);
        setStep(2);
      } else {
        setStep(1);
        setSelectedProduct(null);
        setSelectedUnit("");
      }
      setProductSearch("");
      setBarcodeInput("");
      setMovementType("in");
      setQuantity(1);
      setNote("");
      setQtyError("");
    }
  }, [open, initialProduct]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
    ).slice(0, 10);
  }, [products, productSearch]);

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p);
    setSelectedUnit(p.primary_unit);
    setStep(2);
  }

  function handleBarcodeSearch() {
    const prod = products.find((p) => p.barcode === barcodeInput.trim());
    if (prod) {
      handleSelectProduct(prod);
    } else {
      toast({ title: "Product not found", description: "No product matched that barcode.", variant: "destructive" });
    }
  }

  const productConversions = useMemo(
    () => (selectedProduct ? conversions.filter((c) => c.product_id === selectedProduct.id) : []),
    [selectedProduct, conversions]
  );

  const conversionPreview = useMemo(() => {
    if (!selectedProduct || selectedUnit === selectedProduct.primary_unit) return null;
    const conv = productConversions.find((c) => c.from_unit === selectedUnit);
    if (!conv) return null;
    return { converted: quantity * conv.factor, to_unit: conv.to_unit };
  }, [selectedProduct, selectedUnit, quantity, productConversions]);

  const unitOptions = useMemo(() => {
    if (!selectedProduct) return [];
    const opts = [{ label: selectedProduct.primary_unit, value: selectedProduct.primary_unit }];
    productConversions.forEach((c) => {
      opts.push({ label: c.from_unit, value: c.from_unit });
    });
    return opts;
  }, [selectedProduct, productConversions]);

  function validateAndConfirm() {
    setQtyError("");
    if (quantity <= 0) {
      setQtyError("Quantity must be greater than 0");
      return;
    }
    if (movementType === "out" && selectedProduct) {
      const outQty = conversionPreview ? conversionPreview.converted : quantity;
      if (outQty > selectedProduct.stock_quantity) {
        setQtyError(`Cannot exceed current stock (${selectedProduct.stock_quantity} ${selectedProduct.primary_unit})`);
        return;
      }
    }
    setStep(3);
  }

  function handleConfirm() {
    if (!selectedProduct) return;
    const actualQty = conversionPreview ? conversionPreview.converted : quantity;
    const actualUnit = conversionPreview ? conversionPreview.to_unit : selectedUnit;

    const movement: Movement = {
      id: `sm-${Date.now()}`,
      type: movementType,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: actualQty,
      unit: actualUnit,
      note: note.trim() || (movementType === "in" ? "Stock In" : movementType === "out" ? "Stock Out" : "Adjustment"),
      by: currentUser.name.split(" ")[0],
      timestamp: new Date().toISOString(),
    };

    addMovementAndUpdateStock(movement);
    onRecorded(movement);
    toast({ title: "Movement recorded!", description: `${movement.quantity} ${movement.unit} ${movementType === "in" ? "added to" : movementType === "out" ? "removed from" : "adjusted for"} ${selectedProduct.name}.`, variant: "success" });
    onClose();
  }

  const typeConfig = {
    in: { label: "📥 Stock In", color: "bg-green-600", textColor: "text-green-700", bg: "bg-green-50" },
    out: { label: "📤 Stock Out", color: "bg-red-600", textColor: "text-red-700", bg: "bg-red-50" },
    adjustment: { label: "🔄 Adjustment", color: "bg-blue-600", textColor: "text-blue-700", bg: "bg-blue-50" },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="record-movement-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step === 1 ? "Select Product" : step === 2 ? "Movement Details" : "Confirm"}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={cn("h-1.5 rounded-full flex-1 transition-colors", s <= step ? "bg-blue-600" : "bg-slate-200")} />
            ))}
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Search product</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Product name or SKU..."
                  className="pl-9"
                  autoFocus
                  data-testid="product-search-input"
                />
              </div>
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">No products found</div>
                ) : (
                  filteredProducts.map((p) => {
                    const cat = categories.find((c) => c.id === p.category_id);
                    const isOut = p.stock_quantity === 0;
                    const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                        data-testid={`select-product-${p.id}`}
                      >
                        <span className="text-xl">{p.image_placeholder}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.sku} · {cat?.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-xs font-bold", isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600")}>
                            {p.stock_quantity} {p.primary_unit}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Label className="text-sm text-slate-600 mb-1.5 block">Or enter barcode</Label>
              <div className="flex gap-2">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeSearch()}
                  placeholder="885000..."
                  data-testid="barcode-input"
                />
                <Button variant="outline" onClick={handleBarcodeSearch}>Search</Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && selectedProduct && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-2xl">{selectedProduct.image_placeholder}</span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{selectedProduct.name}</p>
                <p className="text-xs text-slate-500">Current stock: <span className="font-bold">{selectedProduct.stock_quantity} {selectedProduct.primary_unit}</span></p>
              </div>
              <button onClick={() => { setStep(1); setSelectedProduct(null); }} className="ml-auto text-xs text-blue-600 hover:underline">Change</button>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Movement Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["in", "out", "adjustment"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMovementType(t)}
                    className={cn(
                      "py-2 px-1 rounded-lg text-xs font-semibold border-2 transition-all text-center",
                      movementType === t
                        ? `${typeConfig[t].color} text-white border-transparent`
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                    )}
                    data-testid={`movement-type-${t}`}
                  >
                    {typeConfig[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Quantity *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => { setQuantity(Number(e.target.value)); setQtyError(""); }}
                  className={cn("text-center text-lg font-bold", qtyError && "border-red-400")}
                  data-testid="quantity-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring flex-shrink-0"
                  data-testid="unit-select"
                >
                  {unitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {qtyError && <p className="text-xs text-red-500 mt-1">{qtyError}</p>}

              {conversionPreview && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                  <span className="text-sm text-amber-800 font-medium">
                    = {conversionPreview.converted} {conversionPreview.to_unit}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Reference Note</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={movementType === "in" ? "Supplier delivery..." : movementType === "out" ? "Walk-in sale..." : "Recount adjustment..."}
                data-testid="note-input"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
              <Button onClick={validateAndConfirm} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white" data-testid="next-to-confirm">
                Review →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && selectedProduct && (
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <span className="text-2xl">{selectedProduct.image_placeholder}</span>
                  <div>
                    <p className="font-bold text-slate-900">{selectedProduct.name}</p>
                    <p className="text-xs text-slate-500">Current: {selectedProduct.stock_quantity} {selectedProduct.primary_unit}</p>
                  </div>
                </div>
                {[
                  { label: "Type", value: <Badge className={cn("text-white text-xs", typeConfig[movementType].color)}>{typeConfig[movementType].label}</Badge> },
                  { label: "Quantity", value: <span className="font-bold">{quantity} {selectedUnit}{conversionPreview ? ` (= ${conversionPreview.converted} ${conversionPreview.to_unit})` : ""}</span> },
                  { label: "Note", value: note || "(none)" },
                  { label: "Recorded by", value: currentUser.name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
                    <span className="text-sm text-slate-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="text-sm text-blue-600 hover:underline">← Back</button>
              <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700 text-white" data-testid="confirm-movement">
                ✓ Confirm Movement
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const data = getMovements();
    setMovements(data);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleMovementRecorded = useCallback((m: Movement) => {
    setMovements(getMovements());
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchSearch =
        m.product_name.toLowerCase().includes(search.toLowerCase()) ||
        m.note.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || m.type === typeFilter;
      const matchDate = isInDateRange(m.timestamp, dateFilter);
      return matchSearch && matchType && matchDate;
    });
  }, [movements, search, typeFilter, dateFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const grouped = useMemo(() => {
    const groups: Map<string, Movement[]> = new Map();
    for (const m of paginated) {
      const key = dateDayKey(m.timestamp);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({
      header: formatDateHeader(key),
      items,
    }));
  }, [paginated]);

  const typeFilterOptions: { key: TypeFilter; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "" },
    { key: "in", label: "Stock In", icon: "📥" },
    { key: "out", label: "Stock Out", icon: "📤" },
    { key: "adjustment", label: "Adjustments", icon: "🔄" },
  ];

  const dateFilterOptions: { key: DateFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Movements</h1>
          <p className="text-slate-500 text-sm">Track inventory changes over time</p>
        </div>
        <Button
          className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg gap-2 shadow-sm"
          onClick={() => setShowModal(true)}
          data-testid="record-movement-btn"
        >
          <Plus className="h-4 w-4" />
          Record Movement
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by product or note..."
            className="pl-9 bg-slate-50"
            data-testid="movement-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            {typeFilterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setTypeFilter(opt.key); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  typeFilter === opt.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                data-testid={`type-filter-${opt.key}`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            {dateFilterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setDateFilter(opt.key); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  dateFilter === opt.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                data-testid={`date-filter-${opt.key}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-800">{filtered.length}</span> movements
      </p>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <PackageSearch className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            {movements.length === 0 ? (
              <>
                <p className="font-medium text-slate-700">No movements recorded yet</p>
                <p className="text-sm text-slate-400 mt-1">Click "Record Movement" to get started</p>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-700">No results match your filters</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting the search or date/type filters</p>
              </>
            )}
          </div>
        ) : (
          <>
            {grouped.map((group) => (
              <div key={group.header}>
                <div className="sticky top-0 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 z-10">
                  {group.header}
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map((m) => {
                    const isIn = m.type === "in";
                    const isAdj = m.type === "adjustment";
                    const isExpanded = expandedId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        data-testid={`movement-row-${m.id}`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className={cn(
                            "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                            isIn ? "bg-green-100 text-green-600" : isAdj ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                          )}>
                            {isIn ? <ArrowUpCircle className="h-5 w-5" /> : isAdj ? <RefreshCw className="h-4 w-4" /> : <ArrowDownCircle className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{m.product_name}</p>
                            <p className="text-xs text-slate-400 truncate">{m.note}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={cn("text-sm font-bold", isIn ? "text-green-600" : isAdj ? "text-blue-600" : "text-red-600")}>
                              {isIn ? "+" : isAdj ? "±" : "-"}{Math.abs(m.quantity)} {m.unit}
                            </p>
                            <p className="text-xs text-slate-400">{relativeTime(m.timestamp)}</p>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-center gap-0.5 ml-1">
                            <span className="text-xs font-medium text-slate-500">{m.by}</span>
                            <ChevronDown className={cn("h-3.5 w-3.5 text-slate-300 transition-transform", isExpanded && "rotate-180")} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 space-y-1 animate-in fade-in duration-200">
                            <p><span className="font-medium">Full note:</span> {m.note || "(none)"}</p>
                            <p><span className="font-medium">Timestamp:</span> {new Date(m.timestamp).toLocaleString("en-PH")}</p>
                            <p><span className="font-medium">Movement ID:</span> <span className="font-mono">{m.id}</span></p>
                            <p><span className="font-medium">Recorded by:</span> {m.by}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <RecordMovementModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onRecorded={handleMovementRecorded}
      />
    </div>
  );
}
