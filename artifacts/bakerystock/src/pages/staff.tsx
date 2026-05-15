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
import { Plus, Pencil, Trash2, Search, Mail } from "lucide-react";
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

type StaffRole = "owner" | "staff";

/** Sentinel value for "no branch assigned" in Radix Select (empty string is not allowed). */
const NO_BRANCH = "none";

const emptyEditForm = { role: "staff" as StaffRole, branchId: NO_BRANCH };
const emptyCreateForm = { name: "", email: "", clerkId: "", role: "staff" as StaffRole, branchId: NO_BRANCH };

/** Convert the Select branchId sentinel back to null or a number for the API. */
function branchIdToApi(value: string): number | null {
  return value === NO_BRANCH || value === "" ? null : Number(value);
}

export default function StaffPage() {
  const { lang } = useAppContext();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyEditForm });
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: () => api.get<StaffMember[]>("/auth/users"),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) =>
      api.post("/auth/users", {
        name: data.name,
        email: data.email,
        role: data.role,
        branchId: branchIdToApi(data.branchId),
        ...(data.clerkId.trim() && { clerkId: data.clerkId.trim() }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t(lang, "saveSuccess"));
      setCreateOpen(false);
      setCreateForm({ ...emptyCreateForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role: StaffRole; branchId: number | null } }) =>
      api.put(`/auth/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t(lang, "saveSuccess"));
      setEditOpen(false);
      setEditMember(null);
      setEditForm({ ...emptyEditForm });
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

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      api.post("/auth/invite", { email }),
    onSuccess: () => {
      toast.success(t(lang, "inviteSent"));
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleInvite = () => {
    const trimmed = inviteEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error(lang === "fr" ? "Adresse e-mail invalide" : "Please enter a valid email address");
      return;
    }
    inviteMutation.mutate(trimmed);
  };

  const openEdit = (member: StaffMember) => {
    setEditMember(member);
    setEditForm({
      role: member.role,
      branchId: member.branchId ? String(member.branchId) : NO_BRANCH,
    });
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!createForm.name || !createForm.email) {
      toast.error(lang === "fr" ? "Nom et email requis" : "Name and email are required");
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleUpdate = () => {
    if (!editMember) return;
    updateMutation.mutate({
      id: editMember.id,
      data: {
        role: editForm.role,
        branchId: branchIdToApi(editForm.branchId),
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
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">{t(lang, "inviteStaff")}</span>
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t(lang, "addStaff")}</span>
          </Button>
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

      {/* Create Staff Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(lang, "addStaff")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === "fr" ? "Nom complet" : "Full Name"} *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={lang === "fr" ? "Ex: Marie Dupont" : "Ex: Marie Dupont"}
              />
            </div>
            <div>
              <Label>{t(lang, "email")} *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@bakery.cm"
              />
            </div>
            <div>
              <Label>
                {lang === "fr" ? "Clerk User ID (optionnel)" : "Clerk User ID (optional)"}
              </Label>
              <Input
                value={createForm.clerkId}
                onChange={(e) => setCreateForm({ ...createForm, clerkId: e.target.value })}
                placeholder="user_2abc..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "fr"
                  ? "Permet au membre de se connecter via Clerk. Laissez vide pour un compte demo."
                  : "Allows the member to sign in via Clerk. Leave blank for a demo account."}
              </p>
            </div>
            <div>
              <Label>{t(lang, "role")}</Label>
              <Select
                value={createForm.role}
                onValueChange={(v: StaffRole) => setCreateForm({ ...createForm, role: v })}
              >
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
                value={createForm.branchId}
                onValueChange={(v) => setCreateForm({ ...createForm, branchId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t(lang, "selectBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BRANCH}>{lang === "fr" ? "Aucune" : "None"}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t(lang, "cancel")}</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {t(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Staff Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteEmail(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(lang, "inviteByEmail")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {lang === "fr"
                ? "Entrez l'adresse e-mail du membre du personnel. Il/Elle recevra un lien pour créer son compte."
                : "Enter the staff member's email address. They will receive a link to create their account."}
            </p>
            <div>
              <Label htmlFor="invite-email">{t(lang, "inviteEmailLabel")}</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="staff@bakery.cm"
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{t(lang, "cancel")}</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {t(lang, "sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t(lang, "edit")} — {editMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t(lang, "role")}</Label>
              <Select
                value={editForm.role}
                onValueChange={(v: StaffRole) => setEditForm({ ...editForm, role: v })}
              >
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
                value={editForm.branchId}
                onValueChange={(v) => setEditForm({ ...editForm, branchId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t(lang, "selectBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BRANCH}>{lang === "fr" ? "Aucune" : "None"}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t(lang, "cancel")}</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {t(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
