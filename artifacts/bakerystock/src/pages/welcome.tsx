import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setStoredUserId } from "@/lib/authToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";
import { Store, UserPlus, Search, ArrowLeft, Eye } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "owner" | "staff";
  organizationId: string | null;
}

interface WelcomeProps {
  onLogin: () => void;
}

type Screen = "lookup" | "not-found" | "create";

export default function WelcomePage({ onLogin }: WelcomeProps) {
  const { lang } = useAppContext();
  const qc = useQueryClient();

  const [screen, setScreen] = useState<Screen>("lookup");
  const [emailInput, setEmailInput] = useState("");
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleLogin = (user: User) => {
    setStoredUserId(String(user.id));
    qc.clear();
    onLogin();
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    setError("");
    try {
      const user = await api.get<User>("/auth/find-by-email?email=owner%40bakerystock.com");
      handleLogin(user);
    } catch (err: any) {
      setError(lang === "fr" ? "Impossible d'accéder au compte invité" : "Failed to access guest account");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = emailInput.trim();
    if (!trimmed) { setError(lang === "fr" ? "Entrez votre email" : "Enter your email"); return; }
    setLookupLoading(true);
    try {
      const user = await api.get<User>(`/auth/find-by-email?email=${encodeURIComponent(trimmed)}`);
      setFoundUser(user);
      setEmail(trimmed);
    } catch {
      setFoundUser(null);
      setEmail(trimmed);
      setScreen("not-found");
    } finally {
      setLookupLoading(false);
    }
  };

  const createOwner = useMutation({
    mutationFn: () =>
      api.post<User>("/auth/register-owner", {
        name: name.trim(),
        email: email.trim(),
      }),
    onSuccess: (user) => handleLogin(user),
    onError: (err: Error) => setError(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError(lang === "fr" ? "Le nom est requis" : "Name is required"); return; }
    if (!email.trim()) { setError(lang === "fr" ? "L'email est requis" : "Email is required"); return; }
    createOwner.mutate();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#121110] flex flex-col lg:flex-row items-stretch">
      {/* Left Column: Premium Value Proposition & Solutions */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-gradient-to-br from-primary/5 via-primary/0 to-transparent border-r border-border/40">
        <div className="max-w-xl space-y-8 mx-auto lg:mx-0">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-foreground">BakeryStock</span>
              <span className="block text-[10px] uppercase tracking-widest text-primary font-bold">Pro Manager</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.1] text-balance">
              {lang === "fr" ? (
                <>
                  Gérez vos stocks de boulangerie <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">sans effort</span>.
                </>
              ) : (
                <>
                  Manage your bakery stock <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">effortlessly</span>.
                </>
              )}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              {lang === "fr" 
                ? "Conçu spécifiquement pour les boulangers et gestionnaires de points de vente. Suivez vos matières premières, réduisez le gaspillage et pilotez toutes vos succursales sur une seule plateforme."
                : "Designed specifically for professional bakers and branch managers. Track raw materials, reduce waste, and manage all your locations from a single platform."
              }
            </p>
          </div>

          {/* Solutions Highlight Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {/* Multi-Branch */}
            <div className="flex gap-4 p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm hover:border-primary/20 hover:bg-card transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">
                  {lang === "fr" ? "Multi-Succursales" : "Multi-Branch"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "fr" 
                    ? "Pilotez Douala, Yaoundé ou d'autres points de vente depuis un compte unique."
                    : "Track Douala, Yaoundé, or new locations easily under one central workspace."
                  }
                </p>
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="flex gap-4 p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm hover:border-primary/20 hover:bg-card transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                <Eye className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">
                  {lang === "fr" ? "Alerte Ruptures" : "Stock Alerts"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "fr" 
                    ? "Finis les manques de farine ou de sucre. Soyez alerté avant le seuil critique."
                    : "Prevent shortages of flour or sugar with instant low-threshold indicators."
                  }
                </p>
              </div>
            </div>

            {/* Stock Movements */}
            <div className="flex gap-4 p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm hover:border-primary/20 hover:bg-card transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">
                  {lang === "fr" ? "Flux en Temps Réel" : "Live Movements"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "fr" 
                    ? "Enregistrez entrées de stock, consommations et pertes en un clin d'œil."
                    : "Log stock replenishment, usage, and waste in a few fast seconds."
                  }
                </p>
              </div>
            </div>

            {/* Audit & Team */}
            <div className="flex gap-4 p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm hover:border-primary/20 hover:bg-card transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">
                  {lang === "fr" ? "Équipe & Audit" : "Team & Security"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "fr" 
                    ? "Attribuez des rôles d'accès et suivez l'historique complet des actions."
                    : "Assign access levels and track complete audit trails for high reliability."
                  }
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right Column: Interactive Card Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16 bg-gradient-to-br from-card to-background">
        <div className="w-full max-w-md space-y-6">

          {screen === "lookup" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg shadow-black/[0.02]">
              <div className="space-y-1">
                <h2 className="font-bold text-xl text-foreground">
                  {lang === "fr" ? "Connexion" : "Sign in"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === "fr" ? "Entrez votre email pour accéder à votre boulangerie." : "Enter your email to access your bakery."}
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-lookup">Email</Label>
                  <Input
                    id="email-lookup"
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setFoundUser(null); setError(""); }}
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}

                {foundUser ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary bg-primary/5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{foundUser.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground">{foundUser.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{foundUser.role}</div>
                      </div>
                    </div>
                    <Button type="button" className="w-full" onClick={() => handleLogin(foundUser)}>
                      {lang === "fr" ? `Se connecter en tant que ${foundUser.name}` : `Sign in as ${foundUser.name}`}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setFoundUser(null); setEmailInput(""); }}>
                      {lang === "fr" ? "Ce n'est pas moi" : "That's not me"}
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" className="w-full gap-2" disabled={lookupLoading}>
                    <Search className="w-4 h-4" />
                    {lookupLoading
                      ? (lang === "fr" ? "Recherche…" : "Searching…")
                      : (lang === "fr" ? "Rechercher mon compte" : "Find my account")}
                  </Button>
                )}
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs text-muted-foreground">
                  <span className="bg-card px-2">{lang === "fr" ? "ou" : "or"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary font-semibold"
                  onClick={handleGuestLogin}
                  disabled={guestLoading}
                >
                  <Eye className="w-4 h-4" />
                  {guestLoading
                    ? (lang === "fr" ? "Connexion invité…" : "Guest sign in…")
                    : (lang === "fr" ? "Continuer en tant qu'invité (Voir Démo)" : "Log in as Guest (View Demo)")}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => { setScreen("create"); setEmail(""); setName(""); setError(""); }}
                >
                  <UserPlus className="w-4 h-4" />
                  {lang === "fr" ? "Créer une nouvelle boulangerie" : "Set up a new bakery"}
                </Button>
              </div>
            </div>
          )}

          {screen === "not-found" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg shadow-black/[0.02]">
              <div className="space-y-1">
                <h2 className="font-bold text-lg text-foreground">
                  {lang === "fr" ? "Aucun compte trouvé" : "No account found"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === "fr"
                    ? `Aucun compte lié à ${email}. Voulez-vous créer une nouvelle boulangerie ?`
                    : `No account found for ${email}. Would you like to set up a new bakery?`}
                </p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => { setName(""); setScreen("create"); setError(""); }}
              >
                <UserPlus className="w-4 h-4" />
                {lang === "fr" ? "Créer ma boulangerie" : "Create my bakery"}
              </Button>
              <Button variant="ghost" className="w-full gap-2" onClick={() => { setScreen("lookup"); setError(""); }}>
                <ArrowLeft className="w-4 h-4" />
                {lang === "fr" ? "Réessayer" : "Try a different email"}
              </Button>
            </div>
          )}

          {screen === "create" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg shadow-black/[0.02]">
              <div className="space-y-1">
                <h2 className="font-bold text-lg text-foreground">
                  {lang === "fr" ? "Créer votre boulangerie" : "Set up your bakery"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === "fr"
                    ? "Vous démarrez avec un espace vide, prêt à configurer."
                    : "You'll start with a clean, empty workspace."}
                </p>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-name">{lang === "fr" ? "Votre nom" : "Your name"}</Label>
                  <Input
                    id="create-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === "fr" ? "Ex: Marie Dupont" : "e.g. John Baker"}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={createOwner.isPending}>
                  {createOwner.isPending
                    ? (lang === "fr" ? "Création…" : "Creating…")
                    : (lang === "fr" ? "Créer mon compte" : "Create account")}
                </Button>
                <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setScreen("lookup"); setError(""); }}>
                  <ArrowLeft className="w-4 h-4" />
                  {lang === "fr" ? "Retour" : "Back"}
                </Button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
