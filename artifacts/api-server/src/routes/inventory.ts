import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryItemsTable, branchesTable } from "@workspace/db";
import { eq, and, ilike, lte, sql } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

router.get("/inventory", requireAuth, async (req: any, res: any) => {
  try {
    const { branchId, category, search, lowStock } = req.query;

    const conditions: any[] = [];
    if (branchId) conditions.push(eq(inventoryItemsTable.branchId, parseInt(branchId as string)));
    if (category) conditions.push(eq(inventoryItemsTable.category, category as string));
    if (search) conditions.push(ilike(inventoryItemsTable.name, `%${search as string}%`));

    const items = await db
      .select({
        id: inventoryItemsTable.id,
        name: inventoryItemsTable.name,
        category: inventoryItemsTable.category,
        quantity: inventoryItemsTable.quantity,
        unit: inventoryItemsTable.unit,
        minThreshold: inventoryItemsTable.minThreshold,
        branchId: inventoryItemsTable.branchId,
        branchName: branchesTable.name,
        createdAt: inventoryItemsTable.createdAt,
        updatedAt: inventoryItemsTable.updatedAt,
      })
      .from(inventoryItemsTable)
      .leftJoin(branchesTable, eq(inventoryItemsTable.branchId, branchesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(inventoryItemsTable.name);

    const result = items.map((item) => ({
      ...item,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    }));

    const filtered =
      lowStock === "true" ? result.filter((i) => i.isLowStock) : result;

    return res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inventory", requireAuth, async (req: any, res: any) => {
  try {
    const { name, category, quantity, unit, minThreshold, branchId } = req.body;
    const [item] = await db
      .insert(inventoryItemsTable)
      .values({ name, category, quantity: String(quantity), unit, minThreshold: String(minThreshold), branchId })
      .returning();

    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, item.branchId)).limit(1);

    return res.status(201).json({
      ...item,
      branchName: branch?.name ?? null,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/inventory/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const [item] = await db
      .select({
        id: inventoryItemsTable.id,
        name: inventoryItemsTable.name,
        category: inventoryItemsTable.category,
        quantity: inventoryItemsTable.quantity,
        unit: inventoryItemsTable.unit,
        minThreshold: inventoryItemsTable.minThreshold,
        branchId: inventoryItemsTable.branchId,
        branchName: branchesTable.name,
        createdAt: inventoryItemsTable.createdAt,
        updatedAt: inventoryItemsTable.updatedAt,
      })
      .from(inventoryItemsTable)
      .leftJoin(branchesTable, eq(inventoryItemsTable.branchId, branchesTable.id))
      .where(eq(inventoryItemsTable.id, id))
      .limit(1);

    if (!item) return res.status(404).json({ error: "Not found" });

    return res.json({
      ...item,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inventory/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, quantity, unit, minThreshold, branchId } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (quantity !== undefined) updateData.quantity = String(quantity);
    if (unit !== undefined) updateData.unit = unit;
    if (minThreshold !== undefined) updateData.minThreshold = String(minThreshold);
    if (branchId !== undefined) updateData.branchId = branchId;
    updateData.updatedAt = new Date();

    const [item] = await db
      .update(inventoryItemsTable)
      .set(updateData)
      .where(eq(inventoryItemsTable.id, id))
      .returning();

    if (!item) return res.status(404).json({ error: "Not found" });

    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, item.branchId)).limit(1);

    return res.json({
      ...item,
      branchName: branch?.name ?? null,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/inventory/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
    return res.status(204).send();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
