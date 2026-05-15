import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryItemsTable, branchesTable, usersTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);
  return user ?? null;
}

async function buildItemsQuery(conditions: Parameters<typeof and>[0][]) {
  return db
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
}

router.get("/inventory", requireAuth, async (req: any, res: any) => {
  try {
    const { category, search, lowStock } = req.query;
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const conditions: Parameters<typeof and>[0][] = [];

    // Staff see only their branch; owners see all (or a specific filter)
    if (currentUser.role === "staff" && currentUser.branchId) {
      conditions.push(eq(inventoryItemsTable.branchId, currentUser.branchId));
    } else {
      const { branchId } = req.query;
      if (branchId) conditions.push(eq(inventoryItemsTable.branchId, parseInt(branchId as string)));
    }

    if (category) conditions.push(eq(inventoryItemsTable.category, category as string));
    if (search) conditions.push(ilike(inventoryItemsTable.name, `%${search as string}%`));

    const items = await buildItemsQuery(conditions);

    const result = items.map((item) => ({
      ...item,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    }));

    return res.json(lowStock === "true" ? result.filter((i) => i.isLowStock) : result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated low-stock endpoint
router.get("/inventory/low-stock", requireAuth, async (req: any, res: any) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const conditions: Parameters<typeof and>[0][] = [];
    if (currentUser.role === "staff" && currentUser.branchId) {
      conditions.push(eq(inventoryItemsTable.branchId, currentUser.branchId));
    } else {
      const { branchId } = req.query;
      if (branchId) conditions.push(eq(inventoryItemsTable.branchId, parseInt(branchId as string)));
    }

    const items = await buildItemsQuery(conditions);
    const lowStock = items.filter((i) => parseFloat(i.quantity) <= parseFloat(i.minThreshold));

    return res.json(
      lowStock.map((item) => ({
        ...item,
        isLowStock: true,
        deficit: (parseFloat(item.minThreshold) - parseFloat(item.quantity)).toFixed(2),
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inventory", requireAuth, async (req: any, res: any) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const { name, category, quantity, unit, minThreshold } = req.body;
    let { branchId } = req.body;

    // Staff can only add to their own branch
    if (currentUser.role === "staff") {
      branchId = currentUser.branchId;
    }
    if (!branchId) return res.status(400).json({ error: "branchId is required" });

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
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const [item] = await buildItemsQuery([eq(inventoryItemsTable.id, id)]);

    if (!item) return res.status(404).json({ error: "Not found" });

    // Staff can only view their branch
    if (currentUser.role === "staff" && currentUser.branchId && item.branchId !== currentUser.branchId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      ...item,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/inventory/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    // Verify branch ownership for staff
    if (currentUser.role === "staff") {
      const [existing] = await buildItemsQuery([eq(inventoryItemsTable.id, id)]);
      if (!existing) return res.status(404).json({ error: "Not found" });
      if (currentUser.branchId && existing.branchId !== currentUser.branchId) {
        return res.status(403).json({ error: "Forbidden: staff can only edit items in their branch" });
      }
    }

    const { name, category, quantity, unit, minThreshold, branchId } = req.body;
    type UnitType = "kg" | "bags" | "liters" | "boxes" | "pieces" | "trays";
    const updateData: Partial<{
      name: string; category: string; quantity: string; unit: UnitType;
      minThreshold: string; branchId: number; updatedAt: Date;
    }> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (quantity !== undefined) updateData.quantity = String(quantity);
    if (unit !== undefined) updateData.unit = unit as UnitType;
    if (minThreshold !== undefined) updateData.minThreshold = String(minThreshold);
    // Staff cannot reassign to another branch
    if (branchId !== undefined && currentUser.role === "owner") updateData.branchId = branchId;
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/inventory/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff") {
      return res.status(403).json({ error: "Forbidden: only owners can delete inventory items" });
    }

    await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
    return res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
