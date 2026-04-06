import { useState } from "react";
import { Mail, Phone, MapPin, Building2, Package, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { suppliers } from "@/lib/mock-data";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase()) ||
    s.products.some(p => p.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <p className="text-slate-500 text-sm">Manage your supply chain contacts</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Search suppliers, contacts, or products..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 bg-white border-slate-200 rounded-xl shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => (
          <Card key={supplier.id} className="rounded-xl shadow-sm border-slate-200 hover:border-blue-300 transition-colors">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 rounded-t-xl">
              <div className="flex items-start gap-3">
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-blue-600 shadow-sm mt-1">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 leading-tight">
                    {supplier.name}
                  </CardTitle>
                  <p className="text-sm font-medium text-slate-500 mt-1">{supplier.contact}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${supplier.phone}`} className="hover:text-blue-600 hover:underline">{supplier.phone}</a>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${supplier.email}`} className="hover:text-blue-600 hover:underline truncate">{supplier.email}</a>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Key Products
                </p>
                <div className="flex flex-wrap gap-2">
                  {supplier.products.map((p, i) => (
                    <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 font-medium">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No suppliers found.
          </div>
        )}
      </div>
    </div>
  );
}
