import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

interface Branch {
  id: number;
  name: string;
  city: string;
  manager?: string;
  phone?: string;
  createdAt: string;
}

const emptyForm = { name: "", city: "", manager: "", phone: "" };

export default function BranchesPage() {
  const { lang } = useAppContext();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post("/branches", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success(t(lang, "saveSuccess"));
      setDialogOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof emptyForm> }) =>
      api.put(`/branches/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success(t(lang, "saveSuccess"));
      setDialogOpen(false);
      setEditBranch(null);
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success(t(lang, "deleteSuccess"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditBranch(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditBranch(b);
    setForm({ name: b.name, city: b.city, manager: b.manager ?? "", phone: b.phone ?? "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.city) {
      toast.error(lang === "fr" ? "Nom et ville requis" : "Name and city are required");
      return;
    }
    if (editBranch) {
      updateMutation.mutate({ id: editBranch.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "branches")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {branches.length} {lang === "fr" ? "succursales" : "branches"}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t(lang, "addBranch")}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "noBranches")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{b.name}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(t(lang, "deleteConfirm"))) {
                          deleteMutation.mutate(b.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{b.city}</span>
                </div>
                {b.manager && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>{b.manager}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editBranch ? t(lang, "edit") : t(lang, "addBranch")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === "fr" ? "Nom de la succursale" : "Branch Name"} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={lang === "fr" ? "Ex: Boulangerie Centrale" : "Ex: Central Bakery"}
              />
            </div>
            <div>
              <Label>{t(lang, "city")} *</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={lang === "fr" ? "Ex: Douala" : "Ex: Douala"}
              />
            </div>
            <div>
              <Label>{t(lang, "manager")}</Label>
              <Input
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                placeholder={lang === "fr" ? "Nom du responsable" : "Manager name"}
              />
            </div>
            <div>
              <Label>{t(lang, "phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+237 6xx xxx xxx"
              />
            </div>
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
