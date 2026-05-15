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
};

export type TranslationKey = keyof typeof fr;
export function t(key: TranslationKey): string {
  return fr[key] ?? key;
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
