import { Router } from "express";
import { db } from "@workspace/db";
import {
  stockMovementsTable,
  inventoryItemsTable,
  branchesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import type { AuthedRequest, Response } from "../types/express";

const router = Router();

type MovementType = "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return user ?? null;
}

/** Escape HTML special characters to prevent XSS when interpolating into HTML. */
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

router.get(["/reports", "/reports/download"], requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff" && !currentUser.branchId) {
      return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
    }

    const query = req.query as Record<string, string | undefined>;
    const { type, format, dateFrom, dateTo } = query;

    if (!type || !format) {
      return res.status(400).json({ error: "type and format are required" });
    }

    const effectiveBranchId =
      currentUser.role === "staff"
        ? currentUser.branchId!
        : query.branchId
        ? parseInt(query.branchId)
        : null;

    const conditions: Parameters<typeof and>[0][] = [];
    if (effectiveBranchId) conditions.push(eq(stockMovementsTable.branchId, effectiveBranchId));
    if (dateFrom) conditions.push(gte(stockMovementsTable.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(stockMovementsTable.createdAt, end));
    }

    if (type === "missing") {
      conditions.push(eq(stockMovementsTable.type, "missing_lost" as MovementType));
    } else if (type === "damaged") {
      conditions.push(eq(stockMovementsTable.type, "damaged" as MovementType));
    }

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

    // pdf/html: printable report — all user-derived values are HTML-escaped
    res.setHeader("Content-Type", "text/html");
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BakeryStock Report - ${escapeHtml(type)}</title>
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
  <h1>BakeryStock Report: ${escapeHtml(type)}</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>
      ${movements
        .map(
          (m) => `<tr>
        <td>${m.id}</td>
        <td>${escapeHtml(m.itemName)}</td>
        <td>${escapeHtml(m.branchName)}</td>
        <td>${escapeHtml(m.userName)}</td>
        <td>${escapeHtml(m.type)}</td>
        <td>${escapeHtml(m.quantity)}</td>
        <td>${escapeHtml(m.unit)}</td>
        <td>${escapeHtml(m.note)}</td>
        <td>${m.createdAt?.toISOString() ?? ""}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;
    return res.send(html);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
