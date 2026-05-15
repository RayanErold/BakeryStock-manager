import { Router } from "express";
import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  stockMovementsTable,
  branchesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

router.get(["/dashboard", "/dashboard/summary"], requireAuth, async (req: any, res: any) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? parseInt(branchId as string) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemsQuery = db
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

    const allItems = branchFilter
      ? await itemsQuery.where(eq(inventoryItemsTable.branchId, branchFilter))
      : await itemsQuery;

    const totalItems = allItems.length;
    const lowStockAlerts = allItems.filter(
      (i) => parseFloat(i.quantity) <= parseFloat(i.minThreshold),
    );
    const totalLowStock = lowStockAlerts.length;

    const todayMovementsQuery = db
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
      .where(gte(stockMovementsTable.createdAt, today));

    const todayMovements = branchFilter
      ? await todayMovementsQuery.where(
          and(
            gte(stockMovementsTable.createdAt, today),
            eq(stockMovementsTable.branchId, branchFilter),
          ),
        )
      : await todayMovementsQuery;

    const totalMissingToday = todayMovements
      .filter((m) => m.type === "missing_lost")
      .reduce((sum, m) => sum + parseFloat(m.quantity), 0);

    const totalDamagedToday = todayMovements
      .filter((m) => m.type === "damaged")
      .reduce((sum, m) => sum + parseFloat(m.quantity), 0);

    const recentMovementsQuery = db
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
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(10);

    const recentMovements = branchFilter
      ? await recentMovementsQuery.where(eq(stockMovementsTable.branchId, branchFilter))
      : await recentMovementsQuery;

    const branches = await db.select().from(branchesTable);
    const branchOverviews = await Promise.all(
      branches.map(async (branch) => {
        const branchItems = allItems.filter((i) => i.branchId === branch.id);
        const branchLowStock = branchItems.filter(
          (i) => parseFloat(i.quantity) <= parseFloat(i.minThreshold),
        ).length;

        const branchMovementsToday = todayMovements.filter(
          (m) => m.branchId === branch.id,
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

    const usageMap: Record<number, { itemId: number; itemName: string; totalUsed: number; unit: string }> = {};
    const allProductionMovements = await db
      .select({
        itemId: stockMovementsTable.itemId,
        itemName: inventoryItemsTable.name,
        quantity: stockMovementsTable.quantity,
        unit: inventoryItemsTable.unit,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .where(eq(stockMovementsTable.type, "used_in_production"));

    for (const m of allProductionMovements) {
      if (!usageMap[m.itemId]) {
        usageMap[m.itemId] = {
          itemId: m.itemId,
          itemName: m.itemName ?? "Unknown",
          totalUsed: 0,
          unit: m.unit ?? "pieces",
        };
      }
      usageMap[m.itemId].totalUsed += parseFloat(m.quantity);
    }

    const topUsedItems = Object.values(usageMap)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5);

    return res.json({
      totalItems,
      lowStockCount: totalLowStock,
      missingToday: totalMissingToday,
      damagedToday: totalDamagedToday,
      movementsToday: todayMovements.length,
      branchSummary: branchOverviews.map((b) => ({
        id: b.branchId,
        name: b.branchName,
        city: "",
        itemCount: b.totalItems,
        lowStockCount: b.lowStockCount,
      })),
      recentMovements: recentMovements.map((m) => ({
        ...m,
        itemName: m.itemName ?? "Unknown",
        branchName: m.branchName ?? "Unknown",
        userName: m.userName ?? "Unknown",
        unit: m.unit ?? "pieces",
      })),
      lowStockItems: lowStockAlerts.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        minThreshold: i.minThreshold,
        unit: i.unit,
        branchId: i.branchId,
        branchName: i.branchName ?? null,
      })),
      topUsedItems: topUsedItems.map((i) => ({ name: i.itemName, totalUsed: i.totalUsed })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
