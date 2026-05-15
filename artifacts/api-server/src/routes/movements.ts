import { Router } from "express";
import { db } from "@workspace/db";
import {
  stockMovementsTable,
  auditLogsTable,
  inventoryItemsTable,
  branchesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

router.get("/movements", requireAuth, async (req: any, res: any) => {
  try {
    const { branchId, itemId, type, dateFrom, dateTo, limit } = req.query;

    const conditions: any[] = [];
    if (branchId) conditions.push(eq(stockMovementsTable.branchId, parseInt(branchId as string)));
    if (itemId) conditions.push(eq(stockMovementsTable.itemId, parseInt(itemId as string)));
    if (type) conditions.push(eq(stockMovementsTable.type, type as string));
    if (dateFrom) conditions.push(gte(stockMovementsTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) {
      const end = new Date(dateTo as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(stockMovementsTable.createdAt, end));
    }

    const movements = await db
      .select({
        id: stockMovementsTable.id,
        itemId: stockMovementsTable.itemId,
        itemName: inventoryItemsTable.name,
        branchId: stockMovementsTable.branchId,
        branchName: branchesTable.name,
        userId: stockMovementsTable.userId,
        userName: usersTable.name,
        type: stockMovementsTable.type,
        quantity: stockMovementsTable.quantity,
        note: stockMovementsTable.note,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(parseInt((limit as string) ?? "50"));

    return res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/movements", requireAuth, async (req: any, res: any) => {
  try {
    const { itemId, branchId, type, quantity, note } = req.body;

    const [localUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId))
      .limit(1);

    if (!localUser) return res.status(404).json({ error: "User not found" });

    const [movement] = await db
      .insert(stockMovementsTable)
      .values({
        itemId,
        branchId,
        userId: localUser.id,
        type,
        quantity: String(quantity),
        note,
      })
      .returning();

    await db.insert(auditLogsTable).values({
      userId: localUser.id,
      branchId,
      itemId,
      quantityChange: String(quantity),
      movementType: type,
      note,
    });

    const sign = type === "stock_in" || type === "returned" ? 1 : -1;
    await db
      .update(inventoryItemsTable)
      .set({
        quantity: sql`${inventoryItemsTable.quantity} + ${sign * parseFloat(quantity)}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItemsTable.id, itemId));

    const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId)).limit(1);
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);

    return res.status(201).json({
      ...movement,
      itemName: item?.name ?? null,
      branchName: branch?.name ?? null,
      userName: localUser.name,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/movements/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const [movement] = await db
      .select({
        id: stockMovementsTable.id,
        itemId: stockMovementsTable.itemId,
        itemName: inventoryItemsTable.name,
        branchId: stockMovementsTable.branchId,
        branchName: branchesTable.name,
        userId: stockMovementsTable.userId,
        userName: usersTable.name,
        type: stockMovementsTable.type,
        quantity: stockMovementsTable.quantity,
        note: stockMovementsTable.note,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(eq(stockMovementsTable.id, id))
      .limit(1);

    if (!movement) return res.status(404).json({ error: "Not found" });
    return res.json(movement);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
