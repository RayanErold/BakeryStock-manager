import { Router } from "express";
import { db } from "@workspace/db";
import {
  stockMovementsTable,
  auditLogsTable,
  inventoryItemsTable,
  branchesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

type MovementType = "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);
  return user ?? null;
}

router.get("/movements", requireAuth, async (req: any, res: any) => {
  try {
    const { itemId, type, dateFrom, dateTo, limit } = req.query;
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const conditions: Parameters<typeof and>[0][] = [];

    // Branch isolation: staff see only their branch
    if (currentUser.role === "staff" && currentUser.branchId) {
      conditions.push(eq(stockMovementsTable.branchId, currentUser.branchId));
    } else {
      const { branchId } = req.query;
      if (branchId) conditions.push(eq(stockMovementsTable.branchId, parseInt(branchId as string)));
    }

    if (itemId) conditions.push(eq(stockMovementsTable.itemId, parseInt(itemId as string)));
    if (type) conditions.push(eq(stockMovementsTable.type, type as MovementType));
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
      .limit(limit ? parseInt(limit as string) : 100);

    return res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/movements", requireAuth, async (req: any, res: any) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const { itemId, type, quantity, note } = req.body;
    let { branchId } = req.body;

    // Staff must use their own branch
    if (currentUser.role === "staff") {
      branchId = currentUser.branchId;
    }
    if (!branchId) return res.status(400).json({ error: "branchId is required" });

    // Verify item belongs to this branch
    const [item] = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.id, itemId), eq(inventoryItemsTable.branchId, branchId)))
      .limit(1);

    if (!item) return res.status(404).json({ error: "Item not found in this branch" });

    const [movement] = await db
      .insert(stockMovementsTable)
      .values({
        itemId,
        branchId,
        userId: currentUser.id,
        type: type as MovementType,
        quantity: String(quantity),
        note: note || null,
      })
      .returning();

    // Update inventory quantity
    const delta = parseFloat(String(quantity));
    const isDeduction = !["stock_in", "returned"].includes(type);
    const newQty = isDeduction
      ? Math.max(0, parseFloat(item.quantity) - delta)
      : parseFloat(item.quantity) + delta;

    await db
      .update(inventoryItemsTable)
      .set({ quantity: newQty.toFixed(3), updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, itemId));

    // Write audit log
    await db.insert(auditLogsTable).values({
      userId: currentUser.id,
      branchId,
      itemId,
      movementType: type as MovementType,
      quantityChange: String(quantity),
      note: note || null,
    });

    return res.status(201).json(movement);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
