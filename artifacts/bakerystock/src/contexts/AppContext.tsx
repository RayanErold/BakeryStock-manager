import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  userRole: "owner" | "staff" | null;
  setUserRole: (r: "owner" | "staff" | null) => void;
  localUserId: number | null;
  setLocalUserId: (id: number | null) => void;
}

const AppContext = createContext<AppContextValue>({
  lang: "fr",
  setLang: () => {},
  userRole: null,
  setUserRole: () => {},
  localUserId: null,
  setLocalUserId: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) ?? "fr";
  });
  const [userRole, setUserRole] = useState<"owner" | "staff" | null>(null);
  const [localUserId, setLocalUserId] = useState<number | null>(null);

  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, userRole, setUserRole, localUserId, setLocalUserId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
