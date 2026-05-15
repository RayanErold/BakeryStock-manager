import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setStoredUserId } from "@/lib/authToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { Store, UserPlus, LogIn } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "owner" | "staff";
}

interface WelcomeProps {
  onLogin: () => void;
}

export default function WelcomePage({ onLogin }: WelcomeProps) {
  const { lang } = useAppContext();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users-list"],
    queryFn: () => api.get<User[]>("/auth/users"),
  });

  const createOwner = useMutation({
    mutationFn: () =>
      api.post<User>("/users", {
        name: name.trim(),
        email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@bakerystock.local`,
        role: "owner",
      }),
    onSuccess: (user) => {
      setStoredUserId(String(user.id));
      qc.clear();
      onLogin();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSelect = (user: User) => {
    setStoredUserId(String(user.id));
    qc.clear();
    onLogin();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    createOwner.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BakeryStock</h1>
          <p className="text-muted-foreground text-sm">
            {lang === "fr" ? "Gestion d'inventaire pour votre boulangerie" : "Inventory management for your bakery"}
          </p>
        </div>

        {showCreate ? (
          /* Create new owner account */
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-bold text-lg text-foreground">
                {lang === "fr" ? "Créer votre compte" : "Set up your bakery"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {lang === "fr" ? "Vous serez le propriétaire principal." : "You'll be the primary owner."}
              </p>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">{lang === "fr" ? "Votre nom" : "Your name"}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === "fr" ? "Ex: Marie Dupont" : "e.g. John Baker"}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{lang === "fr" ? "Email (optionnel)" : "Email (optional)"}</Label>
                <Input
                  id="email"
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
              {users.length > 0 && (
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowCreate(false)}>
                  {lang === "fr" ? "← Retour" : "← Back"}
                </Button>
              )}
            </form>
          </div>
        ) : (
          /* Pick existing user */
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-lg text-foreground">
              {lang === "fr" ? "Qui êtes-vous ?" : "Who are you?"}
            </h2>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">{t(lang, "loading")}</p>
            ) : users.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-muted-foreground text-sm">
                  {lang === "fr" ? "Aucun compte trouvé." : "No accounts yet."}
                </p>
                <Button onClick={() => setShowCreate(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  {lang === "fr" ? "Créer le premier compte" : "Create first account"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{u.role}</div>
                    </div>
                    <LogIn className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))}
                <Button
                  variant="outline"
                  className="w-full gap-2 mt-2"
                  onClick={() => setShowCreate(true)}
                >
                  <UserPlus className="w-4 h-4" />
                  {lang === "fr" ? "Nouveau propriétaire" : "New owner account"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
