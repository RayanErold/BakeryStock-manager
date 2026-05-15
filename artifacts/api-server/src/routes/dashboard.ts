import { Router } from "express";
import type { Response } from "express";
import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  stockMovementsTable,
  branchesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import type { AuthedRequest } from "../types/express";

const router = Router();

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return user ?? null;
}

router.get(["/dashboard", "/dashboard/summary"], requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req.clerkUserId);
    if (!currentUser) return res.status(401).json({ error: "User not found" });

    // Staff are restricted to their own branch — deny if unassigned
    if (currentUser.role === "staff" && !currentUser.branchId) {
      return res.status(403).json({ error: "Forbidden: staff account has no branch assigned" });
    }

    // Branch filter: staff always scoped to their branch; owners may pass an optional ?branchId param
    const { branchId: queryBranchId } = req.query as Record<string, string | undefined>;
    const branchFilter: number | null =
      currentUser.role === "staff"
        ? currentUser.branchId!
        : queryBranchId
        ? parseInt(queryBranchId)
        : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Items query — always branch-scoped for staff
    const allItems = branchFilter
      ? await db
          .select({
            id: inventoryItemsTable.id,
            name: inventoryItemsTable.name,
            quantity: inventoryItemsTable.quantity,
            minThreshold: inventoryItemsTable.minThreshold,
            unit: inventoryItemsTable.unit,
            branchId: inventoryItemsTable.branchId,
            branchName: branchesTable.name,
          })
          .from(inventoryItemsTable)
          .leftJoin(branchesTable, eq(inventoryItemsTable.branchId, branchesTable.id))
          .where(eq(inventoryItemsTable.branchId, branchFilter))
      : await db
          .select({
            id: inventoryItemsTable.id,
            name: inventoryItemsTable.name,
            quantity: inventoryItemsTable.quantity,
            minThreshold: inventoryItemsTable.minThreshold,
            unit: inventoryItemsTable.unit,
            branchId: inventoryItemsTable.branchId,
            branchName: branchesTable.name,
          })
          .from(inventoryItemsTable)
          .leftJoin(branchesTable, eq(inventoryItemsTable.branchId, branchesTable.id));

    const totalItems = allItems.length;
    const lowStockAlerts = allItems.filter(
      (i) => parseFloat(i.quantity) <= parseFloat(i.minThreshold),
    );
    const totalLowStock = lowStockAlerts.length;

    // Today's movements — branch-scoped for staff
    const todayConditions = branchFilter
      ? and(gte(stockMovementsTable.createdAt, today), eq(stockMovementsTable.branchId, branchFilter))
      : gte(stockMovementsTable.createdAt, today);

    const todayMovements = await db
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
        unit: inventoryItemsTable.unit,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(todayConditions);

    type MovementRow = (typeof todayMovements)[0];

    const totalMissingToday = todayMovements
      .filter((m: MovementRow) => m.type === "missing_lost")
      .reduce((sum: number, m: MovementRow) => sum + parseFloat(m.quantity ?? "0"), 0);

    const totalDamagedToday = todayMovements
      .filter((m: MovementRow) => m.type === "damaged")
      .reduce((sum: number, m: MovementRow) => sum + parseFloat(m.quantity ?? "0"), 0);

    // Recent movements — branch-scoped
    const recentConditions = branchFilter ? eq(stockMovementsTable.branchId, branchFilter) : undefined;

    const recentMovements = await db
      .select({
        id: stockMovementsTable.id,
        itemName: inventoryItemsTable.name,
        branchName: branchesTable.name,
        userName: usersTable.name,
        type: stockMovementsTable.type,
        quantity: stockMovementsTable.quantity,
        unit: inventoryItemsTable.unit,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .leftJoin(branchesTable, eq(stockMovementsTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
      .where(recentConditions)
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(10);

    // Branch summary — staff see only their own branch, owners see all
    const visibleBranches = branchFilter
      ? await db.select().from(branchesTable).where(eq(branchesTable.id, branchFilter))
      : await db.select().from(branchesTable);

    const branchOverviews = await Promise.all(
      visibleBranches.map(async (branch) => {
        const branchItems = allItems.filter((i) => i.branchId === branch.id);
        const branchLowStock = branchItems.filter(
          (i) => parseFloat(i.quantity) <= parseFloat(i.minThreshold),
        ).length;

        const branchMovementsToday = todayMovements.filter(
          (m: MovementRow) => m.branchId === branch.id,
        ).length;

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalItems: branchItems.length,
          lowStockCount: branchLowStock,
          movementsToday: branchMovementsToday,
        };
      }),
    );

    // Top consumption — branch-scoped for staff
    const productionConditions = branchFilter
      ? and(eq(stockMovementsTable.type, "used_in_production"), eq(stockMovementsTable.branchId, branchFilter))
      : eq(stockMovementsTable.type, "used_in_production");

    const allProductionMovements = await db
      .select({
        itemId: stockMovementsTable.itemId,
        itemName: inventoryItemsTable.name,
        quantity: stockMovementsTable.quantity,
        unit: inventoryItemsTable.unit,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .where(productionConditions);

    const usageMap: Record<number, { itemId: number; itemName: string; totalUsed: number; unit: string }> = {};
    for (const m of allProductionMovements) {
      if (m.itemId === null) continue;
      if (!usageMap[m.itemId]) {
        usageMap[m.itemId] = { itemId: m.itemId, itemName: m.itemName ?? "", totalUsed: 0, unit: m.unit ?? "" };
      }
      usageMap[m.itemId].totalUsed += parseFloat(m.quantity ?? "0");
    }

    const topConsumption = Object.values(usageMap)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5);

    return res.json({
      totalItems,
      lowStockCount: totalLowStock,
      missingToday: Math.round(totalMissingToday),
      damagedToday: Math.round(totalDamagedToday),
      movementsToday: todayMovements.length,
      recentMovements,
      lowStockItems: lowStockAlerts,
      branchSummary: visibleBranches.map((b) => {
        const overview = branchOverviews.find((o) => o.branchId === b.id);
        return {
          id: b.id,
          name: b.name,
          city: b.city ?? "",
          itemCount: overview?.totalItems ?? 0,
          lowStockCount: overview?.lowStockCount ?? 0,
          movementsToday: overview?.movementsToday ?? 0,
        };
      }),
      topUsedItems: topConsumption.map((c) => ({ name: c.itemName, totalUsed: c.totalUsed })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
