import { useLanguage } from "@/context/LanguageContext";

export const fr = {
  appName: "BakeryStock",
  dashboard: "Tableau de bord",
  inventory: "Inventaire",
  movements: "Mouvement",
  alerts: "Alertes",

  totalItems: "Articles totaux",
  lowStock: "Stock faible",
  movementsToday: "Mouvements aujourd'hui",
  damagedToday: "Endommagés aujourd'hui",

  recentMovements: "Mouvements récents",
  lowStockAlerts: "Alertes stock faible",
  noMovements: "Aucun mouvement enregistré",
  noInventory: "Aucun article trouvé",
  noAlerts: "Aucune alerte de stock faible",
  noResults: "Aucun résultat",

  recordMovement: "Enregistrer un mouvement",
  selectItem: "Sélectionner un article",
  selectType: "Type de mouvement",
  selectBranch: "Toutes les succursales",
  quantity: "Quantité",
  note: "Note (optionnel)",
  submit: "Enregistrer",
  submitting: "Enregistrement...",
  submitSuccess: "Mouvement enregistré",
  submitError: "Erreur lors de l'enregistrement",

  search: "Rechercher...",
  allBranches: "Toutes les succursales",

  stockIn: "Entrée de stock",
  usedInProduction: "Utilisé en production",
  sold: "Vendu",
  damaged: "Endommagé",
  missingLost: "Manquant / Perdu",
  returned: "Retourné",

  normal: "Normal",
  lowStockLabel: "Stock faible",

  loading: "Chargement...",
  error: "Erreur de chargement",
  retry: "Réessayer",

  item: "Article",
  branch: "Succursale",
  category: "Catégorie",
  unit: "Unité",
  minThreshold: "Seuil minimum",
  current: "Actuel",
  deficit: "Déficit",

  today: "Aujourd'hui",
  items: "articles",
  units: "unités",

  offline: "Hors ligne",
  offlineBanner: "Vous êtes hors ligne — les mouvements seront synchronisés à la reconnexion.",
  pendingSync: "en attente de synchronisation",
  syncing: "Synchronisation…",
  lastSynced: "Dernière sync",
  syncNow: "Synchroniser",
  savedOffline: "Enregistré hors ligne",
  savedOfflineDetail: "Le mouvement sera envoyé à la reconnexion.",
  chooseBranch: "Choisir une succursale",
};

export const en = {
  appName: "BakeryStock",
  dashboard: "Dashboard",
  inventory: "Inventory",
  movements: "Movements",
  alerts: "Alerts",

  totalItems: "Total Items",
  lowStock: "Low Stock",
  movementsToday: "Movements Today",
  damagedToday: "Damaged Today",

  recentMovements: "Recent Movements",
  lowStockAlerts: "Low Stock Alerts",
  noMovements: "No movements recorded",
  noInventory: "No items found",
  noAlerts: "No low stock alerts",
  noResults: "No results",

  recordMovement: "Record a Movement",
  selectItem: "Select an Item",
  selectType: "Movement Type",
  selectBranch: "All Branches",
  quantity: "Quantity",
  note: "Note (optional)",
  submit: "Save",
  submitting: "Saving...",
  submitSuccess: "Movement saved",
  submitError: "Error saving movement",

  search: "Search...",
  allBranches: "All Branches",

  stockIn: "Stock In",
  usedInProduction: "Used in Production",
  sold: "Sold",
  damaged: "Damaged",
  missingLost: "Missing / Lost",
  returned: "Returned",

  normal: "Normal",
  lowStockLabel: "Low Stock",

  loading: "Loading...",
  error: "Loading Error",
  retry: "Retry",

  item: "Item",
  branch: "Branch",
  category: "Category",
  unit: "Unit",
  minThreshold: "Min Threshold",
  current: "Current",
  deficit: "Deficit",

  today: "Today",
  items: "items",
  units: "units",

  offline: "Offline",
  offlineBanner: "You are offline — movements will sync when connected.",
  pendingSync: "pending sync",
  syncing: "Syncing…",
  lastSynced: "Last sync",
  syncNow: "Sync Now",
  savedOffline: "Saved Offline",
  savedOfflineDetail: "The movement will be sent when you reconnect.",
  chooseBranch: "Choose a Branch",
};

export type TranslationKey = keyof typeof fr;

// Backward compatible single-locale fallback (uses French if not dynamic)
export function t(key: TranslationKey): string {
  return fr[key] ?? key;
}

export function useTranslation() {
  const { language } = useLanguage();
  const t = (key: TranslationKey): string => {
    const dict = language === "en" ? en : fr;
    return dict[key] ?? key;
  };
  
  const getMovementTypeLabel = (type: string): string => {
    const dict = language === "en" ? en : fr;
    const keyMap: Record<string, string> = {
      stock_in: dict.stockIn,
      used_in_production: dict.usedInProduction,
      sold: dict.sold,
      damaged: dict.damaged,
      missing_lost: dict.missingLost,
      returned: dict.returned,
    };
    return keyMap[type] ?? type;
  };

  const getMovementTypes = () => [
    { value: "stock_in", label: language === "en" ? en.stockIn : fr.stockIn, icon: "arrow-down-circle" as const },
    { value: "used_in_production", label: language === "en" ? en.usedInProduction : fr.usedInProduction, icon: "tool" as const },
    { value: "sold", label: language === "en" ? en.sold : fr.sold, icon: "shopping-bag" as const },
    { value: "damaged", label: language === "en" ? en.damaged : fr.damaged, icon: "alert-triangle" as const },
    { value: "missing_lost", label: language === "en" ? en.missingLost : fr.missingLost, icon: "help-circle" as const },
    { value: "returned", label: language === "en" ? en.returned : fr.returned, icon: "rotate-ccw" as const },
  ];

  return { t, language, getMovementTypeLabel, getMovementTypes };
}

export const movementTypeLabels: Record<string, string> = {
  stock_in: fr.stockIn,
  used_in_production: fr.usedInProduction,
  sold: fr.sold,
  damaged: fr.damaged,
  missing_lost: fr.missingLost,
  returned: fr.returned,
};

export const movementTypes = [
  { value: "stock_in", label: fr.stockIn, icon: "arrow-down-circle" as const },
  { value: "used_in_production", label: fr.usedInProduction, icon: "tool" as const },
  { value: "sold", label: fr.sold, icon: "shopping-bag" as const },
  { value: "damaged", label: fr.damaged, icon: "alert-triangle" as const },
  { value: "missing_lost", label: fr.missingLost, icon: "help-circle" as const },
  { value: "returned", label: fr.returned, icon: "rotate-ccw" as const },
];
