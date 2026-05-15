import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface DevUser {
  clerkId: string;
  name: string;
  role: "owner" | "staff";
  initials: string;
}

const DEV_USERS: DevUser[] = [
  { clerkId: "seed_owner_001", name: "Pierre Fotso", role: "owner", initials: "PF" },
  { clerkId: "seed_staff_001", name: "Carine Biya", role: "staff", initials: "CB" },
  { clerkId: "seed_staff_002", name: "Paul Eto", role: "staff", initials: "PE" },
];

interface LoginPageProps {
  onLogin?: (clerkId: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { lang, setLang } = useAppContext();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSignIn = () => {
    if (!selected) return;
    localStorage.setItem("dev_clerk_id", selected);
    onLogin?.(selected);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Header */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "en" ? "fr" : "en")}
          className="gap-2 text-muted-foreground"
        >
          <Globe className="w-4 h-4" />
          {lang === "en" ? "Français" : "English"}
        </Button>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-2xl">BS</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BakeryStock</h1>
            <p className="text-muted-foreground text-sm mt-1">{t(lang, "tagline")}</p>
          </div>
        </div>

        {/* Dev mode user selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t(lang, "signIn")}</CardTitle>
            <CardDescription className="text-xs">
              {lang === "fr"
                ? "Sélectionnez un compte pour continuer (mode démo)"
                : "Select an account to continue (demo mode)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEV_USERS.map((user) => (
              <button
                key={user.clerkId}
                onClick={() => setSelected(user.clerkId)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                  selected === user.clerkId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-card",
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary text-sm">{user.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{user.name}</div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    user.role === "owner"
                      ? "border-amber-400 text-amber-700 bg-amber-50"
                      : "border-stone-300 text-stone-600 bg-stone-50",
                  )}
                >
                  {user.role === "owner" ? t(lang, "owner") : t(lang, "staffRole")}
                </Badge>
              </button>
            ))}

            <Button
              className="w-full mt-2"
              onClick={handleSignIn}
              disabled={!selected}
            >
              {t(lang, "signIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
