import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable, branchesTable, inventoryItemsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, requireOwner } from "./auth";

const router = Router();

router.get(["/audit", "/audit-logs"], requireAuth, requireOwner, async (req: any, res: any) => {
  try {
    const { branchId, userId, itemId, movementType, dateFrom, dateTo, limit } = req.query;

    const conditions: any[] = [];
    if (branchId) conditions.push(eq(auditLogsTable.branchId, parseInt(branchId as string)));
    if (userId) conditions.push(eq(auditLogsTable.userId, parseInt(userId as string)));
    if (itemId) conditions.push(eq(auditLogsTable.itemId, parseInt(itemId as string)));
    if (movementType) conditions.push(eq(auditLogsTable.movementType, movementType as string));
    if (dateFrom) conditions.push(gte(auditLogsTable.timestamp, new Date(dateFrom as string)));
    if (dateTo) {
      const end = new Date(dateTo as string);
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
      .limit(parseInt((limit as string) ?? "100"));

    return res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
