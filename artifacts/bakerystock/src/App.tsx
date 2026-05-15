import { useEffect, useRef } from "react";
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
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { useQueryClient as useTanstackQueryClient } from "@tanstack/react-query";
import { ClerkTokenBridge } from "@/components/ClerkTokenBridge";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  ? publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    )
  : undefined;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#D97706",
    colorForeground: "#78350F",
    colorMutedForeground: "#92400E",
    colorDanger: "#DC2626",
    colorBackground: "#FFFBEB",
    colorInput: "#FEF3C7",
    colorInputForeground: "#78350F",
    colorNeutral: "#D6D3D1",
    fontFamily: "Outfit, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-amber-50 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg border border-amber-100",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-amber-900 font-bold",
    headerSubtitle: "text-amber-700",
    socialButtonsBlockButtonText: "text-amber-900",
    formFieldLabel: "text-amber-800",
    footerActionLink: "text-amber-600",
    footerActionText: "text-amber-700",
    dividerText: "text-amber-600",
    identityPreviewEditButton: "text-amber-600",
    formFieldSuccessText: "text-green-600",
    alertText: "text-amber-900",
    logoBox: "mb-1",
    logoImage: "w-12 h-12",
    socialButtonsBlockButton: "border-amber-200 hover:bg-amber-100",
    formButtonPrimary: "bg-amber-600 hover:bg-amber-700 text-white",
    formFieldInput: "border-amber-200 bg-white text-amber-900",
    footerAction: "bg-amber-50",
    dividerLine: "bg-amber-200",
    alert: "bg-amber-50 border-amber-200",
    otpCodeFieldInput: "border-amber-200",
    formFieldRow: "",
    main: "",
  },
};

/** Navigate to a route without re-mounting the whole app. */
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">BakeryStock</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to manage your bakery inventory
          </p>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">BakeryStock</h1>
          <p className="text-muted-foreground text-sm">
            Create an account to get started
          </p>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const tanstackQueryClient = useTanstackQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        tanstackQueryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, tanstackQueryClient]);

  return null;
}

function AuthGuard({
  children,
  ownerOnly = false,
}: {
  children: React.ReactNode;
  ownerOnly?: boolean;
}) {
  const { data: user, isLoading, isError } = useCurrentUser();
  const { lang } = useAppContext();
  const { signOut } = useClerk();
  const [location] = useLocation();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: `${basePath}/sign-in` });
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
    const next = location !== "/" ? `?next=${encodeURIComponent(location)}` : "";
    return <Redirect to={`/sign-in${next}`} />;
  }

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
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      <Route path="/dashboard">
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>

      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

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

function ClerkNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-600 mx-auto flex items-center justify-center">
          <span className="text-white font-bold text-2xl">BS</span>
        </div>
        <h1 className="text-xl font-bold text-amber-900">Clerk Not Configured</h1>
        <p className="text-amber-700 text-sm">
          The <code className="bg-amber-100 px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> environment
          variable is missing. Open the <strong>Auth</strong> pane in the Replit toolbar to set up Clerk
          authentication for BakeryStock.
        </p>
      </div>
    </div>
  );
}

function AppWithClerk() {
  const [, setLocation] = useLocation();

  if (!clerkPubKey) {
    return <ClerkNotConfigured />;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your BakeryStock account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started with BakeryStock",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <ClerkTokenBridge />
          <ClerkQueryClientCacheInvalidator />
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </AppProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppWithClerk />
    </WouterRouter>
  );
}

export default App;
