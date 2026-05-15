import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/contexts/AppContext";
import { queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import InventoryPage from "@/pages/inventory";
import MovementsPage from "@/pages/movements";
import AuditPage from "@/pages/audit";
import BranchesPage from "@/pages/branches";
import StaffPage from "@/pages/staff";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";

function AppRoutes() {
  const { data: user, isLoading, error } = useCurrentUser();
  const { lang } = useAppContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">BS</span>
          </div>
          <p className="text-muted-foreground text-sm">{t(lang, "loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">BS</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BakeryStock</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {lang === "fr"
                ? "Gestion d'inventaire intelligente pour votre boulangerie"
                : "Smart inventory management for your bakery"}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {lang === "fr"
              ? "Connectez votre compte Clerk pour accéder à l'application."
              : "Connect your Clerk account to access the application."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/movements" component={MovementsPage} />
        <Route path="/audit" component={AuditPage} />
        <Route path="/branches" component={BranchesPage} />
        <Route path="/staff" component={StaffPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
