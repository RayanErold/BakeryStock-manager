import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Activity,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Branch {
  id: number;
  name: string;
}

interface DashboardData {
  totalItems: number;
  lowStockCount: number;
  missingToday: number;
  damagedToday: number;
  movementsToday: number;
  recentMovements: Array<{
    id: number;
    itemName: string;
    branchName: string;
    type: string;
    quantity: string;
    userName: string;
    createdAt: string;
  }>;
  lowStockItems: Array<{
    id: number;
    name: string;
    quantity: string;
    minThreshold: string;
    unit: string;
    branchName: string;
  }>;
  topUsedItems: Array<{ name: string; totalUsed: number }>;
  branchSummary?: Array<{
    id: number;
    name: string;
    city: string;
    itemCount: number;
    lowStockCount: number;
  }>;
}

const movementColors: Record<string, string> = {
  stock_in: "text-emerald-700 bg-emerald-50 border-emerald-200",
  used_in_production: "text-amber-700 bg-amber-50 border-amber-200",
  sold: "text-teal-700 bg-teal-50 border-teal-200",
  damaged: "text-red-700 bg-red-50 border-red-200",
  missing_lost: "text-orange-700 bg-orange-50 border-orange-200",
  returned: "text-purple-700 bg-purple-50 border-purple-200",
};

const movementTypeLabels: Record<string, { en: string; fr: string }> = {
  stock_in: { en: "Stock In", fr: "Entrée" },
  used_in_production: { en: "Production", fr: "Production" },
  sold: { en: "Sold", fr: "Vendu" },
  damaged: { en: "Damaged", fr: "Endommagé" },
  missing_lost: { en: "Missing", fr: "Manquant" },
  returned: { en: "Returned", fr: "Retourné" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { lang } = useAppContext();
  const { data: user } = useCurrentUser();
  const isOwner = user?.role === "owner";

  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
    enabled: isOwner,
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", selectedBranchId],
    queryFn: () => {
      const url = selectedBranchId !== "all" ? `/dashboard?branchId=${selectedBranchId}` : "/dashboard";
      return api.get<DashboardData>(url);
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "dashboard")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {lang === "fr" ? "Vue d'ensemble en temps réel" : "Real-time overview"}
          </p>
        </div>

        {isOwner && (
          <div className="w-full sm:w-64 flex items-center gap-2">
            <span className="text-sm font-medium shrink-0 text-muted-foreground">
              {lang === "fr" ? "Succursale:" : "Branch:"}
            </span>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(lang, "allBranches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label={t(lang, "totalInventory")}
          value={data?.totalItems ?? 0}
          color="bg-amber-100 text-amber-700"
          loading={isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label={t(lang, "lowStock")}
          value={data?.lowStockCount ?? 0}
          color="bg-orange-100 text-orange-700"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingDown}
          label={t(lang, "missingToday")}
          value={data?.missingToday ?? 0}
          color="bg-red-100 text-red-700"
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label={t(lang, "movementsCount")}
          value={data?.movementsToday ?? 0}
          color="bg-emerald-100 text-emerald-700"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              {t(lang, "recentMovements")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-4 pb-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.recentMovements?.length ? (
              <p className="text-muted-foreground text-sm px-4 pb-4">{t(lang, "noMovements")}</p>
            ) : (
              <div className="divide-y divide-border">
                {data.recentMovements.slice(0, 6).map((m) => (
                  <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.itemName}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.branchName} · {m.userName}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {m.type === "stock_in" || m.type === "returned" ? "+" : "-"}{m.quantity}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", movementColors[m.type])}
                      >
                        {movementTypeLabels[m.type]?.[lang] ?? m.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              {t(lang, "lowStockAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-4 pb-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.lowStockItems?.length ? (
              <p className="text-muted-foreground text-sm px-4 pb-4">
                {lang === "fr" ? "Aucune alerte" : "No alerts"}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.lowStockItems.slice(0, 6).map((item) => {
                  const pct = Math.round((Number(item.quantity) / Number(item.minThreshold)) * 100);
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.branchName}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-bold text-orange-600">
                            {item.quantity} {item.unit}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {lang === "fr" ? "min" : "min"}: {item.minThreshold} {item.unit}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Used Items Chart */}
      {isOwner && data?.topUsedItems?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t(lang, "topUsedItems")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topUsedItems} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => [v, lang === "fr" ? "Utilisé" : "Used"]}
                />
                <Bar dataKey="totalUsed" radius={[4, 4, 0, 0]}>
                  {data.topUsedItems.map((_, i) => (
                    <Cell key={i} fill={["#d97706", "#b45309", "#92400e", "#78350f", "#451a03"][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* Branch Overview (owner only) */}
      {isOwner && data?.branchSummary?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t(lang, "branchOverview")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data.branchSummary.map((b) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.city}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {b.itemCount} {lang === "fr" ? "articles" : "items"}
                    </span>
                    {b.lowStockCount > 0 && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">
                        {b.lowStockCount} {lang === "fr" ? "alertes" : "alerts"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
