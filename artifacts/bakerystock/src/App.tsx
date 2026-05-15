import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthGuard({
  children,
  ownerOnly = false,
}: {
  children: React.ReactNode;
  ownerOnly?: boolean;
}) {
  const { data: user, isLoading } = useCurrentUser();
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

  if (ownerOnly && user?.role !== "owner") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Layout user={user ?? null} onSignOut={() => {}}>
      {children}
    </Layout>
  );
}

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/inventory">
        <AuthGuard><InventoryPage /></AuthGuard>
      </Route>
      <Route path="/movements">
        <AuthGuard><MovementsPage /></AuthGuard>
      </Route>
      <Route path="/audit">
        <AuthGuard ownerOnly><AuditPage /></AuthGuard>
      </Route>
      <Route path="/branches">
        <AuthGuard ownerOnly><BranchesPage /></AuthGuard>
      </Route>
      <Route path="/staff">
        <AuthGuard ownerOnly><StaffPage /></AuthGuard>
      </Route>
      <Route path="/reports">
        <AuthGuard ownerOnly><ReportsPage /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </AppProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
