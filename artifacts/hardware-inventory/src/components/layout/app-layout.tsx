import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ArrowUpDown,
  Menu,
  Store,
  ChevronDown,
  Settings,
  Users,
  LogOut,
  Camera,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { currentUser, stores } from "@/lib/mock-data";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import OfflineBanner from "@/components/layout/offline-banner";
import PwaInstallPrompt from "@/components/layout/pwa-install-prompt";
import { useOffline } from "@/lib/offline-context";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: ArrowUpDown, label: "Movements", href: "/movements" },
  { icon: Camera, label: "Scan", href: "/scan" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
];

const bottomNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: ArrowUpDown, label: "Movements", href: "/movements" },
  { icon: Camera, label: "Scan", href: "/scan" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
];

const allNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: ArrowUpDown, label: "Movements", href: "/movements" },
  { icon: Camera, label: "Scan", href: "/scan" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
  { icon: Users, label: "Suppliers", href: "/suppliers" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

function StatusDot() {
  const { isOffline, isSyncing } = useOffline();
  return (
    <div
      className={cn(
        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-500",
        isOffline
          ? "bg-gray-400"
          : isSyncing
          ? "bg-yellow-400 animate-[pulse_0.6s_ease-in-out_infinite]"
          : "bg-green-400 animate-pulse"
      )}
      title={isOffline ? "Offline" : isSyncing ? "Syncing..." : "Online"}
      data-testid="status-dot"
      aria-label={isOffline ? "Offline mode" : isSyncing ? "Syncing" : "Online"}
    />
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState(stores[0]);

  useEffect(() => {
    const savedStoreId = localStorage.getItem("hw_store_id");
    if (savedStoreId) {
      const store = stores.find((s) => s.id === savedStoreId);
      if (store) setCurrentStore(store);
    }
  }, []);

  const handleStoreChange = (store: typeof stores[0]) => {
    setCurrentStore(store);
    localStorage.setItem("hw_store_id", store.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("hw_logged_in");
    setLocation("/login");
  };

  const getPageTitle = () => {
    const item = allNavItems.find(
      (i) => location === i.href || (i.href !== "/" && location.startsWith(`${i.href}/`))
    );
    if (location.startsWith("/more/bir-export")) return "BIR Export";
    if (location.startsWith("/reorders")) return "Suggested reorders";
    return item ? item.label : "Hardware Inventory Pro";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-900 border-r-2 border-slate-200">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-4xl">🔧</span>
          <span className="font-extrabold text-xl leading-tight tracking-tight">
            Hardware<br />Inventory Pro
          </span>
        </div>

        <nav className="space-y-3">
          {mainNavItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-lg transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("h-6 w-6", isActive ? "stroke-[3px]" : "stroke-2")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t-2 border-slate-100">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 mb-4 border-2 border-slate-100">
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-lg">
              {currentUser.avatar_initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-base font-bold text-slate-900 truncate">{currentUser.name}</span>
            <span className="text-sm text-slate-500 truncate font-medium">{currentStore.branch_name}</span>
          </div>
          <StatusDot />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 h-14 text-lg font-bold"
          onClick={handleLogout}
        >
          <LogOut className="h-6 w-6 mr-4" />
          Log Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-[100dvh]">
        {/* Offline Banner (top sticky) */}
        <OfflineBanner />

        {/* Mobile/Desktop Header */}
        <header className="sticky top-0 z-40 bg-white border-b-2 border-slate-200 h-20 flex items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 text-slate-600 h-12 w-12">
                  <Menu className="h-8 w-8" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 border-r-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="font-bold text-slate-900 text-xl truncate">
              {getPageTitle()}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <span className="font-extrabold text-slate-900 text-2xl tracking-tight">
              {getPageTitle()}
            </span>
            <StatusDot />
          </div>

          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden sm:flex items-center gap-3 border-2 border-slate-200 text-slate-700 bg-slate-50 h-12 px-5 font-bold"
                >
                  <Store className="h-5 w-5" />
                  <span className="truncate max-w-[180px]">{currentStore.branch_name}</span>
                  <ChevronDown className="h-5 w-5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                {stores.map((store) => (
                  <DropdownMenuItem
                    key={store.id}
                    onClick={() => handleStoreChange(store)}
                    className={cn(
                      "py-3 px-4 rounded-lg text-base font-medium",
                      currentStore.id === store.id && "bg-blue-50 text-blue-700 font-bold"
                    )}
                  >
                    {store.branch_name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="md:hidden flex items-center gap-3">
              <StatusDot />
              <Avatar className="h-10 w-10 border-2 border-slate-200 shadow-sm">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-bold">
                  {currentUser.avatar_initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-10 pb-32 md:pb-12 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t-2 border-slate-200 flex justify-around items-center h-20 px-2 pb-safe z-40" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
          {bottomNavItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full space-y-1.5 transition-all",
                  isActive ? "text-blue-700" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn("h-7 w-7", isActive && "fill-blue-100 stroke-[2.5px]")}
                />
                <span className={cn("text-xs font-bold", isActive ? "opacity-100" : "opacity-80")}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* PWA Install Prompt (bottom) */}
        <PwaInstallPrompt />
      </div>
    </div>
  );
}
