import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryItemsTable, branchesTable, usersTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth } from "./auth";
import type { AuthedRequest, Response } from "../types/express";

const router = Router();

type UnitType = "kg" | "g" | "bags" | "sacks" | "liters" | "ml" | "boxes" | "pieces" | "trays" | "units";

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

/** Deny if staff has no branch assigned. Returns true if denied. */
function denyUnassignedStaff(
  currentUser: { role: string; branchId: number | null },
  res: Response,
): boolean {
  if (currentUser.role === "staff" && !currentUser.branchId) {
    res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
    return true;
  }
  return false;
}

router.get("/inventory", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { category, search, lowStock } = req.query as Record<string, string | undefined>;
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });
    if (denyUnassignedStaff(currentUser, res)) return;

    const conditions: Parameters<typeof and>[0][] = [];

    if (currentUser.role === "staff") {
      conditions.push(eq(inventoryItemsTable.branchId, currentUser.branchId!));
    } else {
      const { branchId } = req.query as Record<string, string | undefined>;
      if (branchId) conditions.push(eq(inventoryItemsTable.branchId, parseInt(branchId)));
    }

    if (category) conditions.push(eq(inventoryItemsTable.category, category));
    if (search) conditions.push(ilike(inventoryItemsTable.name, `%${search}%`));

    const items = await buildItemsQuery(conditions);
    const result = items.map((item) => ({
      ...item,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold),
    }));

    return res.json(lowStock === "true" ? result.filter((i) => i.isLowStock) : result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.get("/inventory/low-stock", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });
    if (denyUnassignedStaff(currentUser, res)) return;

    const conditions: Parameters<typeof and>[0][] = [];
    if (currentUser.role === "staff") {
      conditions.push(eq(inventoryItemsTable.branchId, currentUser.branchId!));
    } else {
      const { branchId } = req.query as Record<string, string | undefined>;
      if (branchId) conditions.push(eq(inventoryItemsTable.branchId, parseInt(branchId)));
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/inventory", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });
    if (denyUnassignedStaff(currentUser, res)) return;

    const { name, category, quantity, unit, minThreshold } = req.body as {
      name: string; category: string; quantity: number | string;
      unit: UnitType; minThreshold: number | string; branchId?: number;
    };
    let branchId: number = (req.body as { branchId?: number }).branchId!;

    if (currentUser.role === "staff") {
      branchId = currentUser.branchId!;
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.get("/inventory/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    // Strict staff check: deny if unassigned, then verify item belongs to their branch
    if (currentUser.role === "staff") {
      if (!currentUser.branchId) {
        return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
      }
      const [item] = await buildItemsQuery([eq(inventoryItemsTable.id, id)]);
      if (!item) return res.status(404).json({ error: "Not found" });
      if (item.branchId !== currentUser.branchId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.json({ ...item, isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold) });
    }

    const [item] = await buildItemsQuery([eq(inventoryItemsTable.id, id)]);
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json({ ...item, isLowStock: parseFloat(item.quantity) <= parseFloat(item.minThreshold) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.put("/inventory/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    // Strict staff check: deny if unassigned, then verify ownership
    if (currentUser.role === "staff") {
      if (!currentUser.branchId) {
        return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
      }
      const [existing] = await buildItemsQuery([eq(inventoryItemsTable.id, id)]);
      if (!existing) return res.status(404).json({ error: "Not found" });
      if (existing.branchId !== currentUser.branchId) {
        return res.status(403).json({ error: "Forbidden: staff can only edit items in their branch" });
      }
    }

    const body = req.body as Partial<{
      name: string; category: string; quantity: number | string;
      unit: UnitType; minThreshold: number | string; branchId: number;
    }>;

    const updateData: Partial<{
      name: string; category: string; quantity: string;
      unit: UnitType; minThreshold: string; branchId: number; updatedAt: Date;
    }> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.quantity !== undefined) updateData.quantity = String(body.quantity);
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.minThreshold !== undefined) updateData.minThreshold = String(body.minThreshold);
    // Only owners can reassign branch
    if (body.branchId !== undefined && currentUser.role === "owner") updateData.branchId = body.branchId;
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.delete("/inventory/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff") {
      return res.status(403).json({ error: "Forbidden: only owners can delete inventory items" });
    }

    await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
    return res.status(204).send();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
