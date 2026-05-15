import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  minThreshold: string;
  branchId: number;
  branchName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: number;
  name: string;
  city: string;
}

const CATEGORIES = ["Ingrédients de base", "Produits laitiers", "Huiles & Graisses", "Emballages", "Autre"];
const UNITS = ["kg", "g", "bags", "sacks", "liters", "ml", "boxes", "pieces", "trays", "units"];

const emptyForm = {
  name: "",
  category: "",
  quantity: "",
  unit: "",
  minThreshold: "",
  branchId: "",
};

export default function InventoryPage() {
  const { lang } = useAppContext();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOwner = user?.role === "owner";

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: () => api.get<InventoryItem[]>("/inventory"),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
    enabled: isOwner,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      api.post("/inventory", {
        ...data,
        quantity: Number(data.quantity),
        minThreshold: Number(data.minThreshold),
        branchId: Number(data.branchId),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t(lang, "saveSuccess"));
      setDialogOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof emptyForm> }) =>
      api.put(`/inventory/${id}`, {
        ...data,
        quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
        minThreshold: data.minThreshold !== undefined ? Number(data.minThreshold) : undefined,
        branchId: data.branchId !== undefined ? Number(data.branchId) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t(lang, "saveSuccess"));
      setDialogOpen(false);
      setEditItem(null);
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t(lang, "deleteSuccess"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...emptyForm, branchId: user?.branchId ? String(user.branchId) : "" });
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minThreshold: item.minThreshold,
      branchId: String(item.branchId),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.quantity || !form.unit || !form.branchId) {
      toast.error(lang === "fr" ? "Veuillez remplir tous les champs" : "Please fill all required fields");
      return;
    }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === "all" || String(item.branchId) === branchFilter;
    const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchSearch && matchBranch && matchCategory;
  });

  const isLow = (item: InventoryItem) => Number(item.quantity) <= Number(item.minThreshold);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "inventory")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} {lang === "fr" ? "articles" : "items"}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t(lang, "addItem")}</span>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t(lang, "category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lang === "fr" ? "Toutes catégories" : "All Categories"}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOwner && branches.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t(lang, "allBranches")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, "allBranches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "noInventory")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className={cn(isLow(item) && "border-orange-300 bg-orange-50/30")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    {isLow(item) && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {t(lang, "lowStockLabel")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span>{item.category}</span>
                    {item.branchName && <span>· {item.branchName}</span>}
                    <span>· {lang === "fr" ? "min" : "min"}: {item.minThreshold} {item.unit}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-lg text-foreground">
                    {item.quantity}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(t(lang, "deleteConfirm"))) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? t(lang, "edit") : t(lang, "addItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t(lang, "itemName")} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={lang === "fr" ? "Ex: Farine de blé" : "Ex: Wheat flour"}
              />
            </div>
            <div>
              <Label>{t(lang, "category")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t(lang, "selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t(lang, "quantity")} *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>{t(lang, "unit")} *</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(lang, "selectUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t(lang, "minThreshold")}</Label>
              <Input
                type="number"
                value={form.minThreshold}
                onChange={(e) => setForm({ ...form, minThreshold: e.target.value })}
                placeholder="0"
              />
            </div>
            {isOwner && branches.length > 0 && (
              <div>
                <Label>{t(lang, "branch")} *</Label>
                <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t(lang, "cancel")}</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {t(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
