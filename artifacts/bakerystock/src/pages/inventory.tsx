import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
import { Plus, Search, Pencil, Trash2, AlertTriangle, QrCode, ScanLine, Upload, Download, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QRCodePrintDialog from "@/components/QRCodePrintDialog";
import BarcodeScanner from "@/components/BarcodeScanner";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  minThreshold: string;
  barcode?: string | null;
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

interface CsvPreviewRow {
  rawItemId: string;
  rawItemName: string;
  barcode: string;
  matched: InventoryItem | null;
  ambiguous: boolean;
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
  barcode: "",
};

function parseCSVFields(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      } else {
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
  }
  return fields;
}

function parseCSV(text: string, items: InventoryItem[]): CsvPreviewRow[] | null {
  const bom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = bom.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const headers = parseCSVFields(lines[0]).map((h) => h.toLowerCase());

  const idCol = headers.findIndex((h) => h === "item_id" || h === "id");
  const nameCol = headers.findIndex((h) => h === "item_name" || h === "name");
  const barcodeCol = headers.findIndex((h) => h === "barcode");

  if (barcodeCol === -1 || (idCol === -1 && nameCol === -1)) return null;

  const rows: CsvPreviewRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVFields(line);

    const rawItemId = idCol !== -1 ? (cols[idCol] ?? "") : "";
    const rawItemName = nameCol !== -1 ? (cols[nameCol] ?? "") : "";
    const barcode = (cols[barcodeCol] ?? "").trim();

    if (!barcode) continue;

    let matched: InventoryItem | null = null;
    let ambiguous = false;

    if (rawItemId) {
      const numId = parseInt(rawItemId, 10);
      if (!isNaN(numId)) {
        matched = items.find((item) => item.id === numId) ?? null;
      }
    }

    if (!matched && rawItemName) {
      const nameMatches = items.filter(
        (item) => item.name.toLowerCase() === rawItemName.toLowerCase(),
      );
      if (nameMatches.length === 1) {
        matched = nameMatches[0];
      } else if (nameMatches.length > 1) {
        ambiguous = true;
      }
    }

    rows.push({ rawItemId, rawItemName, barcode, matched, ambiguous });
  }

  return rows.length > 0 ? rows : null;
}

function downloadSampleCSV() {
  const csv = "item_id,item_name,barcode\n1,Wheat Flour,1234567890123\n2,Sugar,9876543210987\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "barcode_import_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[] | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        barcode: data.barcode || null,
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
        barcode: data.barcode !== undefined ? (data.barcode || null) : undefined,
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

  const bulkBarcodeMutation = useMutation({
    mutationFn: (updates: Array<{ id: number; barcode: string }>) =>
      api.post<{ updated: number }>("/inventory/bulk-barcode", { updates }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`${t(lang, "importSuccess")} (${result.updated})`);
      setImportOpen(false);
      setCsvPreview(null);
      setCsvFileName("");
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
      barcode: item.barcode ?? "",
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

  const handleBarcodeScan = useCallback((code: string) => {
    setScannerOpen(false);
    const found = items.find((item) => item.barcode === code);
    if (!found) {
      toast.error(t(lang, "barcodeNotFound"));
      return;
    }
    setSearch("");
    setBranchFilter("all");
    setCategoryFilter("all");
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedId(found.id);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2500);
    setTimeout(() => {
      const el = itemRefs.current.get(found.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    toast.success(`${t(lang, "scanFoundPrefix")} ${found.name}`);
  }, [items, lang]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, items);
      if (!parsed) {
        toast.error(t(lang, "csvParseError"));
        setCsvPreview(null);
        return;
      }
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (!csvPreview) return;
    const matchedRows = csvPreview.filter((r) => r.matched !== null && !r.ambiguous);
    if (matchedRows.length === 0) {
      toast.error(t(lang, "noMatchedRows"));
      return;
    }
    const updates = matchedRows.map((r) => ({ id: r.matched!.id, barcode: r.barcode }));
    bulkBarcodeMutation.mutate(updates);
  };

  const handleImportDialogClose = (open: boolean) => {
    if (!open) {
      setCsvPreview(null);
      setCsvFileName("");
    }
    setImportOpen(open);
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === "all" || String(item.branchId) === branchFilter;
    const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchSearch && matchBranch && matchCategory;
  });

  const isLow = (item: InventoryItem) => Number(item.quantity) <= Number(item.minThreshold);

  const matchedCount = csvPreview?.filter((r) => r.matched !== null && !r.ambiguous).length ?? 0;
  const unmatchedCount = csvPreview?.filter((r) => r.matched === null && !r.ambiguous).length ?? 0;
  const ambiguousCount = csvPreview?.filter((r) => r.ambiguous).length ?? 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "inventory")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} {lang === "fr" ? "articles" : "items"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="gap-2"
            title={t(lang, "scanBarcode")}
          >
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">{t(lang, "scanBarcode")}</span>
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
              title={t(lang, "importBarcodes")}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t(lang, "importBarcodes")}</span>
            </Button>
          )}
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t(lang, "addItem")}</span>
          </Button>
        </div>
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
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
            >
              <Card
                className={cn(
                  isLow(item) && "border-orange-300 bg-orange-50/30",
                  highlightedId === item.id && "ring-2 ring-primary ring-offset-1 border-primary bg-primary/5 transition-all duration-300"
                )}
              >
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
                      {item.barcode && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                          <QrCode className="w-3 h-3 mr-1" />
                          {t(lang, "barcodeAssigned")}
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
                    {item.barcode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700"
                        title={t(lang, "printQR")}
                        onClick={() => setQrItem(item)}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    )}
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
            </div>
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
            <div>
              <Label>{t(lang, "barcodeOptional")}</Label>
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder={lang === "fr" ? "Ex: 3017620422003" : "Ex: 3017620422003"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "fr"
                  ? "Saisir manuellement ou utiliser un scanner USB. Un QR code sera généré automatiquement."
                  : "Type manually or use a USB scanner. A QR code will be generated automatically."}
              </p>
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

      {/* Barcode Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5" />
              {t(lang, "scanBarcode")}
            </DialogTitle>
          </DialogHeader>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setScannerOpen(false)}
            label={t(lang, "scanToFind")}
          />
        </DialogContent>
      </Dialog>

      {/* Import Barcodes Dialog */}
      <Dialog open={importOpen} onOpenChange={handleImportDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t(lang, "importBarcodesTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <p className="text-sm text-muted-foreground">{t(lang, "importBarcodesDesc")}</p>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCSV}
                className="gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                {t(lang, "csvInstructions")}
              </Button>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {csvFileName
                    ? csvFileName
                    : lang === "fr"
                    ? "Aucun fichier sélectionné"
                    : "No file selected"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {lang === "fr" ? "Choisir un fichier CSV" : "Choose CSV file"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {csvPreview && csvPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5 text-green-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {matchedCount} {t(lang, "matchedRows")}
                  </span>
                  {unmatchedCount > 0 && (
                    <span className="flex items-center gap-1.5 text-destructive font-medium">
                      <XCircle className="w-4 h-4" />
                      {unmatchedCount} {t(lang, "unmatchedRows")}
                    </span>
                  )}
                  {ambiguousCount > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      {ambiguousCount} {lang === "fr" ? "nom ambigu (utiliser item_id)" : "ambiguous name (use item_id)"}
                    </span>
                  )}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            {lang === "fr" ? "Ligne CSV" : "CSV Row"}
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            {t(lang, "barcode")}
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            {lang === "fr" ? "Article correspondant" : "Matched Item"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {csvPreview.map((row, i) => (
                          <tr
                            key={i}
                            className={
                              row.matched
                                ? "bg-background"
                                : row.ambiguous
                                ? "bg-amber-50/40"
                                : "bg-red-50/40"
                            }
                          >
                            <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                              {row.rawItemId
                                ? `ID: ${row.rawItemId}`
                                : row.rawItemName
                                ? row.rawItemName
                                : "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{row.barcode}</td>
                            <td className="px-3 py-2">
                              {row.matched ? (
                                <span className="flex items-center gap-1.5 text-green-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  {row.matched.name}
                                </span>
                              ) : row.ambiguous ? (
                                <span className="flex items-center gap-1.5 text-amber-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  {lang === "fr"
                                    ? "Plusieurs articles portent ce nom — utilisez item_id"
                                    : "Multiple items share this name — use item_id"}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-destructive">
                                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                                  {t(lang, "unmatchedRows")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 shrink-0">
            <Button variant="outline" onClick={() => handleImportDialogClose(false)}>
              {t(lang, "cancel")}
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!csvPreview || matchedCount === 0 || bulkBarcodeMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t(lang, "confirmImport")}
              {matchedCount > 0 && ` (${matchedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Print Dialog */}
      {qrItem && qrItem.barcode && (
        <QRCodePrintDialog
          open={!!qrItem}
          onOpenChange={(open) => { if (!open) setQrItem(null); }}
          itemName={qrItem.name}
          barcode={qrItem.barcode}
          lang={lang}
        />
      )}
    </div>
  );
}
