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

const router = Router();

function toCSV(rows: Record<string, any>[], headers: string[]): string {
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

router.get(["/reports", "/reports/download"], requireAuth, async (req: any, res: any) => {
  try {
    const { type, format, branchId, dateFrom, dateTo } = req.query;

    if (!type || !format) {
      return res.status(400).json({ error: "type and format are required" });
    }

    const conditions: any[] = [];
    if (branchId) conditions.push(eq(stockMovementsTable.branchId, parseInt(branchId as string)));
    if (dateFrom) conditions.push(gte(stockMovementsTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) {
      const end = new Date(dateTo as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(stockMovementsTable.createdAt, end));
    }

    if (type === "missing") {
      conditions.push(eq(stockMovementsTable.type, "missing_lost"));
    } else if (type === "damaged") {
      conditions.push(eq(stockMovementsTable.type, "damaged"));
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
      res.setHeader("Content-Disposition", `attachment; filename="bakerystock-${type}-report.csv"`);
      return res.send(csvData);
    }

    res.setHeader("Content-Type", "text/html");
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BakeryStock Report - ${type}</title>
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
  <h1>BakeryStock Report: ${type}</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>
      ${movements
        .map(
          (m) => `<tr>
        <td>${m.id}</td>
        <td>${m.itemName ?? ""}</td>
        <td>${m.branchName ?? ""}</td>
        <td>${m.userName ?? ""}</td>
        <td>${m.type}</td>
        <td>${m.quantity}</td>
        <td>${m.unit ?? ""}</td>
        <td>${m.note ?? ""}</td>
        <td>${m.createdAt?.toISOString() ?? ""}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;
    return res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
