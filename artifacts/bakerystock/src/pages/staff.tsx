import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  branchId: number | null;
  branchName?: string;
  createdAt: string;
}

interface Branch {
  id: number;
  name: string;
}

const emptyForm = { name: "", email: "", role: "staff" as const, branchId: "" };

export default function StaffPage() {
  const { lang } = useAppContext();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: () => api.get<StaffMember[]>("/auth/users"),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; branchId?: number | null } }) =>
      api.put(`/auth/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t(lang, "saveSuccess"));
      setDialogOpen(false);
      setEditMember(null);
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t(lang, "deleteSuccess"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (member: StaffMember) => {
    setEditMember(member);
    setForm({
      name: member.name,
      email: member.email,
      role: member.role,
      branchId: member.branchId ? String(member.branchId) : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!editMember) return;
    updateMutation.mutate({
      id: editMember.id,
      data: {
        role: form.role,
        branchId: form.branchId ? Number(form.branchId) : null,
      },
    });
  };

  const filtered = staff.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "staff")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} {lang === "fr" ? "membres" : "members"}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t(lang, "search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "noStaff")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary text-sm">
                    {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{m.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        m.role === "owner"
                          ? "border-amber-400 text-amber-700 bg-amber-50"
                          : "border-stone-300 text-stone-600 bg-stone-50",
                      )}
                    >
                      {m.role === "owner" ? t(lang, "owner") : t(lang, "staffRole")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                    <span>{m.email}</span>
                    {m.branchName && <span>· {m.branchName}</span>}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(t(lang, "deleteConfirm"))) {
                        deleteMutation.mutate(m.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(lang, "edit")} — {editMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t(lang, "role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t(lang, "owner")}</SelectItem>
                  <SelectItem value="staff">{t(lang, "staffRole")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t(lang, "branch")}</Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => setForm({ ...form, branchId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t(lang, "selectBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{lang === "fr" ? "Aucune" : "None"}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t(lang, "cancel")}</Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {t(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
