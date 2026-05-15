import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { stockMovementsTable, auditLogsTable, inventoryItemsTable, branchesTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import type { AuthedRequest } from "../types/express";

const router = Router();

type MovementType = "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return user ?? null;
}

async function getOrgBranchIds(organizationId: string): Promise<number[]> {
  const rows = await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.organizationId, organizationId));
  return rows.map((r) => r.id);
}

router.get("/movements", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const { itemId, type, dateFrom, dateTo, limit } = query;
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const conditions: Parameters<typeof and>[0][] = [];

    if (currentUser.role === "staff") {
      if (!currentUser.branchId) return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
      conditions.push(eq(stockMovementsTable.branchId, currentUser.branchId));
    } else {
      if (query.branchId) {
        conditions.push(eq(stockMovementsTable.branchId, parseInt(query.branchId)));
      } else {
        const orgBranchIds = await getOrgBranchIds(currentUser.organizationId ?? "");
        if (orgBranchIds.length === 0) return res.json([]);
        const { inArray } = await import("drizzle-orm");
        conditions.push(inArray(stockMovementsTable.branchId, orgBranchIds));
      }
    }

    if (itemId) conditions.push(eq(stockMovementsTable.itemId, parseInt(itemId)));
    if (type) conditions.push(eq(stockMovementsTable.type, type as MovementType));
    if (dateFrom) conditions.push(gte(stockMovementsTable.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(stockMovementsTable.createdAt, end));
    }

    const movements = await db
      .select({ id: stockMovementsTable.id, itemId: stockMovementsTable.itemId, itemName: inventoryItemsTable.name, branchId: stockMovementsTable.branchId, branchName: branchesTable.name, userId: stockMovementsTable.userId, userName: usersTable.name, type: stockMovementsTable.type, quantity: stockMovementsTable.quantity, note: stockMovementsTable.note, createdAt: stockMovementsTable.createdAt })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(limit ? parseInt(limit) : 100);

    return res.json(movements);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.get("/movements/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    const [movement] = await db
      .select({ id: stockMovementsTable.id, itemId: stockMovementsTable.itemId, itemName: inventoryItemsTable.name, branchId: stockMovementsTable.branchId, branchName: branchesTable.name, userId: stockMovementsTable.userId, userName: usersTable.name, type: stockMovementsTable.type, quantity: stockMovementsTable.quantity, note: stockMovementsTable.note, createdAt: stockMovementsTable.createdAt })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(eq(stockMovementsTable.id, id))
      .limit(1);

    if (!movement) return res.status(404).json({ error: "Not found" });

    if (currentUser.role === "staff") {
      if (!currentUser.branchId) return res.status(403).json({ error: "Forbidden" });
      if (movement.branchId !== currentUser.branchId) return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(movement);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/movements", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });
    if (currentUser.role === "staff" && !currentUser.branchId) {
      return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
    }

    const { itemId, type, quantity, note } = req.body as {
      itemId: number; type: MovementType; quantity: number | string; note?: string; branchId?: number;
    };
    let branchId: number = (req.body as { branchId?: number }).branchId!;

    if (currentUser.role === "staff") branchId = currentUser.branchId!;
    if (!branchId) return res.status(400).json({ error: "branchId is required" });

    const parsedQty = parseFloat(String(quantity));
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }

    const [item] = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.id, itemId), eq(inventoryItemsTable.branchId, branchId)))
      .limit(1);
    if (!item) return res.status(404).json({ error: "Item not found in this branch" });

    const [movement] = await db
      .insert(stockMovementsTable)
      .values({ itemId, branchId, userId: currentUser.id, type, quantity: String(quantity), note: note ?? null })
      .returning();

    const delta = parsedQty;
    const isDeduction = !["stock_in", "returned"].includes(type);
    const newQty = isDeduction
      ? Math.max(0, parseFloat(item.quantity) - delta)
      : parseFloat(item.quantity) + delta;

    await db.update(inventoryItemsTable).set({ quantity: newQty.toFixed(3), updatedAt: new Date() }).where(eq(inventoryItemsTable.id, itemId));

    await db.insert(auditLogsTable).values({ userId: currentUser.id, branchId, itemId, movementType: type, quantityChange: String(parsedQty), note: note ?? null });

    return res.status(201).json(movement);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.put("/movements/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });
    if (currentUser.role !== "owner") return res.status(403).json({ error: "Forbidden: owner only" });

    const { note } = req.body as { note?: string };
    const [existing] = await db.select().from(stockMovementsTable).where(eq(stockMovementsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const [updated] = await db.update(stockMovementsTable).set({ note: note ?? null }).where(eq(stockMovementsTable.id, id)).returning();

    await db.insert(auditLogsTable).values({ userId: currentUser.id, branchId: existing.branchId, itemId: existing.itemId, movementType: existing.type, quantityChange: existing.quantity, note: `[note edited] ${note ?? ""}` });

    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.delete("/movements/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });
    if (currentUser.role !== "owner") return res.status(403).json({ error: "Forbidden: owner only" });

    const [existing] = await db.select().from(stockMovementsTable).where(eq(stockMovementsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    await db.delete(stockMovementsTable).where(eq(stockMovementsTable.id, id));
    await db.insert(auditLogsTable).values({ userId: currentUser.id, branchId: existing.branchId, itemId: existing.itemId, movementType: existing.type, quantityChange: existing.quantity, note: `[movement deleted] original note: ${existing.note ?? ""}` });

    return res.status(204).send();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
