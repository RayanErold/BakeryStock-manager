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
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { ClerkTokenBridge } from "@/components/ClerkTokenBridge";

const IS_CLERK_MODE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AppRoutes() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const { lang } = useAppContext();

  const handleSignOut = () => {
    if (IS_CLERK_MODE) {
      // Clerk manages session; redirect to Clerk's sign-out flow
      window.location.href = "/?clerk_sign_out=1";
    } else {
      localStorage.removeItem("dev_clerk_id");
      queryClient.clear();
      window.location.reload();
    }
  };

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

  if (isError || !user) {
    return (
      <LoginPage
        onLogin={() => {
          queryClient.invalidateQueries({ queryKey: ["current-user"] });
        }}
      />
    );
  }

  return (
    <Layout user={user} onSignOut={handleSignOut}>
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
        {/* Register Clerk JWT getter only when running under ClerkProvider */}
        {IS_CLERK_MODE && <ClerkTokenBridge />}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
