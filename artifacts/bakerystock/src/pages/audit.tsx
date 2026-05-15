import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  branchId: number;
  branchName: string;
  itemId: number;
  itemName: string;
  quantityChange: string;
  movementType: string;
  note?: string;
  timestamp: string;
}

interface Branch {
  id: number;
  name: string;
}

const typeColors: Record<string, string> = {
  stock_in: "text-emerald-700 bg-emerald-50 border-emerald-200",
  used_in_production: "text-amber-700 bg-amber-50 border-amber-200",
  sold: "text-blue-700 bg-blue-50 border-blue-200",
  damaged: "text-red-700 bg-red-50 border-red-200",
  missing_lost: "text-orange-700 bg-orange-50 border-orange-200",
  returned: "text-purple-700 bg-purple-50 border-purple-200",
};

const typeLabels: Record<string, { en: string; fr: string }> = {
  stock_in: { en: "Stock In", fr: "Entrée" },
  used_in_production: { en: "Production", fr: "Production" },
  sold: { en: "Sold", fr: "Vendu" },
  damaged: { en: "Damaged", fr: "Endommagé" },
  missing_lost: { en: "Missing", fr: "Manquant" },
  returned: { en: "Returned", fr: "Retourné" },
};

const isPositive = (type: string) => type === "stock_in" || type === "returned";

export default function AuditPage() {
  const { lang } = useAppContext();
  const { data: user } = useCurrentUser();
  const isOwner = user?.role === "owner";

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit"],
    queryFn: () => api.get<AuditLog[]>("/audit"),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
    enabled: isOwner,
  });

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      log.userName?.toLowerCase().includes(search.toLowerCase()) ||
      log.branchName?.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === "all" || String(log.branchId) === branchFilter;
    const matchType = typeFilter === "all" || log.movementType === typeFilter;
    return matchSearch && matchBranch && matchType;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "audit")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {filtered.length} {lang === "fr" ? "entrées" : "entries"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t(lang, "search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isOwner && branches.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t(lang, "allBranches")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, "allBranches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t(lang, "all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(lang, "all")}</SelectItem>
            {Object.entries(typeLabels).map(([key, labels]) => (
              <SelectItem key={key} value={key}>{labels[lang]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "noAuditLogs")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{log.itemName}</span>
                    <Badge variant="outline" className={cn("text-xs py-0", typeColors[log.movementType])}>
                      {typeLabels[log.movementType]?.[lang] ?? log.movementType}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{log.userName}</span>
                    <span>·</span>
                    <span>{log.branchName}</span>
                    {log.note && <><span>·</span><span className="truncate max-w-[200px]">{log.note}</span></>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn("font-bold text-sm", isPositive(log.movementType) ? "text-emerald-700" : "text-red-600")}>
                    {isPositive(log.movementType) ? "+" : "−"}{log.quantityChange}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), "MMM d, HH:mm")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
