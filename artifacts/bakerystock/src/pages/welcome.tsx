import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setStoredUserId } from "@/lib/authToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";
import { Store, UserPlus, Search, ArrowLeft } from "lucide-react";

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

  const handleLogin = (user: User) => {
    setStoredUserId(String(user.id));
    qc.clear();
    onLogin();
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BakeryStock</h1>
          <p className="text-muted-foreground text-sm">
            {lang === "fr" ? "Gestion d'inventaire pour votre boulangerie" : "Inventory management for your bakery"}
          </p>
        </div>

        {screen === "lookup" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-bold text-lg text-foreground">
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

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setScreen("create"); setEmail(""); setName(""); setError(""); }}
            >
              <UserPlus className="w-4 h-4" />
              {lang === "fr" ? "Créer une nouvelle boulangerie" : "Set up a new bakery"}
            </Button>
          </div>
        )}

        {screen === "not-found" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
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
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
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
  );
}
