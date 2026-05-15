import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable, branchesTable, inventoryItemsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, requireOwner } from "./auth";

const router = Router();

type AuditMovementType = "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";

router.get(["/audit", "/audit-logs"], requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const { branchId, userId, itemId, movementType, dateFrom, dateTo, limit } = query;

    const conditions: Parameters<typeof and>[0][] = [];
    if (branchId) conditions.push(eq(auditLogsTable.branchId, parseInt(branchId)));
    if (userId) conditions.push(eq(auditLogsTable.userId, parseInt(userId)));
    if (itemId) conditions.push(eq(auditLogsTable.itemId, parseInt(itemId)));
    if (movementType) conditions.push(eq(auditLogsTable.movementType, movementType as AuditMovementType));
    if (dateFrom) conditions.push(gte(auditLogsTable.timestamp, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogsTable.timestamp, end));
    }

    const logs = await db
      .select({
        id: auditLogsTable.id,
        userId: auditLogsTable.userId,
        userName: usersTable.name,
        branchId: auditLogsTable.branchId,
        branchName: branchesTable.name,
        itemId: auditLogsTable.itemId,
        itemName: inventoryItemsTable.name,
        quantityChange: auditLogsTable.quantityChange,
        movementType: auditLogsTable.movementType,
        note: auditLogsTable.note,
        timestamp: auditLogsTable.timestamp,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
      .leftJoin(branchesTable, eq(auditLogsTable.branchId, branchesTable.id))
      .leftJoin(inventoryItemsTable, eq(auditLogsTable.itemId, inventoryItemsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogsTable.timestamp))
      .limit(limit ? parseInt(limit) : 100);

    return res.json(logs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
