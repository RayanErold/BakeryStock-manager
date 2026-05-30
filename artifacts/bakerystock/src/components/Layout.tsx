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
  Bell,
  AlertTriangle,
  Check,
  CheckCheck,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
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
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [location] = useLocation();
  const { lang, setLang, theme, setTheme } = useAppContext();
  const isOwner = user?.role === "owner";
  const items = navItems(isOwner);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === "en") {
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } else {
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins}m`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      return `Il y a ${diffDays}j`;
    }
  };

  const NotificationBell = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setNotificationDrawerOpen(true)}
      className="relative text-muted-foreground hover:text-foreground rounded-full transition-transform hover:scale-105 shrink-0"
    >
      <Bell className={cn("w-5 h-5", unreadCount > 0 && "animate-pulse text-amber-500")} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-[9px] font-extrabold text-white leading-none shadow-sm animate-in zoom-in duration-200">
          {unreadCount}
        </span>
      )}
    </Button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">BS</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sidebar-foreground text-sm leading-tight">BakeryStock</div>
              <div className="text-xs text-muted-foreground truncate">{user?.branch?.name ?? "All Branches"}</div>
            </div>
          </div>
          <NotificationBell />
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
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLang(lang === "en" ? "fr" : "en")}
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* Premium Notification Drawer */}
      {notificationDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setNotificationDrawerOpen(false)}
          />

          {/* Sliding Panel */}
          <div className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">
                  {lang === "en" ? "Notifications" : "Notifications"}
                </h3>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:text-primary-foreground hover:bg-primary gap-1"
                    onClick={() => markAllAsRead()}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {lang === "en" ? "Mark all read" : "Tout marquer lu"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setNotificationDrawerOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* List scroll area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-10 opacity-70">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {lang === "en" ? "All caught up!" : "Tout est à jour !"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang === "en" ? "No new stock alerts." : "Aucune alerte de stock."}
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = notif.type === "low_stock" ? AlertTriangle : Bell;
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        "relative flex gap-3 p-3.5 rounded-xl border transition-all duration-200 hover-elevate",
                        notif.isRead
                          ? "bg-card/50 border-border/50 opacity-80"
                          : "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/25 shadow-2xs"
                      )}
                    >
                      {/* Read status accent line */}
                      {!notif.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-amber-500" />
                      )}

                      {/* Icon bubble */}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          notif.type === "low_stock"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className={cn("text-sm font-semibold truncate", !notif.isRead && "text-foreground font-bold")}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal pr-4">
                          {notif.message}
                        </p>
                      </div>

                      {/* Individual Read Action Button */}
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 bottom-2 rounded-full w-6 h-6 hover:bg-amber-500 hover:text-white"
                          title={lang === "en" ? "Mark as read" : "Marquer comme lu"}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
