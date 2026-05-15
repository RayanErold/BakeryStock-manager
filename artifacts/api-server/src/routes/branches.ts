import { Router } from "express";
import type { RequestHandler, Request, Response } from "express";
import { db } from "@workspace/db";
import { branchesTable, inventoryItemsTable, stockMovementsTable, usersTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth, requireOwner } from "./auth";
import type { AuthedRequest } from "../types/express";

const router = Router();

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return user ?? null;
}

router.get("/branches", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff") {
      if (!currentUser.branchId) {
        return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
      }
      const [branch] = await db
        .select()
        .from(branchesTable)
        .where(eq(branchesTable.id, currentUser.branchId))
        .limit(1);
      return res.json(branch ? [branch] : []);
    }

    const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);
    return res.json(branches);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/branches", requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const { name, city, manager, phone } = req.body as {
      name: string; city: string; manager: string; phone: string;
    };
    const [branch] = await db
      .insert(branchesTable)
      .values({ name, city, manager, phone })
      .returning();
    return res.status(201).json(branch);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

router.get("/branches/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff") {
      if (!currentUser.branchId || currentUser.branchId !== id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
    if (!branch) return res.status(404).json({ error: "Not found" });
    return res.json(branch);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/branches/:id", requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, city, manager, phone } = req.body as {
      name?: string; city?: string; manager?: string; phone?: string;
    };
    const [branch] = await db
      .update(branchesTable)
      .set({ name, city, manager, phone })
      .where(eq(branchesTable.id, id))
      .returning();
    if (!branch) return res.status(404).json({ error: "Not found" });
    return res.json(branch);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/branches/:id", requireAuth, requireOwner, (async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(branchesTable).where(eq(branchesTable.id, id));
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

router.get("/branches/:id/stats", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    if (currentUser.role === "staff") {
      if (!currentUser.branchId || currentUser.branchId !== id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

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
      .where(and(eq(stockMovementsTable.branchId, id), gte(stockMovementsTable.createdAt, today)));

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
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
