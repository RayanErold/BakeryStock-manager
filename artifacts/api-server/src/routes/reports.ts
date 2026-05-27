import { Router } from "express";
import type { Response } from "express";
import { db } from "@workspace/db";
import {
  stockMovementsTable,
  inventoryItemsTable,
  branchesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "./auth";
import type { AuthedRequest } from "../types/express";

const router = Router();

type MovementType = "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return user ?? null;
}

/** HTML-escape all user-derived values to prevent XSS. */
function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    const vals = headers.map((h) => {
      const val = row[h] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(vals.join(","));
  }
  return csvRows.join("\n");
}

const translations = {
  fr: {
    // Report Titles
    dailyReport: "Rapport Journalier",
    weeklyReport: "Rapport Hebdomadaire",
    missingReport: "Rapport des Articles Manquants",
    damagedReport: "Rapport des Articles Endommagés",
    branchActivityReport: "Rapport d'Activité par Succursale",
    genericReport: "Rapport",

    // Metadata
    generated: "Généré le",
    branch: "Succursale",
    
    // Headers / Fields
    id: "ID",
    itemName: "Nom de l'article",
    branchName: "Succursale",
    userName: "Utilisateur",
    type: "Type",
    quantity: "Quantité",
    unit: "Unité",
    note: "Note",
    createdAt: "Date de création",

    // Branch activity headers
    movementCount: "Nombre de mouvements",
    totalStockIn: "Total des entrées",
    totalUsed: "Total utilisé",
    totalDamaged: "Total endommagé",
    totalMissing: "Total manquant",

    // Movement types
    stock_in: "Entrée de stock",
    used_in_production: "Utilisé en production",
    sold: "Vendu",
    damaged: "Endommagé",
    missing_lost: "Manquant / Perdu",
    returned: "Retourné",
  },
  en: {
    // Report Titles
    dailyReport: "Daily Report",
    weeklyReport: "Weekly Report",
    missingReport: "Missing / Lost Report",
    damagedReport: "Damaged Goods Report",
    branchActivityReport: "Branch Activity Report",
    genericReport: "Report",

    // Metadata
    generated: "Generated on",
    branch: "Branch",

    // Headers / Fields
    id: "ID",
    itemName: "Item Name",
    branchName: "Branch",
    userName: "User",
    type: "Type",
    quantity: "Quantity",
    unit: "Unit",
    note: "Note",
    createdAt: "Created At",

    // Branch activity headers
    movementCount: "Movement Count",
    totalStockIn: "Total Stock In",
    totalUsed: "Total Used",
    totalDamaged: "Total Damaged",
    totalMissing: "Total Missing",

    // Movement types
    stock_in: "Stock In",
    used_in_production: "Used in Production",
    sold: "Sold",
    damaged: "Damaged",
    missing_lost: "Missing / Lost",
    returned: "Returned",
  }
};

function formatDate(date: Date | null | undefined, locale: string): string {
  if (!date) return "";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

router.get(["/reports", "/reports/download"], requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff" && !currentUser.branchId) {
      return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
    }

    const query = req.query as Record<string, string | undefined>;
    const { type, format, dateFrom, dateTo, startDate, endDate, lang } = query;
    const effectiveDateFrom = dateFrom || startDate;
    const effectiveDateTo = dateTo || endDate;

    const isFr = String(lang || "").toLowerCase().startsWith("fr");
    const t = isFr ? translations.fr : translations.en;
    const locale = isFr ? "fr-FR" : "en-US";

    if (!type || !format) {
      return res.status(400).json({ error: "type and format are required" });
    }

    if (!["csv", "pdf"].includes(format)) {
      return res.status(400).json({ error: "format must be csv or pdf" });
    }

    // Resolve effective branch: staff always scoped to their branch
    const effectiveBranchId: number | null =
      currentUser.role === "staff"
        ? currentUser.branchId!
        : query.branchId
        ? parseInt(query.branchId)
        : null;

    // ── Time window helpers ────────────────────────────────────────────────
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);

    // Compute dateFrom/dateTo window (explicit override or per-type default)
    let windowStart: Date | null = effectiveDateFrom ? new Date(effectiveDateFrom) : null;
    let windowEnd: Date | null = null;
    if (effectiveDateTo) { windowEnd = new Date(effectiveDateTo); windowEnd.setHours(23, 59, 59, 999); }

    if (!windowStart) {
      if (type === "daily") windowStart = startOfDay;
      else if (type === "weekly") windowStart = startOfWeek;
    }

    // ── Build WHERE conditions ────────────────────────────────────────────
    const conditions: Parameters<typeof and>[0][] = [];
    if (effectiveBranchId) conditions.push(eq(stockMovementsTable.branchId, effectiveBranchId));
    if (windowStart) conditions.push(gte(stockMovementsTable.createdAt, windowStart));
    if (windowEnd) conditions.push(lte(stockMovementsTable.createdAt, windowEnd));

    // Type-specific movement filters
    if (type === "missing") {
      conditions.push(eq(stockMovementsTable.type, "missing_lost" as MovementType));
    } else if (type === "damaged") {
      conditions.push(eq(stockMovementsTable.type, "damaged" as MovementType));
    }
    // daily / weekly / branch_activity include all movement types in the window

    // ── Branch activity: aggregate per branch ────────────────────────────
    if (type === "branch_activity") {
      const activityRows = await db
        .select({
          branchName: branchesTable.name,
          movementCount: sql<number>`count(*)::int`,
          totalStockIn: sql<number>`sum(case when ${stockMovementsTable.type} = 'stock_in' then ${stockMovementsTable.quantity}::numeric else 0 end)`,
          totalUsed: sql<number>`sum(case when ${stockMovementsTable.type} = 'used_in_production' then ${stockMovementsTable.quantity}::numeric else 0 end)`,
          totalDamaged: sql<number>`sum(case when ${stockMovementsTable.type} = 'damaged' then ${stockMovementsTable.quantity}::numeric else 0 end)`,
          totalMissing: sql<number>`sum(case when ${stockMovementsTable.type} = 'missing_lost' then ${stockMovementsTable.quantity}::numeric else 0 end)`,
        })
        .from(stockMovementsTable)
        .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(branchesTable.name);

      const activityHeaders = ["branchName", "movementCount", "totalStockIn", "totalUsed", "totalDamaged", "totalMissing"];
      const csvData = toCSV(activityRows.map((r) => ({
        branchName: r.branchName ?? "",
        movementCount: r.movementCount,
        totalStockIn: Number(r.totalStockIn).toFixed(2),
        totalUsed: Number(r.totalUsed).toFixed(2),
        totalDamaged: Number(r.totalDamaged).toFixed(2),
        totalMissing: Number(r.totalMissing).toFixed(2),
      })), activityHeaders);

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="bakerystock-branch-activity-report.csv"`);
        return res.send(csvData);
      }

      // print: returns printable HTML (open in new tab → browser print dialog → save as PDF)
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>BakeryStock ${escapeHtml(t.branchActivityReport)}</title>
<style>body{font-family:Arial,sans-serif;margin:20px}h1{color:#B45309}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
th{background:#F59E0B;color:white}tr:nth-child(even){background:#FEF3C7}</style></head>
<body><h1>${escapeHtml(t.branchActivityReport)}</h1>
<p>${escapeHtml(t.generated)}: ${formatDate(new Date(), locale)}</p>
<table><thead><tr>${activityHeaders.map((h) => `<th>${escapeHtml(t[h as keyof typeof t] ?? h)}</th>`).join("")}</tr></thead>
<tbody>${activityRows.map((r) => `<tr>
<td>${escapeHtml(r.branchName)}</td>
<td>${escapeHtml(String(r.movementCount))}</td>
<td>${escapeHtml(Number(r.totalStockIn).toFixed(2))}</td>
<td>${escapeHtml(Number(r.totalUsed).toFixed(2))}</td>
<td>${escapeHtml(Number(r.totalDamaged).toFixed(2))}</td>
<td>${escapeHtml(Number(r.totalMissing).toFixed(2))}</td>
</tr>`).join("")}</tbody></table></body></html>`);
    }

    // ── Default movement list (daily / weekly / missing / damaged / all) ──
    const movements = await db
      .select({
        id: stockMovementsTable.id,
        itemName: inventoryItemsTable.name,
        branchName: branchesTable.name,
        userName: usersTable.name,
        type: stockMovementsTable.type,
        quantity: stockMovementsTable.quantity,
        unit: inventoryItemsTable.unit,
        note: stockMovementsTable.note,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stockMovementsTable.createdAt));

    const headers = ["id", "itemName", "branchName", "userName", "type", "quantity", "unit", "note", "createdAt"];
    const csvData = toCSV(
      movements.map((m) => ({
        id: m.id,
        itemName: m.itemName ?? "",
        branchName: m.branchName ?? "",
        userName: m.userName ?? "",
        type: m.type,
        quantity: m.quantity,
        unit: m.unit ?? "",
        note: m.note ?? "",
        createdAt: m.createdAt?.toISOString() ?? "",
      })),
      headers,
    );

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="bakerystock-${escapeHtml(type)}-report.csv"`);
      return res.send(csvData);
    }

    // print: printable HTML — all DB values HTML-escaped; open in new tab → browser print → save as PDF
    const reportTitle = {
      daily: t.dailyReport,
      weekly: t.weeklyReport,
      missing: t.missingReport,
      damaged: t.damagedReport,
    }[type] ?? `${t.genericReport}: ${type}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BakeryStock ${escapeHtml(reportTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #B45309; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #F59E0B; color: white; }
    tr:nth-child(even) { background: #FEF3C7; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportTitle)}</h1>
  <p>${escapeHtml(t.generated)}: ${formatDate(new Date(), locale)}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(t[h as keyof typeof t] ?? h)}</th>`).join("")}</tr></thead>
    <tbody>
      ${movements.map((m) => `<tr>
        <td>${m.id}</td>
        <td>${escapeHtml(m.itemName)}</td>
        <td>${escapeHtml(m.branchName)}</td>
        <td>${escapeHtml(m.userName)}</td>
        <td>${escapeHtml(t[m.type as keyof typeof t] ?? m.type)}</td>
        <td>${escapeHtml(m.quantity)}</td>
        <td>${escapeHtml(m.unit)}</td>
        <td>${escapeHtml(m.note)}</td>
        <td>${formatDate(m.createdAt, locale)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</body>
</html>`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
