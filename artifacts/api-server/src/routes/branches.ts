import { Router } from "express";
import { db } from "@workspace/db";
import { branchesTable, inventoryItemsTable, stockMovementsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth, requireOwner } from "./auth";

const router = Router();

router.get("/branches", requireAuth, async (_req: any, res: any) => {
  try {
    const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);
    return res.json(branches);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/branches", requireAuth, requireOwner, async (req: any, res: any) => {
  try {
    const { name, city, manager, phone } = req.body;
    const [branch] = await db
      .insert(branchesTable)
      .values({ name, city, manager, phone })
      .returning();
    return res.status(201).json(branch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/branches/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
    if (!branch) return res.status(404).json({ error: "Not found" });
    return res.json(branch);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/branches/:id", requireAuth, requireOwner, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { name, city, manager, phone } = req.body;
    const [branch] = await db
      .update(branchesTable)
      .set({ name, city, manager, phone })
      .where(eq(branchesTable.id, id))
      .returning();
    if (!branch) return res.status(404).json({ error: "Not found" });
    return res.json(branch);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/branches/:id", requireAuth, requireOwner, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(branchesTable).where(eq(branchesTable.id, id));
    return res.status(204).send();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/branches/:id/stats", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
    if (!branch) return res.status(404).json({ error: "Not found" });

    const items = await db
      .select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.branchId, id));

    const totalItems = items.length;
    const lowStockItems = items.filter(
      (i) => parseFloat(i.quantity) <= parseFloat(i.minThreshold),
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMovements = await db
      .select()
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.branchId, id),
          gte(stockMovementsTable.createdAt, today),
        ),
      );

    const totalMovementsToday = todayMovements.length;
    const missingLostToday = todayMovements
      .filter((m) => m.type === "missing_lost")
      .reduce((sum, m) => sum + parseFloat(m.quantity), 0);
    const damagedToday = todayMovements
      .filter((m) => m.type === "damaged")
      .reduce((sum, m) => sum + parseFloat(m.quantity), 0);

    return res.json({
      branchId: id,
      branchName: branch.name,
      totalItems,
      lowStockItems,
      totalMovementsToday,
      missingLostToday,
      damagedToday,
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
