import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Plus,
  Package,
  LayoutGrid,
  List,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Layers,
  Trash2,
  ChevronDown,
  SortAsc,
  SortDesc,
  FilterX,
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { categories, currentUser } from "@/lib/mock-data";
import {
  getProducts,
  getMovements,
  getConversions,
  addMovementAndUpdateStock,
  addProduct,
  type Product,
  type Movement,
  type UnitConversion,
} from "@/lib/store";
import { formatPeso, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type ColKey = "name" | "category" | "stock_quantity" | "primary_unit" | "cost_price" | "selling_price" | "status";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";

interface ColumnFilterState {
  sort: SortDir | null;
  selectedValues: Set<string>;
}

type ColumnFilters = Partial<Record<ColKey, ColumnFilterState>>;

function getStockStatus(p: Product) {
  if (p.stock_quantity === 0) return "out";
  if (p.stock_quantity <= p.reorder_level) return "low";
  return "ok";
}

function getColumnDisplayValue(col: ColKey, p: Product): string {
  switch (col) {
    case "name": return p.name;
    case "category": {
      const cat = categories.find((c) => c.id === p.category_id);
      return cat ? `${cat.icon} ${cat.name}` : "Unknown";
    }
    case "stock_quantity": return String(p.stock_quantity);
    case "primary_unit": return p.primary_unit;
    case "cost_price": return formatPeso(p.cost_price);
    case "selling_price": return formatPeso(p.selling_price);
    case "status": {
      const s = getStockStatus(p);
      return s === "out" ? "Out of Stock" : s === "low" ? "Low Stock" : "In Stock";
    }
  }
}

function getSortValue(col: ColKey, p: Product): string | number {
  switch (col) {
    case "name": return p.name.toLowerCase();
    case "category": {
      const cat = categories.find((c) => c.id === p.category_id);
      return cat?.name.toLowerCase() ?? "";
    }
    case "stock_quantity": return p.stock_quantity;
    case "primary_unit": return p.primary_unit.toLowerCase();
    case "cost_price": return p.cost_price;
    case "selling_price": return p.selling_price;
    case "status": {
      const s = getStockStatus(p);
      return s === "ok" ? 0 : s === "low" ? 1 : 2;
    }
  }
}

function getUniqueValues(col: ColKey, products: Product[]): string[] {
  const set = new Set<string>();
  products.forEach((p) => set.add(getColumnDisplayValue(col, p)));
  const arr = Array.from(set);
  if (col === "status") {
    const order = ["In Stock", "Low Stock", "Out of Stock"];
    return order.filter((v) => arr.includes(v));
  }
  if (col === "stock_quantity") {
    return arr.sort((a, b) => Number(a) - Number(b));
  }
  return arr.sort((a, b) => a.localeCompare(b));
}

function isFilterActive(f: ColumnFilterState | undefined): boolean {
  if (!f) return false;
  return f.selectedValues.size > 0;
}

function isSortActive(f: ColumnFilterState | undefined): boolean {
  if (!f) return false;
  return f.sort !== null;
}

// ─── Excel-style Column Header ────────────────────────────────────────────────

interface ExcelColumnHeaderProps {
  col: ColKey;
  label: string;
  allProducts: Product[];
  filter: ColumnFilterState | undefined;
  onApply: (col: ColKey, sort: SortDir | null, selectedValues: Set<string>) => void;
  onClear: (col: ColKey) => void;
  className?: string;
  align?: "left" | "right";
}

function ExcelColumnHeader({
  col,
  label,
  allProducts,
  filter,
  onApply,
  onClear,
  className,
  align = "left",
}: ExcelColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [localSort, setLocalSort] = useState<SortDir | null>(filter?.sort ?? null);
  const [localSelected, setLocalSelected] = useState<Set<string>>(
    new Set(filter?.selectedValues ?? [])
  );

  const allValues = useMemo(() => getUniqueValues(col, allProducts), [col, allProducts]);

  const filteredValues = useMemo(
    () =>
      searchVal.trim()
        ? allValues.filter((v) => v.toLowerCase().includes(searchVal.toLowerCase()))
        : allValues,
    [allValues, searchVal]
  );

  const active = isFilterActive(filter);
  const sorted = isSortActive(filter);

  function onOpenChange(v: boolean) {
    if (v) {
      setLocalSort(filter?.sort ?? null);
      if (!filter || filter.selectedValues.size === 0) {
        setLocalSelected(new Set(allValues));
      } else {
        setLocalSelected(new Set(filter.selectedValues));
      }
      setSearchVal("");
    }
    setOpen(v);
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setLocalSelected(new Set(filteredValues));
    } else {
      setLocalSelected((prev) => {
        const next = new Set(prev);
        filteredValues.forEach((v) => next.delete(v));
        return next;
      });
    }
  }

  function handleCheckValue(val: string, checked: boolean) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(val);
      else next.delete(val);
      return next;
    });
  }

  const allFilteredSelected =
    filteredValues.length > 0 && filteredValues.every((v) => localSelected.has(v));
  const someFilteredSelected =
    !allFilteredSelected && filteredValues.some((v) => localSelected.has(v));

  function handleOK() {
    const effectiveSelected =
      localSelected.size >= allValues.length ? new Set<string>() : localSelected;
    onApply(col, localSort, effectiveSelected);
    setOpen(false);
  }

  function handleClear() {
    setLocalSort(null);
    setLocalSelected(new Set());
    onClear(col);
    setOpen(false);
  }

  return (
    <th
      className={cn(
        "relative select-none whitespace-nowrap transition-colors",
        active || sorted ? "bg-blue-50" : "bg-slate-50",
        className
      )}
      data-testid={`col-header-${col}`}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1 w-full px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-blue-700 focus:outline-none",
              active || sorted ? "text-blue-700" : "text-slate-500",
              align === "right" ? "justify-end" : "justify-between"
            )}
            data-testid={`col-filter-btn-${col}`}
          >
            <span className={cn("flex items-center gap-1", align === "right" && "flex-row-reverse")}>
              <span className={cn(active && "underline underline-offset-2")}>{label}</span>
              {sorted && filter?.sort === "asc" && <SortAsc className="h-3 w-3 text-blue-600 flex-shrink-0" />}
              {sorted && filter?.sort === "desc" && <SortDesc className="h-3 w-3 text-blue-600 flex-shrink-0" />}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 flex-shrink-0 transition-transform",
                open && "rotate-180",
                active || sorted ? "text-blue-600" : "text-slate-400"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={align === "right" ? "end" : "start"}
          className="w-56 p-0 shadow-lg border border-slate-200 rounded-lg overflow-hidden"
          data-testid={`col-filter-panel-${col}`}
        >
          <div className="bg-blue-700 px-3 py-2">
            <p className="text-xs font-semibold text-white uppercase tracking-wide">{label}</p>
          </div>

          <div className="border-b border-slate-100 p-2 space-y-1">
            <button
              onClick={() => setLocalSort("asc")}
              className={cn(
                "flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded transition-colors",
                localSort === "asc"
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              )}
              data-testid={`sort-asc-${col}`}
            >
              <SortAsc className="h-3.5 w-3.5" />
              Sort A → Z
            </button>
            <button
              onClick={() => setLocalSort("desc")}
              className={cn(
                "flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded transition-colors",
                localSort === "desc"
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              )}
              data-testid={`sort-desc-${col}`}
            >
              <SortDesc className="h-3.5 w-3.5" />
              Sort Z → A
            </button>
          </div>

          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full text-xs pl-6 pr-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-testid={`filter-search-${col}`}
              />
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto p-2 space-y-0.5">
            <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                data-testid={`select-all-${col}`}
              />
              (Select All)
            </label>
            {filteredValues.map((val) => (
              <label
                key={val}
                className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                  checked={localSelected.has(val)}
                  onChange={(e) => handleCheckValue(val, e.target.checked)}
                  data-testid={`filter-val-${col}-${val}`}
                />
                {val}
              </label>
            ))}
            {filteredValues.length === 0 && (
              <p className="text-xs text-slate-400 italic px-1 py-1">No matches</p>
            )}
          </div>

          <div className="flex gap-2 p-2 border-t border-slate-100">
            <button
              onClick={handleOK}
              className="flex-1 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded px-3 py-1.5 font-semibold transition-colors"
              data-testid={`filter-ok-${col}`}
            >
              OK
            </button>
            <button
              onClick={handleClear}
              className="flex-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 rounded px-3 py-1.5 font-medium transition-colors"
              data-testid={`filter-clear-${col}`}
            >
              Clear
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </th>
  );
}

// ─── Add Product Modal ────────────────────────────────────────────────────────

interface UnitConvRow { id: string; from_unit: string; to_unit: string; factor: string }

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (p: Product) => void;
  initialBarcode?: string;
}

function AddProductModal({ open, onClose, onSave, initialBarcode = "" }: AddProductModalProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [unit, setUnit] = useState("piece");
  const [stock, setStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [conversions, setConversions] = useState<UnitConvRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setBarcode(initialBarcode);
  }, [open, initialBarcode]);

  const margin =
    parseFloat(costPrice) > 0 && parseFloat(sellingPrice) > 0
      ? (((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)
      : null;

  function addConvRow() {
    setConversions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from_unit: "", to_unit: unit, factor: "" },
    ]);
  }

  function removeConvRow(id: string) {
    setConversions((prev) => prev.filter((r) => r.id !== id));
  }

  function updateConvRow(id: string, field: keyof UnitConvRow, value: string) {
    setConversions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Product name is required";
    if (!sku.trim()) errs.sku = "SKU is required";
    if (!stock || isNaN(Number(stock)) || Number(stock) < 0) errs.stock = "Valid stock required";
    if (!reorderLevel || isNaN(Number(reorderLevel)) || Number(reorderLevel) < 0) errs.reorderLevel = "Valid reorder level required";
    if (!costPrice || isNaN(Number(costPrice)) || Number(costPrice) <= 0) errs.costPrice = "Valid cost price required";
    if (!sellingPrice || isNaN(Number(sellingPrice)) || Number(sellingPrice) <= 0) errs.sellingPrice = "Valid selling price required";
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const cat = categories.find((c) => c.id === categoryId)!;
    const productId = `p-${Date.now()}`;
    const newProduct: Product = {
      id: productId,
      category_id: categoryId,
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim() || undefined,
      primary_unit: unit,
      stock_quantity: Number(stock),
      reorder_level: Number(reorderLevel),
      cost_price: Number(costPrice),
      selling_price: Number(sellingPrice),
      is_active: true,
      image_placeholder: cat.icon,
    };

    const validConversions: UnitConversion[] = conversions
      .filter((c) => c.from_unit.trim() && c.factor.trim() && !isNaN(Number(c.factor)) && Number(c.factor) > 0)
      .map((c) => ({
        id: c.id,
        product_id: productId,
        from_unit: c.from_unit.trim(),
        to_unit: c.to_unit || unit,
        factor: Number(c.factor),
      }));

    addProduct(newProduct, validConversions);
    onSave(newProduct);
    toast({ title: "Product added!", description: `${newProduct.name} has been added.`, variant: "success" });
    handleClose();
  }

  function handleClose() {
    setName(""); setSku(""); setBarcode(""); setCategoryId(categories[0].id);
    setUnit("piece"); setStock(""); setReorderLevel(""); setCostPrice(""); setSellingPrice("");
    setConversions([]); setErrors({});
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="add-product-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="prod-name" className="text-sm font-medium text-slate-700 mb-1 block">Product Name *</Label>
              <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Portland Cement" data-testid="prod-name-input" className={cn(errors.name && "border-red-400")} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="prod-sku" className="text-sm font-medium text-slate-700 mb-1 block">SKU *</Label>
              <Input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="CEM-001" data-testid="prod-sku-input" className={cn(errors.sku && "border-red-400")} />
              {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
            </div>
            <div>
              <Label htmlFor="prod-barcode" className="text-sm font-medium text-slate-700 mb-1 block">Barcode</Label>
              <Input id="prod-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="885000..." data-testid="prod-barcode-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prod-category" className="text-sm font-medium text-slate-700 mb-1 block">Category</Label>
              <select
                id="prod-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="prod-category-select"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="prod-unit" className="text-sm font-medium text-slate-700 mb-1 block">Primary Unit</Label>
              <Input id="prod-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="piece, bag, meter..." data-testid="prod-unit-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prod-stock" className="text-sm font-medium text-slate-700 mb-1 block">Initial Stock *</Label>
              <Input id="prod-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" data-testid="prod-stock-input" className={cn(errors.stock && "border-red-400")} />
              {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
            </div>
            <div>
              <Label htmlFor="prod-reorder" className="text-sm font-medium text-slate-700 mb-1 block">Reorder Level *</Label>
              <Input id="prod-reorder" type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="10" data-testid="prod-reorder-input" className={cn(errors.reorderLevel && "border-red-400")} />
              {errors.reorderLevel && <p className="text-xs text-red-500 mt-1">{errors.reorderLevel}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prod-cost" className="text-sm font-medium text-slate-700 mb-1 block">Cost Price (₱) *</Label>
              <Input id="prod-cost" type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" data-testid="prod-cost-input" className={cn(errors.costPrice && "border-red-400")} />
              {errors.costPrice && <p className="text-xs text-red-500 mt-1">{errors.costPrice}</p>}
            </div>
            <div>
              <Label htmlFor="prod-selling" className="text-sm font-medium text-slate-700 mb-1 block">Selling Price (₱) *</Label>
              <Input id="prod-selling" type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" data-testid="prod-selling-input" className={cn(errors.sellingPrice && "border-red-400")} />
              {errors.sellingPrice && <p className="text-xs text-red-500 mt-1">{errors.sellingPrice}</p>}
            </div>
          </div>

          {margin !== null && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-sm text-slate-600">Margin:</span>
              <Badge className="bg-green-100 text-green-700 border-green-200 shadow-none">{margin}%</Badge>
              <span className="text-xs text-slate-500">markup on cost</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> Unit Conversions
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addConvRow} data-testid="add-conversion-btn" className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Add Row
              </Button>
            </div>
            {conversions.length === 0 && (
              <p className="text-xs text-slate-400 italic">No conversions. Click "Add Row" to define (e.g. 1 roll = 150 meters).</p>
            )}
            <div className="space-y-2">
              {conversions.map((row) => (
                <div key={row.id} className="flex items-center gap-2" data-testid={`conv-row-${row.id}`}>
                  <span className="text-xs text-slate-500 w-4">1</span>
                  <Input value={row.from_unit} onChange={(e) => updateConvRow(row.id, "from_unit", e.target.value)} placeholder="roll" className="h-8 text-xs" />
                  <span className="text-xs text-slate-400">=</span>
                  <Input type="number" value={row.factor} onChange={(e) => updateConvRow(row.id, "factor", e.target.value)} placeholder="150" className="h-8 text-xs w-20" />
                  <span className="text-xs text-slate-500">{unit || "unit"}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeConvRow(row.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} data-testid="add-product-cancel">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-700 hover:bg-blue-800 text-white" data-testid="add-product-save">
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Detail Slide-over ────────────────────────────────────────────────

interface SlideoverProps {
  product: Product | null;
  allConversions: UnitConversion[];
  onClose: () => void;
  onStockUpdated: (id: string, newQty: number) => void;
}

function ProductSlideover({ product, allConversions, onClose, onStockUpdated }: SlideoverProps) {
  const [action, setAction] = useState<"in" | "out" | null>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [qtyError, setQtyError] = useState("");
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);

  useEffect(() => {
    if (product) {
      const all = getMovements();
      setRecentMovements(all.filter((m) => m.product_id === product.id).slice(0, 5));
    }
  }, [product]);

  function handleStockAction() {
    const n = Number(qty);
    if (!qty || isNaN(n) || n <= 0) {
      setQtyError("Enter a valid quantity");
      return;
    }
    if (!product) return;
    if (action === "out" && n > product.stock_quantity) {
      setQtyError(`Exceeds current stock (${product.stock_quantity})`);
      return;
    }

    const movement: Movement = {
      id: `sm-${Date.now()}`,
      type: action!,
      product_id: product.id,
      product_name: product.name,
      quantity: n,
      unit: product.primary_unit,
      note: note.trim() || (action === "in" ? "Stock In" : "Stock Out"),
      by: currentUser.name.split(" ")[0],
      timestamp: new Date().toISOString(),
    };

    const { newStock } = addMovementAndUpdateStock(movement);
    onStockUpdated(product.id, newStock);

    const updatedMovements = getMovements();
    setRecentMovements(updatedMovements.filter((m) => m.product_id === product.id).slice(0, 5));

    toast({
      title: action === "in" ? "Stock added!" : "Stock removed!",
      description: `${n} ${product.primary_unit} ${action === "in" ? "added to" : "removed from"} ${product.name}.`,
      variant: "success",
    });
    setAction(null);
    setQty("");
    setNote("");
    setQtyError("");
  }

  function cancelAction() {
    setAction(null);
    setQty("");
    setNote("");
    setQtyError("");
  }

  if (!product) return null;

  const category = categories.find((c) => c.id === product.category_id);
  const conversions = allConversions.filter((uc) => uc.product_id === product.id);
  const isOut = product.stock_quantity === 0;
  const isLow = product.stock_quantity > 0 && product.stock_quantity <= product.reorder_level;
  const markup = product.cost_price > 0
    ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
    : "0";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} data-testid="slideover-backdrop" />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right-8 duration-300"
        data-testid="product-slideover"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{product.image_placeholder}</span>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight">{product.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-xs font-mono bg-slate-100">{product.sku}</Badge>
                {isOut && <Badge className="text-xs bg-red-100 text-red-700 border-red-200 shadow-none">Out of Stock</Badge>}
                {isLow && !isOut && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 shadow-none">Low Stock</Badge>}
                {!isOut && !isLow && <Badge className="text-xs bg-green-100 text-green-700 border-green-200 shadow-none">In Stock</Badge>}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="slideover-close" className="rounded-full text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Category", value: `${category?.icon} ${category?.name}` },
              { label: "Unit", value: product.primary_unit },
              { label: "Cost Price", value: formatPeso(product.cost_price) },
              { label: "Selling Price", value: formatPeso(product.selling_price), highlight: true },
              { label: "Current Stock", value: `${product.stock_quantity} ${product.primary_unit}`, stockColor: isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600" },
              { label: "Markup", value: `${markup}%`, greenText: true },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                <p className={cn("font-medium text-sm", item.highlight ? "text-blue-700 font-bold" : item.stockColor || item.greenText ? (item.greenText ? "text-green-700" : item.stockColor) : "text-slate-900")}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {action === null ? (
            <div className="flex gap-3">
              <Button onClick={() => setAction("in")} className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2" data-testid="stock-in-btn">
                <ArrowUpCircle className="h-4 w-4" /> Stock In
              </Button>
              <Button onClick={() => setAction("out")} variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50 gap-2" data-testid="stock-out-btn" disabled={isOut}>
                <ArrowDownCircle className="h-4 w-4" /> Stock Out
              </Button>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3" data-testid="stock-action-form">
              <p className="text-sm font-bold text-slate-800">{action === "in" ? "📥 Add Stock" : "📤 Remove Stock"}</p>
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Quantity ({product.primary_unit}) *</Label>
                <Input type="number" min="1" value={qty} onChange={(e) => { setQty(e.target.value); setQtyError(""); }} placeholder="e.g. 10" data-testid="stock-qty-input" className={cn(qtyError && "border-red-400")} autoFocus />
                {qtyError && <p className="text-xs text-red-500 mt-1">{qtyError}</p>}
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === "in" ? "Supplier delivery, restock..." : "Walk-in sale, customer order..."} data-testid="stock-note-input" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStockAction} className={cn("flex-1 text-white", action === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")} data-testid="stock-action-confirm">
                  Confirm
                </Button>
                <Button variant="outline" onClick={cancelAction} data-testid="stock-action-cancel">Cancel</Button>
              </div>
            </div>
          )}

          {conversions.length > 0 && (
            <div>
              <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" /> Unit Conversions
              </p>
              <div className="space-y-1.5">
                {conversions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-100">
                    <span className="font-medium text-slate-700">1 {c.from_unit}</span>
                    <span className="text-slate-400">=</span>
                    <span className="font-medium text-slate-900">{c.factor} {c.to_unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-bold text-slate-800 mb-2">Last Movements</p>
            {recentMovements.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No movements recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100" data-testid={`slideover-movement-${m.id}`}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", m.type === "in" ? "bg-green-500" : m.type === "out" ? "bg-red-500" : "bg-blue-500")} />
                      <span className="text-slate-700 truncate max-w-[160px]">{m.note}</span>
                    </div>
                    <span className={cn("font-bold ml-2 flex-shrink-0", m.type === "in" ? "text-green-600" : m.type === "out" ? "text-red-600" : "text-blue-600")}>
                      {m.type === "out" ? "-" : "+"}{Math.abs(m.quantity)} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Products Page ───────────────────────────────────────────────────────

const ALL_COLS: { key: ColKey; label: string; align?: "left" | "right" }[] = [
  { key: "name", label: "Product" },
  { key: "category", label: "Category" },
  { key: "stock_quantity", label: "Stock", align: "right" },
  { key: "primary_unit", label: "Unit" },
  { key: "cost_price", label: "Cost", align: "right" },
  { key: "selling_price", label: "Price", align: "right" },
  { key: "status", label: "Status", align: "right" },
];

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [allConversions, setAllConversions] = useState<UnitConversion[]>([]);

  useEffect(() => {
    setLocalProducts(getProducts());
    setAllConversions(getConversions());
  }, []);

  function handleApplyFilter(col: ColKey, sort: SortDir | null, selectedValues: Set<string>) {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (sort === null && selectedValues.size === 0) {
        delete next[col];
      } else {
        const prevSort = prev[col]?.sort ?? null;
        const newSort = sort;
        if (newSort !== null && newSort !== prevSort) {
          Object.keys(next).forEach((k) => {
            if (k !== col && next[k as ColKey]?.sort) {
              next[k as ColKey] = { ...next[k as ColKey]!, sort: null };
            }
          });
        }
        next[col] = { sort: newSort, selectedValues };
      }
      return next;
    });
  }

  function handleClearFilter(col: ColKey) {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  }

  function handleClearAll() {
    setColumnFilters({});
  }

  const anyFilterActive = Object.values(columnFilters).some(
    (f) => f && (f.selectedValues.size > 0 || f.sort !== null)
  );

  const filteredProducts = useMemo(() => {
    let list = localProducts.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCols = ALL_COLS.every(({ key }) => {
        const f = columnFilters[key];
        if (!f || f.selectedValues.size === 0) return true;
        return f.selectedValues.has(getColumnDisplayValue(key, p));
      });

      return matchSearch && matchCols;
    });

    const sortEntry = Object.entries(columnFilters).find(([, f]) => f?.sort !== null);
    if (sortEntry) {
      const [key, f] = sortEntry;
      const dir = f!.sort!;
      list = [...list].sort((a, b) => {
        const aV = getSortValue(key as ColKey, a);
        const bV = getSortValue(key as ColKey, b);
        if (typeof aV === "string" && typeof bV === "string") {
          return dir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
        }
        return dir === "asc" ? (aV as number) - (bV as number) : (bV as number) - (aV as number);
      });
    }

    return list;
  }, [localProducts, searchQuery, columnFilters]);

  const handleProductSaved = useCallback((p: Product) => {
    setLocalProducts((prev) => [...prev, p]);
    setAllConversions(getConversions());
  }, []);

  const handleStockUpdated = useCallback((id: string, newQty: number) => {
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock_quantity: newQty } : p))
    );
    setSelectedProduct((prev) =>
      prev && prev.id === id ? { ...prev, stock_quantity: newQty } : prev
    );
  }, []);

  const activeFilterCount = Object.values(columnFilters).filter(
    (f) => f && f.selectedValues.size > 0
  ).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm">Manage your inventory catalog</p>
        </div>
        <Button
          className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg gap-2 shadow-sm"
          onClick={() => setShowAddModal(true)}
          data-testid="add-product-btn"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 rounded-lg h-9 text-sm"
            data-testid="search-input"
          />
        </div>

        <div className="flex items-center gap-2">
          {anyFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-9 text-xs gap-1.5 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
              data-testid="clear-all-filters-btn"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear All Filters
              {activeFilterCount > 0 && (
                <span className="bg-amber-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}

          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}
              data-testid="view-list-btn"
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}
              data-testid="view-grid-btn"
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 ml-auto" data-testid="results-count">
          Showing{" "}
          <span className={cn("font-semibold", filteredProducts.length < localProducts.length ? "text-blue-700" : "text-slate-800")}>
            {filteredProducts.length}
          </span>{" "}
          of {localProducts.length} products
        </p>
      </div>

      {/* List View — Excel-style table */}
      {viewMode === "list" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" data-testid="products-table">
              <thead className="sticky top-0 z-10">
                <tr className="border-b-2 border-slate-300">
                  {ALL_COLS.map((col) => (
                    <ExcelColumnHeader
                      key={col.key}
                      col={col.key}
                      label={col.label}
                      allProducts={localProducts}
                      filter={columnFilters[col.key]}
                      onApply={handleApplyFilter}
                      onClear={handleClearFilter}
                      align={col.align}
                      className={col.align === "right" ? "text-right" : "text-left"}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => {
                  const cat = categories.find((c) => c.id === product.category_id);
                  const status = getStockStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                        "hover:bg-blue-50/60"
                      )}
                      onClick={() => setSelectedProduct(product)}
                      data-testid={`product-row-${product.id}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{product.image_placeholder}</span>
                          <div>
                            <p className="font-medium text-slate-900 whitespace-nowrap">{product.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap"
                          style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}
                        >
                          {cat?.icon} {cat?.name}
                        </span>
                      </td>
                      <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums", status === "out" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-slate-800")}>
                        {product.stock_quantity}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{product.primary_unit}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{formatPeso(product.cost_price)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">{formatPeso(product.selling_price)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {status === "out" ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 shadow-none text-xs whitespace-nowrap">Out of Stock</Badge>
                        ) : status === "low" ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none text-xs whitespace-nowrap">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200 shadow-none text-xs whitespace-nowrap">In Stock</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-5xl">🔍</span>
                        <p className="text-base font-semibold text-slate-700">No results found</p>
                        <p className="text-sm text-slate-400 max-w-xs">
                          {anyFilterActive || searchQuery
                            ? "Try adjusting your search or clearing column filters."
                            : "No products in your catalog yet."}
                        </p>
                        {(anyFilterActive || searchQuery) && (
                          <Button variant="outline" size="sm" onClick={() => { handleClearAll(); setSearchQuery(""); }} className="mt-1 text-xs">
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const cat = categories.find((c) => c.id === product.category_id);
            const status = getStockStatus(product);
            return (
              <Card
                key={product.id}
                className="rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => setSelectedProduct(product)}
                data-testid={`product-card-${product.id}`}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl flex-shrink-0">
                      {product.image_placeholder}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 px-1.5 py-0 whitespace-nowrap">{product.sku}</Badge>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded mt-1 inline-block" style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}>
                        {cat?.icon} {cat?.name}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div>
                          <p className="text-xs text-slate-400">Stock</p>
                          <p className={cn("font-bold", status === "out" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-green-600")}>
                            {product.stock_quantity} <span className="text-xs font-normal opacity-70">{product.primary_unit}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Price</p>
                          <p className="font-bold text-slate-900">{formatPeso(product.selling_price)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {(status === "out" || status === "low") && (
                    <div className={cn("px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 border-t", status === "out" ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", status === "out" ? "bg-red-500" : "bg-amber-500")} />
                      {status === "out" ? "Out of Stock" : "Low Stock Alert"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center gap-3">
              <span className="text-5xl">🔍</span>
              <p className="text-base font-semibold text-slate-700">No results found</p>
              <p className="text-sm text-slate-400">Try adjusting your search or clearing column filters.</p>
              {(anyFilterActive || searchQuery) && (
                <Button variant="outline" size="sm" onClick={() => { handleClearAll(); setSearchQuery(""); }} className="mt-1 text-xs">
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <AddProductModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleProductSaved}
      />

      <ProductSlideover
        product={selectedProduct}
        allConversions={allConversions}
        onClose={() => setSelectedProduct(null)}
        onStockUpdated={handleStockUpdated}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
        data-testid="fab-add-product"
        aria-label="Add Product"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
