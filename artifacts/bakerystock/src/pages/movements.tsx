import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Calendar, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import BarcodeScanner from "@/components/BarcodeScanner";

interface Movement {
  id: number;
  itemId: number;
  itemName: string;
  branchId: number;
  branchName: string;
  userId: number;
  userName: string;
  type: string;
  quantity: string;
  note?: string;
  createdAt: string;
}

interface InventoryItem {
  id: number;
  name: string;
  branchId: number;
  unit: string;
  barcode?: string | null;
}

interface Branch {
  id: number;
  name: string;
}

const MOVEMENT_TYPES = [
  "stock_in",
  "used_in_production",
  "sold",
  "damaged",
  "missing_lost",
  "returned",
] as const;

const typeColors: Record<string, string> = {
  stock_in: "text-emerald-700 bg-emerald-50 border-emerald-200",
  used_in_production: "text-amber-700 bg-amber-50 border-amber-200",
  sold: "text-teal-700 bg-teal-50 border-teal-200",
  damaged: "text-red-700 bg-red-50 border-red-200",
  missing_lost: "text-orange-700 bg-orange-50 border-orange-200",
  returned: "text-purple-700 bg-purple-50 border-purple-200",
};

const typeLabels: Record<string, { en: string; fr: string }> = {
  stock_in: { en: "Stock In", fr: "Entrée stock" },
  used_in_production: { en: "Used in Production", fr: "Utilisé production" },
  sold: { en: "Sold", fr: "Vendu" },
  damaged: { en: "Damaged", fr: "Endommagé" },
  missing_lost: { en: "Missing / Lost", fr: "Manquant / Perdu" },
  returned: { en: "Returned", fr: "Retourné" },
};

const isPositive = (type: string) => type === "stock_in" || type === "returned";

export default function MovementsPage() {
  const { lang } = useAppContext();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = user?.role === "owner";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState({
    itemId: "",
    branchId: "",
    type: "",
    quantity: "",
    note: "",
  });

  const { data: movements = [], isLoading } = useQuery<Movement[]>({
    queryKey: ["movements"],
    queryFn: () => api.get<Movement[]>("/movements"),
  });

  const { data: items = [] } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: () => api.get<InventoryItem[]>("/inventory"),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
    enabled: isOwner,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post("/movements", {
        itemId: Number(data.itemId),
        branchId: Number(data.branchId),
        type: data.type,
        quantity: Number(data.quantity),
        note: data.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.success(t(lang, "saveSuccess"));
      setDialogOpen(false);
      setForm({ itemId: "", branchId: "", type: "", quantity: "", note: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = movements.filter((m) => {
    const matchSearch =
      m.itemName.toLowerCase().includes(search.toLowerCase()) ||
      m.branchName.toLowerCase().includes(search.toLowerCase()) ||
      m.userName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.type === typeFilter;
    const movDate = new Date(m.createdAt);
    const matchFrom = !dateFrom || movDate >= new Date(dateFrom);
    const matchTo = !dateTo || movDate <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchType && matchFrom && matchTo;
  });

  const branchItems = form.branchId
    ? items.filter((i) => String(i.branchId) === form.branchId)
    : items;

  const handleSubmit = () => {
    if (!form.itemId || !form.branchId || !form.type || !form.quantity) {
      toast.error(lang === "fr" ? "Remplissez tous les champs requis" : "Fill all required fields");
      return;
    }
    createMutation.mutate(form);
  };

  const openCreate = () => {
    setForm({
      itemId: "",
      branchId: user?.branchId ? String(user.branchId) : "",
      type: "",
      quantity: "",
      note: "",
    });
    setShowScanner(false);
    setDialogOpen(true);
  };

  const handleBarcodeScan = useCallback(async (code: string) => {
    setShowScanner(false);
    try {
      const currentBranchId = form.branchId;
      const qs = currentBranchId ? `?branchId=${encodeURIComponent(currentBranchId)}` : "";
      const item = await api.get<InventoryItem>(`/inventory/barcode/${encodeURIComponent(code)}${qs}`);
      setForm((prev) => ({
        ...prev,
        itemId: String(item.id),
        branchId: prev.branchId || String(item.branchId),
      }));
      toast.success(lang === "fr" ? `Article trouvé: ${item.name}` : `Item found: ${item.name}`);
    } catch {
      toast.error(t(lang, "barcodeNotFound"));
    }
  }, [lang, form.branchId]);

  const selectedItem = items.find((i) => String(i.id) === form.itemId);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "movements")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} {lang === "fr" ? "enregistrements" : "records"}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t(lang, "recordMovement")}</span>
        </Button>
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t(lang, "all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(lang, "all")}</SelectItem>
            {MOVEMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {typeLabels[type][lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 text-sm"
            title={t(lang, "dateFrom")}
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 text-sm"
            title={t(lang, "dateTo")}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "noMovements")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{m.itemName}</span>
                    <Badge variant="outline" className={cn("text-xs", typeColors[m.type])}>
                      {typeLabels[m.type]?.[lang] ?? m.type}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{m.branchName}</span>
                    <span>· {m.userName}</span>
                    {m.note && <span>· {m.note}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn("text-lg font-bold", isPositive(m.type) ? "text-emerald-700" : "text-red-600")}>
                    {isPositive(m.type) ? "+" : "−"}{m.quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(m.createdAt), "MMM d, HH:mm")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Record Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setShowScanner(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(lang, "recordMovement")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isOwner && branches.length > 0 && (
              <div>
                <Label>{t(lang, "branch")} *</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(v) => setForm({ ...form, branchId: v, itemId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t(lang, "selectBranch")} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>{t(lang, "itemName")} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 gap-1.5 text-xs"
                  onClick={() => setShowScanner((s) => !s)}
                >
                  {showScanner ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      {lang === "fr" ? "Fermer" : "Close"}
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-3.5 h-3.5" />
                      {t(lang, "scanBarcode")}
                    </>
                  )}
                </Button>
              </div>

              {showScanner ? (
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onClose={() => setShowScanner(false)}
                  label={t(lang, "scanToFill")}
                />
              ) : (
                <Select value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={lang === "fr" ? "Sélectionner un article" : "Select item"} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchItems.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedItem && !showScanner && (
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "fr" ? "Unité:" : "Unit:"} <span className="font-medium">{selectedItem.unit}</span>
                </p>
              )}
            </div>

            <div>
              <Label>{t(lang, "movementType")} *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t(lang, "selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{typeLabels[type][lang]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t(lang, "quantity")} *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>{t(lang, "note")}</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={lang === "fr" ? "Raison ou note optionnelle..." : "Optional reason or note..."}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t(lang, "cancel")}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {t(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
