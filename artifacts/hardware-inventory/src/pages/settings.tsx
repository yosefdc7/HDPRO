import { useState } from "react";
import { Store, User, Shield, Info, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { currentUser, stores } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [storeName, setStoreName] = useState(stores[0].store_name);
  const [branchName, setBranchName] = useState(stores[0].branch_name);
  const [address, setAddress] = useState(stores[0].address);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings Saved",
      description: "Your store settings have been updated.",
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your store and account preferences</p>
      </div>

      {/* Store Settings */}
      <Card className="rounded-xl shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <Store className="h-5 w-5 text-blue-600" /> Store Information
          </CardTitle>
          <CardDescription>Update your hardware store details shown on receipts and reports.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form id="store-form" onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="font-bold text-slate-700">Business Name</Label>
              <Input id="storeName" value={storeName} onChange={e => setStoreName(e.target.value)} className="border-slate-200 focus-visible:ring-blue-600 h-11" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchName" className="font-bold text-slate-700">Branch Name</Label>
                <Input id="branchName" value={branchName} onChange={e => setBranchName(e.target.value)} className="border-slate-200 focus-visible:ring-blue-600 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId" className="font-bold text-slate-700">TIN (Optional)</Label>
                <Input id="taxId" placeholder="000-000-000-000" className="border-slate-200 focus-visible:ring-blue-600 h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="font-bold text-slate-700">Address</Label>
              <Input id="address" value={address} onChange={e => setAddress(e.target.value)} className="border-slate-200 focus-visible:ring-blue-600 h-11" />
            </div>
          </form>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-end p-4">
          <Button type="submit" form="store-form" className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </CardFooter>
      </Card>

      {/* User Profile (Read Only Demo) */}
      <Card className="rounded-xl shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <User className="h-5 w-5 text-amber-500" /> Your Profile
          </CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-2xl font-bold border-4 border-white shadow-md">
              {currentUser.avatar_initials}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">{currentUser.name}</h3>
              <p className="text-slate-500">{currentUser.email}</p>
              <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit border border-emerald-200">
                <Shield className="h-3 w-3" /> System {currentUser.role.toUpperCase()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="rounded-xl shadow-sm border-slate-200 bg-slate-50">
        <CardContent className="p-6 flex items-start gap-4 text-slate-500">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold text-slate-700">Hardware Inventory Pro v1.0.0</p>
            <p>Frontend-only demonstration build. No backend services connected.</p>
            <p className="mt-2 text-xs text-slate-400">© 2026 Crafted for Philippine Hardware Stores.</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
