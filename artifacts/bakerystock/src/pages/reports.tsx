import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/authToken";
import { useAppContext } from "@/contexts/AppContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, FileText, BarChart3, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Branch {
  id: number;
  name: string;
}

type ReportType = "daily" | "weekly" | "missing" | "damaged" | "branch_activity";
type ReportFormat = "csv" | "print";

const REPORT_TYPES: Array<{ value: ReportType; icon: typeof BarChart3; colorClass: string }> = [
  { value: "daily", icon: BarChart3, colorClass: "bg-amber-100 text-amber-700" },
  { value: "weekly", icon: BarChart3, colorClass: "bg-orange-100 text-orange-700" },
  { value: "missing", icon: AlertTriangle, colorClass: "bg-red-100 text-red-700" },
  { value: "damaged", icon: AlertTriangle, colorClass: "bg-rose-100 text-rose-700" },
  { value: "branch_activity", icon: FileText, colorClass: "bg-stone-100 text-stone-700" },
];

const reportLabels: Record<ReportType, { en: string; fr: string; descEn: string; descFr: string }> = {
  daily: {
    en: "Daily Report",
    fr: "Rapport journalier",
    descEn: "All movements and stock status for today",
    descFr: "Tous les mouvements et statut des stocks du jour",
  },
  weekly: {
    en: "Weekly Report",
    fr: "Rapport hebdomadaire",
    descEn: "Summary of the last 7 days",
    descFr: "Résumé des 7 derniers jours",
  },
  missing: {
    en: "Missing Items",
    fr: "Articles manquants",
    descEn: "All items reported missing or lost",
    descFr: "Tous les articles signalés manquants ou perdus",
  },
  damaged: {
    en: "Damaged Items",
    fr: "Articles endommagés",
    descEn: "All items reported as damaged",
    descFr: "Tous les articles signalés endommagés",
  },
  branch_activity: {
    en: "Branch Activity",
    fr: "Activité par succursale",
    descEn: "Movement totals broken down by branch",
    descFr: "Totaux des mouvements ventilés par succursale",
  },
};

/** Build auth headers using Clerk token when available, falling back to dev header. */
async function reportAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (token) return { Authorization: `Bearer ${token}` };
  const devId = localStorage.getItem("dev_clerk_id");
  return devId ? { "X-Dev-User-Id": devId } : {};
}

export default function ReportsPage() {
  const { lang } = useAppContext();
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [format, setFormat] = useState<ReportFormat>("csv");
  const [branchId, setBranchId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const buildParams = (fmt: ReportFormat) =>
    new URLSearchParams({
      type: reportType,
      format: fmt,
      ...(branchId !== "all" && { branchId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    });

  const downloadCsv = async () => {
    setLoading(true);
    try {
      const headers = await reportAuthHeaders();
      const res = await fetch(`/api/reports?${buildParams("csv")}`, { headers });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bakerystock-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(lang === "fr" ? "Rapport CSV téléchargé" : "CSV report downloaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const printPdf = async () => {
    setLoading(true);
    try {
      // Backend returns printable HTML for format=pdf (open in new tab → print dialog)
      const headers = await reportAuthHeaders();
      const res = await fetch(`/api/reports?${buildParams("print")}`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const html = await res.text();

      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "reports")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {lang === "fr"
            ? "Exportez en CSV ou imprimez en PDF"
            : "Export to CSV or print as PDF"}
        </p>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_TYPES.map(({ value, icon: Icon, colorClass }) => {
          const labels = reportLabels[value];
          return (
            <button
              key={value}
              onClick={() => setReportType(value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                reportType === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="font-semibold text-sm text-foreground">{labels[lang]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lang === "fr" ? labels.descFr : labels.descEn}
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{lang === "fr" ? "Configuration" : "Report Options"}</CardTitle>
          <CardDescription>
            {lang === "fr" ? "Personnalisez votre rapport" : "Customize your report"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t(lang, "branch")}</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
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
            <div>
              <Label>{t(lang, "format")}</Label>
              <Select value={format} onValueChange={(v: ReportFormat) => setFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="print">PDF ({lang === "fr" ? "impression" : "print"})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t(lang, "dateFrom")}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>{t(lang, "dateTo")}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {format === "csv" ? (
              <Button onClick={downloadCsv} disabled={loading} className="gap-2">
                <Download className="w-4 h-4" />
                {t(lang, "download")} CSV
              </Button>
            ) : (
              <Button onClick={printPdf} disabled={loading} className="gap-2">
                <FileText className="w-4 h-4" />
                {lang === "fr" ? "Aperçu / Imprimer PDF" : "Preview / Print PDF"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
