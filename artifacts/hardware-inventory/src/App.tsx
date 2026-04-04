import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import ProductDetailPage from "@/pages/product-detail";
import MovementsPage from "@/pages/movements";
import SuppliersPage from "@/pages/suppliers";
import SettingsPage from "@/pages/settings";
import ScanPage from "@/pages/scan";
import MorePage from "@/pages/more";
import BirExportPage from "@/pages/bir-export";
import AppLayout from "@/components/layout/app-layout";
import AuthGuard from "@/components/layout/auth-guard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <AuthGuard>
          <Switch>
            <Route path="/scan" component={ScanPage} />
            <Route>
              <AppLayout>
                <Switch>
                  <Route path="/" component={DashboardPage} />
                  <Route path="/dashboard" component={DashboardPage} />
                  <Route path="/products/:id" component={ProductDetailPage} />
                  <Route path="/products" component={ProductsPage} />
                  <Route path="/movements" component={MovementsPage} />
                  <Route path="/more/bir-export" component={BirExportPage} />
                  <Route path="/more" component={MorePage} />
                  <Route path="/suppliers" component={SuppliersPage} />
                  <Route path="/settings" component={SettingsPage} />
                </Switch>
              </AppLayout>
            </Route>
          </Switch>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
