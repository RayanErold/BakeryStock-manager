import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

export type AppTheme = "amber" | "dark" | "ocean" | "forest";

const THEME_CLASSES: Record<AppTheme, string> = {
  amber: "",
  dark: "dark",
  ocean: "theme-ocean",
  forest: "theme-forest",
};

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-ocean", "theme-forest");
  const cls = THEME_CLASSES[theme];
  if (cls) root.classList.add(cls);
}

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  userRole: "owner" | "staff" | null;
  setUserRole: (r: "owner" | "staff" | null) => void;
  localUserId: number | null;
  setLocalUserId: (id: number | null) => void;
}

const AppContext = createContext<AppContextValue>({
  lang: "fr",
  setLang: () => {},
  theme: "amber",
  setTheme: () => {},
  userRole: null,
  setUserRole: () => {},
  localUserId: null,
  setLocalUserId: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) ?? "fr";
  });
  const [theme, setThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem("theme") as AppTheme) ?? "amber";
  });
  const [userRole, setUserRole] = useState<"owner" | "staff" | null>(null);
  const [localUserId, setLocalUserId] = useState<number | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };

  const setTheme = (t: AppTheme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
    applyTheme(t);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, userRole, setUserRole, localUserId, setLocalUserId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
