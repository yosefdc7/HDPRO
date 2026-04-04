import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useOffline } from "@/lib/offline-context";
import {
  Store,
  Users,
  FileText,
  RefreshCw,
  User,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getSuppliers,
  saveSuppliers,
  getConversions,
  getProducts,
  type Supplier,
} from "@/lib/store";
import { stores, currentUser } from "@/lib/mock-data";
import { formatPeso, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Supplier Modal ───────────────────────────────────────────────────────────

function AddSupplierModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name required";
    if (!phone.trim()) errs.phone = "Phone required";
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const newSupplier: Supplier = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      contact: contact.trim(),
      phone: phone.trim(),
      email: email.trim(),
      products: [],
    };
    const existing = getSuppliers();
    saveSuppliers([...existing, newSupplier]);
    toast({ title: "Supplier added!", description: `${newSupplier.name} has been saved.`, variant: "success" });
    onSave();
    handleClose();
  }

  function handleClose() {
    setName(""); setContact(""); setPhone(""); setEmail(""); setErrors({});
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs mb-1 block">Company Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eagle Cement Corp" className={cn(errors.name && "border-red-400")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-xs mb-1 block">Contact Person</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Juan Dela Cruz" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-8888-1234" className={cn(errors.phone && "border-red-400")} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
          <div>
            <Label className="text-xs mb-1 block">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@email.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-700 hover:bg-blue-800 text-white">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function SuppliersView() {
  const [suppliers, setSuppliers] = useState(() => getSuppliers());
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">📦 Suppliers Directory</h2>
        <Button size="sm" onClick={() => setShowModal(true)} className="bg-blue-700 hover:bg-blue-800 text-white gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Supplier
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {suppliers.map((s) => (
          <div key={s.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              data-testid={`supplier-row-${s.id}`}
            >
              <div>
                <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
                <p className="text-xs text-slate-500">{s.contact} · {s.phone}</p>
              </div>
              {expandedId === s.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {expandedId === s.id && (
              <div className="px-4 pb-3 bg-slate-50 text-sm text-slate-600 space-y-1 border-t border-slate-100 animate-in fade-in duration-200">
                {s.email && <p>📧 {s.email}</p>}
                {s.products.length > 0 && <p>📦 Products: {s.products.join(", ")}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <AddSupplierModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => setSuppliers(getSuppliers())}
      />
    </div>
  );
}

function UnitConversionsView() {
  const conversions = getConversions();
  const products = getProducts();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">🔄 Unit Conversions</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Product", "From", "To", "Factor"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-600">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversions.map((c) => {
                const product = products.find((p) => p.id === c.product_id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{product?.image_placeholder}</span>
                        <span className="font-medium text-slate-900 text-xs">{product?.name ?? c.product_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-600 font-medium">1 {c.from_unit}</td>
                    <td className="px-4 py-2 text-slate-600">{c.to_unit}</td>
                    <td className="px-4 py-2 text-blue-700 font-bold">{c.factor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {conversions.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">No unit conversions defined.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">👤 Profile</h2>
      <Card className="rounded-xl border-slate-200">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center border-2 border-blue-200">
            {currentUser.avatar_initials}
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{currentUser.name}</p>
            <p className="text-sm text-slate-500">{currentUser.email}</p>
            <Badge className="mt-1 bg-blue-100 text-blue-700 shadow-none text-xs capitalize">{currentUser.role}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StoreSettingsView() {
  const store = stores[0];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">🏪 Store Settings</h2>
      <Card className="rounded-xl border-slate-200">
        <CardContent className="p-6 space-y-4">
          {[
            { label: "Store Name", value: store.store_name },
            { label: "Branch", value: store.branch_name },
            { label: "Address", value: store.address },
          ].map(({ label, value }) => (
            <div key={label}>
              <Label className="text-xs text-slate-500">{label}</Label>
              <Input value={value} readOnly className="mt-1 bg-slate-50" />
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={() => toast({ title: "Settings saved", description: "Store info updated successfully.", variant: "success" })}>
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HelpView() {
  const faqs = [
    { q: "How do I add a new product?", a: 'Go to the Products page and click "Add Product". Fill in the required fields and click Save.' },
    { q: "How do I record a stock movement?", a: "Use the Stock Movements page and click \"Record Movement\". You can also use the Stock In / Stock Out buttons directly on a product's detail panel." },
    { q: "How do I export for BIR?", a: 'Go to More → BIR Export. Fill in your TIN and inventory date, then click "Download CSV" to get the formatted file.' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">❓ Help & Support</h2>
      <Card className="rounded-xl border-slate-200">
        <CardContent className="p-5 space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
            📧 Support: <a href="mailto:support@hwinventory.ph" className="font-medium underline">support@hwinventory.ph</a>
          </div>
          <h3 className="text-sm font-semibold text-slate-700">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-slate-200 rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-slate-800 py-3">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 pb-3">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function AboutView() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">ℹ️ About</h2>
      <Card className="rounded-xl border-slate-200">
        <CardContent className="p-8 text-center space-y-3">
          <div className="text-5xl">🔧</div>
          <h3 className="text-xl font-bold text-slate-900">Hardware Inventory Pro</h3>
          <Badge className="bg-blue-100 text-blue-700 shadow-none">v1.0.0 MVP</Badge>
          <p className="text-sm text-slate-500">Built for Filipino Hardware Stores 🇵🇭</p>
          <p className="text-xs text-slate-400 mt-4">RJ Hardware & Construction Supply<br/>Empowering local hardware businesses with smart inventory management.</p>
        </CardContent>
      </Card>
      {!isStandalone && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-2xl flex-shrink-0">📱</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">Install as App</p>
            <p className="text-xs text-blue-700 mt-1">
              On Android: tap the browser menu and select "Add to Home Screen". On iOS Safari: tap the Share button then "Add to Home Screen".
            </p>
          </div>
        </div>
      )}
      {isStandalone && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-semibold text-green-800">App is installed on this device</p>
        </div>
      )}
    </div>
  );
}

// ─── Main More Page ───────────────────────────────────────────────────────────

type SubView = "suppliers" | "unit-conversions" | "profile" | "store-settings" | "help" | "about" | null;

export default function MorePage() {
  const [, navigate] = useLocation();
  const [subView, setSubView] = useState<SubView>(null);
  const [langToggle, setLangToggle] = useState(false);
  const { simulateOffline, setSimulateOffline } = useOffline();

  function handleLogout() {
    localStorage.removeItem("hw_logged_in");
    navigate("/login");
  }

  if (subView === "suppliers") return <div className="animate-in fade-in duration-300"><button onClick={() => setSubView(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">← Back</button><SuppliersView /></div>;
  if (subView === "unit-conversions") return <div className="animate-in fade-in duration-300"><button onClick={() => setSubView(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">← Back</button><UnitConversionsView /></div>;
  if (subView === "profile") return <div className="animate-in fade-in duration-300"><button onClick={() => setSubView(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">← Back</button><ProfileView /></div>;
  if (subView === "store-settings") return <div className="animate-in fade-in duration-300"><button onClick={() => setSubView(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">← Back</button><StoreSettingsView /></div>;
  if (subView === "help") return <div className="animate-in fade-in duration-300"><button onClick={() => setSubView(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">← Back</button><HelpView /></div>;
  if (subView === "about") return <div className="animate-in fade-in duration-300"><button onClick={() => setSubView(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">← Back</button><AboutView /></div>;

  const MenuGroup = ({ title, items }: { title: string; items: { icon: string; label: string; sublabel?: string; onClick: () => void; rightEl?: React.ReactNode }[] }) => (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">{title}</p>
      <Card className="rounded-xl border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {items.map(({ icon, label, sublabel, onClick, rightEl }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left"
              data-testid={`more-item-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <span className="text-xl w-8 text-center">{icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{label}</p>
                {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
              </div>
              {rightEl ?? <ChevronRight className="h-4 w-4 text-slate-300" />}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">More</h1>
        <p className="text-slate-500 text-sm">Settings and tools</p>
      </div>

      <MenuGroup
        title="Store"
        items={[
          { icon: "🏪", label: "Store Settings", sublabel: "Branch info & details", onClick: () => setSubView("store-settings") },
          { icon: "📦", label: "Suppliers Directory", sublabel: `${getSuppliers().length} suppliers`, onClick: () => setSubView("suppliers") },
        ]}
      />

      <MenuGroup
        title="Reports"
        items={[
          {
            icon: "📋",
            label: "BIR Export",
            sublabel: "Annual inventory list",
            onClick: () => navigate("/more/bir-export"),
          },
          {
            icon: "🔄",
            label: "Unit Conversions",
            sublabel: "Reference conversion table",
            onClick: () => setSubView("unit-conversions"),
          },
        ]}
      />

      <MenuGroup
        title="Account"
        items={[
          { icon: "👤", label: "Profile", sublabel: currentUser.name, onClick: () => setSubView("profile") },
          {
            icon: "🌐",
            label: "Language",
            sublabel: langToggle ? "Filipino / Tagalog" : "English",
            onClick: () => {
              setLangToggle(!langToggle);
              toast({ title: "Language setting saved", description: langToggle ? "Language set to English" : "Wika naitakda sa Filipino", variant: "success" });
            },
            rightEl: (
              <div className={cn("w-10 h-6 rounded-full transition-colors relative flex-shrink-0", langToggle ? "bg-blue-600" : "bg-slate-200")}>
                <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", langToggle ? "translate-x-4.5 left-0.5" : "left-0.5")} />
              </div>
            ),
          },
          { icon: "❓", label: "Help & Support", onClick: () => setSubView("help") },
          { icon: "ℹ️", label: "About", sublabel: "Hardware Inventory Pro v1.0.0", onClick: () => setSubView("about") },
        ]}
      />

      <MenuGroup
        title="Developer Tools"
        items={[
          {
            icon: "📡",
            label: "Simulate Offline Mode",
            sublabel: simulateOffline ? "Currently: Offline" : "Currently: Online",
            onClick: () => {
              const next = !simulateOffline;
              setSimulateOffline(next);
              toast({
                title: next ? "Offline mode enabled" : "Offline mode disabled",
                description: next
                  ? "The app is now simulating offline behavior."
                  : "Reconnected — data is syncing.",
                variant: next ? "destructive" : "success",
              });
            },
            rightEl: (
              <div
                className={cn("w-10 h-6 rounded-full transition-colors relative flex-shrink-0", simulateOffline ? "bg-amber-500" : "bg-slate-200")}
                data-testid="simulate-offline-toggle"
              >
                <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", simulateOffline ? "translate-x-4 left-0.5" : "left-0.5")} />
              </div>
            ),
          },
        ]}
      />

      <div className="pt-2">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 gap-2"
          data-testid="logout-btn"
        >
          <LogOut className="h-4 w-4" />
          🚪 Log Out
        </Button>
      </div>
    </div>
  );
}
