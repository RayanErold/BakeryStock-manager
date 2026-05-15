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
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { useClerk } from "@clerk/react";
import { ClerkTokenBridge } from "@/components/ClerkTokenBridge";

const IS_CLERK_MODE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Module-level ref populated by ClerkSignOutBridge when Clerk is active.
let _clerkSignOut: ((opts?: { redirectUrl?: string }) => Promise<void>) | null = null;

/**
 * Registers the Clerk signOut function so it can be called from any sign-out
 * handler without having to call useClerk() in non-Clerk code paths.
 *
 * This component is only rendered when IS_CLERK_MODE is true (i.e. inside
 * ClerkProvider), so useClerk() is always called within its required context.
 * When IS_CLERK_MODE is false the component is never mounted and hooks are
 * never invoked — React's rules-of-hooks apply per render, not per import.
 */
function ClerkSignOutBridge() {
  const { signOut } = useClerk();

  useEffect(() => {
    _clerkSignOut = signOut;
    return () => {
      _clerkSignOut = null;
    };
  }, [signOut]);

  return null;
}

/** Navigate to a route without re-mounting the whole app. */
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function AuthGuard({
  children,
  ownerOnly = false,
}: {
  children: React.ReactNode;
  /** When true, staff members are redirected to /dashboard. */
  ownerOnly?: boolean;
}) {
  const { data: user, isLoading, isError } = useCurrentUser();
  const { lang } = useAppContext();
  const [location] = useLocation();

  const handleSignOut = async () => {
    if (IS_CLERK_MODE && _clerkSignOut) {
      await _clerkSignOut({ redirectUrl: "/login" });
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
    return <Redirect to={`/login${location !== "/" ? `?next=${encodeURIComponent(location)}` : ""}`} />;
  }

  // Client-side role guard: staff cannot access owner-only pages
  if (ownerOnly && user.role !== "owner") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Layout user={user} onSignOut={handleSignOut}>
      {children}
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public login route */}
      <Route path="/login">
        <LoginWithRedirect />
      </Route>

      {/* Dashboard — explicit /dashboard path */}
      <Route path="/dashboard">
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>

      {/* Root redirects to /dashboard */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      {/* Authenticated pages */}
      <Route path="/inventory">
        <AuthGuard>
          <InventoryPage />
        </AuthGuard>
      </Route>
      <Route path="/movements">
        <AuthGuard>
          <MovementsPage />
        </AuthGuard>
      </Route>
      <Route path="/audit">
        <AuthGuard ownerOnly>
          <AuditPage />
        </AuthGuard>
      </Route>
      <Route path="/branches">
        <AuthGuard ownerOnly>
          <BranchesPage />
        </AuthGuard>
      </Route>
      <Route path="/staff">
        <AuthGuard ownerOnly>
          <StaffPage />
        </AuthGuard>
      </Route>
      <Route path="/reports">
        <AuthGuard ownerOnly>
          <ReportsPage />
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

/** Login page that redirects to /dashboard (or ?next=) if already authenticated. */
function LoginWithRedirect() {
  const { data: user, isLoading } = useCurrentUser();
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const next = params.get("next") ?? "/dashboard";

  if (isLoading) return null;
  if (user) return <Redirect to={next} />;

  return (
    <LoginPage
      onLogin={() => {
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
      }}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        {/* Register Clerk JWT getter — mounted only when ClerkProvider is in the tree */}
        {IS_CLERK_MODE && <ClerkTokenBridge />}
        {/* Register Clerk signOut function for use in handleSignOut */}
        {IS_CLERK_MODE && <ClerkSignOutBridge />}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
