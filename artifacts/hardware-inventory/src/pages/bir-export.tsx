import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, FileText, Info, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getProducts } from "@/lib/store";
import { stores } from "@/lib/mock-data";
import { formatPeso } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useOffline } from "@/lib/offline-context";

function getCurrentYearEnd(): string {
  const year = new Date().getFullYear();
  return `${year}-12-31`;
}

export default function BirExportPage() {
  const { isOffline } = useOffline();
  const [inventoryDate, setInventoryDate] = useState(getCurrentYearEnd());
  const [storeId, setStoreId] = useState(stores[0].id);
  const [tin, setTin] = useState("");
  const [businessName, setBusinessName] = useState(stores[0].store_name);

  const selectedStore = stores.find((s) => s.id === storeId) ?? stores[0];

  const activeProducts = useMemo(() => {
    return getProducts().filter((p) => p.is_active && p.stock_quantity > 0);
  }, []);

  const totalValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + p.stock_quantity * p.cost_price, 0);
  }, [activeProducts]);

  function downloadCSV() {
    const formattedDate = new Date(inventoryDate).toLocaleDateString("en-PH", {
      month: "long", day: "numeric", year: "numeric"
    });

    const header = ["Item No.", "Description", "Unit", "Quantity", "Unit Cost (PHP)", "Total Cost (PHP)"];
    const rows = activeProducts.map((p, i) => [
      i + 1,
      p.name,
      p.primary_unit,
      p.stock_quantity,
      p.cost_price.toFixed(2),
      (p.stock_quantity * p.cost_price).toFixed(2),
    ]);
    const totalsRow = ["", "TOTAL INVENTORY VALUE", "", "", "", totalValue.toFixed(2)];
    const metaRows = [
      [`BIR Annual Inventory List`],
      [`Business: ${businessName}`],
      [`Branch: ${selectedStore.branch_name}`],
      [`TIN: ${tin || "(not provided)"}`],
      [`Inventory as of: ${formattedDate}`],
      [],
    ];

    const allRows = [...metaRows, header, ...rows, totalsRow];
    const csv = allRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BIR_Inventory_${inventoryDate.replace(/-/g, "")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded!", description: "Your BIR inventory list has been saved.", variant: "success" });
  }

  function downloadPDF() {
    toast({ title: "Coming Soon", description: "PDF generation will be available in the next update.", variant: "default" });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/more">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-200 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📋 BIR Inventory List Generator</h1>
          <p className="text-slate-500 text-sm">Generate your annual inventory list per Revenue Memorandum Circular No. 8-2023</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Required BIR Submission</p>
          <p className="text-sm text-blue-700 mt-0.5">
            All businesses must submit an inventory list to BIR every January. This tool generates the format per Annex A.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="rounded-xl shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900">Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Inventory as of *</Label>
              <Input
                type="date"
                value={inventoryDate}
                onChange={(e) => setInventoryDate(e.target.value)}
                data-testid="inventory-date"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Store / Branch *</Label>
              <select
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  const store = stores.find((s) => s.id === e.target.value);
                  if (store) setBusinessName(store.store_name);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="store-select"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.store_name} — {s.branch_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">TIN</Label>
              <Input
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                placeholder="XXX-XXX-XXX-XXX"
                data-testid="tin-input"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                data-testid="business-name-input"
              />
            </div>

            {isOffline && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                <WifiOff className="h-4 w-4 flex-shrink-0" />
                <span>Export is unavailable while offline. Data is saved locally.</span>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button
                      onClick={isOffline ? () => toast({ title: "Unavailable offline", description: "Connect to the internet to download your BIR export.", variant: "destructive" }) : downloadCSV}
                      className={`bg-blue-700 hover:bg-blue-800 text-white gap-2 w-full ${isOffline ? "opacity-60" : ""}`}
                      data-testid="download-csv"
                    >
                      {isOffline ? <WifiOff className="h-4 w-4" /> : <Download className="h-4 w-4" />} Download CSV
                    </Button>
                  </span>
                </TooltipTrigger>
                {isOffline && <TooltipContent>Connect to internet to download</TooltipContent>}
              </Tooltip>
              <Button onClick={downloadPDF} variant="outline" className="gap-2 w-full" data-testid="download-pdf">
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Preview — {activeProducts.length} items
              </CardTitle>
              <div className="text-xs text-slate-500 space-y-0.5 mt-1">
                <p>{businessName} · {selectedStore.branch_name}</p>
                <p>As of: {new Date(inventoryDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</p>
                {tin && <p>TIN: {tin}</p>}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Item No.", "Description", "Unit", "Quantity", "Unit Cost (₱)", "Total Cost (₱)"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeProducts.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50" data-testid={`bir-row-${p.id}`}>
                        <td className="px-4 py-2 text-slate-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">{p.name}</td>
                        <td className="px-4 py-2 text-slate-600">{p.primary_unit}</td>
                        <td className="px-4 py-2 text-slate-900 font-semibold text-right">{p.stock_quantity.toLocaleString()}</td>
                        <td className="px-4 py-2 text-slate-900 text-right">{formatPeso(p.cost_price)}</td>
                        <td className="px-4 py-2 text-slate-900 font-medium text-right">{formatPeso(p.stock_quantity * p.cost_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={5} className="px-4 py-3 font-bold text-slate-900 text-sm">TOTAL INVENTORY VALUE</td>
                      <td className="px-4 py-3 font-bold text-slate-900 text-right text-sm">{formatPeso(totalValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
