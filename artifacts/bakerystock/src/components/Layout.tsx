import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ClipboardList,
  GitBranch,
  Users,
  FileBarChart,
  Menu,
  X,
  Globe,
  ChevronRight,
  LogOut,
  Palette,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppContext, type AppTheme } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import type { CurrentUser } from "@/hooks/useCurrentUser";

const THEMES: { id: AppTheme; label: string; swatch: string }[] = [
  { id: "amber",  label: "Warm Amber",   swatch: "hsl(30,85%,48%)" },
  { id: "dark",   label: "Dark Mode",    swatch: "hsl(25,35%,18%)" },
  { id: "ocean",  label: "Ocean Blue",   swatch: "hsl(214,55%,32%)" },
  { id: "forest", label: "Forest Green", swatch: "hsl(100,25%,28%)" },
];

const navItems = (isOwner: boolean) => [
  { icon: LayoutDashboard, key: "dashboard" as const, path: "/" },
  { icon: Package, key: "inventory" as const, path: "/inventory" },
  { icon: ArrowLeftRight, key: "movements" as const, path: "/movements" },
  ...(isOwner
    ? [
        { icon: ClipboardList, key: "audit" as const, path: "/audit" },
        { icon: GitBranch, key: "branches" as const, path: "/branches" },
        { icon: Users, key: "staff" as const, path: "/staff" },
        { icon: FileBarChart, key: "reports" as const, path: "/reports" },
      ]
    : []),
  { icon: HelpCircle, key: "guide" as const, path: "/guide" },
];

interface LayoutProps {
  children: React.ReactNode;
  user: CurrentUser | null;
  onSignOut: () => void;
}

export function Layout({ children, user, onSignOut }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { lang, setLang, theme, setTheme } = useAppContext();
  const isOwner = user?.role === "owner";
  const items = navItems(isOwner);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">BS</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sidebar-foreground text-sm leading-tight">BakeryStock</div>
            <div className="text-xs text-muted-foreground truncate">{user?.branch?.name ?? "All Branches"}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map(({ icon: Icon, key, path }) => {
          const active = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link
              key={key}
              href={path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t(lang, key)}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? "Guest"}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0",
                isOwner
                  ? "border-amber-400 text-amber-700 bg-amber-50"
                  : "border-terracotta-400 text-orange-700 bg-orange-50",
              )}
            >
              {isOwner ? t(lang, "owner") : t(lang, "staffRole")}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setLang(lang === "en" ? "fr" : "en")}
        >
          <Globe className="w-4 h-4" />
          {lang === "en" ? "Français" : "English"}
        </Button>

        {/* Theme switcher */}
        <div className="px-3 py-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {lang === "en" ? "Theme" : "Thème"}
            </span>
          </div>
          <div className="flex gap-1.5">
            {THEMES.map(({ id, label, swatch }) => (
              <button
                key={id}
                title={label}
                onClick={() => setTheme(id)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                  theme === id
                    ? "border-foreground shadow-sm scale-110"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="w-4 h-4" />
          {t(lang, "signOut")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Sidebar - mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <span className="font-bold text-sidebar-foreground">BakeryStock</span>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card lg:hidden shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-bold text-sm">BakeryStock</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
          >
            <Globe className="w-4 h-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
