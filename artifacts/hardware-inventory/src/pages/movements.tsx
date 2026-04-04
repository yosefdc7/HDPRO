import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowUpDown, Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stockMovements } from "@/lib/mock-data";
import { formatPeso, formatDate, cn } from "@/lib/utils";

export default function MovementsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [movements, setMovements] = useState(stockMovements);

  // Load merged movements (mock + local)
  useEffect(() => {
    const local = localStorage.getItem("hw_movements");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        // Put local first (assuming they are newer)
        setMovements([...parsed, ...stockMovements]);
      } catch(e) {
        console.error(e);
      }
    }
  }, []);

  const filteredMovements = movements.filter(m => {
    const matchesSearch = 
      m.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.note.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || m.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getMovementIcon = (type: string) => {
    switch(type) {
      case 'in': return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">IN</div>;
      case 'out': return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">OUT</div>;
      case 'adjustment': return <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-[10px]">ADJ</div>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative min-h-[80vh]">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Movements</h1>
          <p className="text-slate-500 text-sm">Track inventory coming in and out</p>
        </div>
        <Link href="/movements/new" className="hidden sm:block">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Movement
          </Button>
        </Link>
      </div>

      <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search by product name, note..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200 text-sm rounded-lg w-full max-w-md"
            />
          </div>
          
          <Tabs defaultValue="all" onValueChange={setFilterType} className="w-full">
            <TabsList className="bg-slate-100 p-1 h-auto rounded-lg">
              <TabsTrigger value="all" className="rounded-md text-sm py-1.5 px-4">All</TabsTrigger>
              <TabsTrigger value="in" className="rounded-md text-sm py-1.5 px-4 text-green-700 data-[state=active]:text-green-700">In (Receive)</TabsTrigger>
              <TabsTrigger value="out" className="rounded-md text-sm py-1.5 px-4 text-blue-700 data-[state=active]:text-blue-700">Out (Issue)</TabsTrigger>
              <TabsTrigger value="adjustment" className="rounded-md text-sm py-1.5 px-4 text-amber-700 data-[state=active]:text-amber-700">Adjustments</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 hidden md:table-cell">Note</th>
                <th className="px-4 py-3 hidden sm:table-cell">By</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 w-16">{getMovementIcon(m.type)}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{m.product_name}</p>
                    <p className="text-xs text-slate-500 md:hidden mt-1 truncate max-w-[150px]">{m.note}</p>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={cn(
                      "font-bold text-base",
                      m.type === 'in' ? "text-green-600" : m.type === 'out' ? "text-blue-600" : "text-amber-600"
                    )}>
                      {m.type === 'out' ? '-' : '+'}{m.quantity}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{m.unit}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600 max-w-[250px] truncate" title={m.note}>
                    {m.note}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-600 font-medium">
                    {m.by}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                    {formatDate(m.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredMovements.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <ArrowUpDown className="h-10 w-10 mx-auto text-slate-300 mb-3 opacity-50" />
              <p>No movements found matching your criteria.</p>
            </div>
          )}
        </div>
      </Card>

      {/* FAB for Mobile */}
      <Link href="/movements/new" className="sm:hidden fixed bottom-20 right-4 z-50">
        <Button size="icon" className="w-14 h-14 rounded-full bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
