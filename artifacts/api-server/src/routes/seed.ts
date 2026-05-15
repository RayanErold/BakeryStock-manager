import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  branchesTable,
  inventoryItemsTable,
  stockMovementsTable,
  auditLogsTable,
} from "@workspace/db";

const router = Router();

type MovementType = "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";

router.post("/seed", async (req: Request, res: Response) => {
  try {
    // Bootstrap path: allow unauthenticated if no users exist yet.
    // Once any user exists, require an authenticated owner.
    const existingUsers = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    if (existingUsers.length > 0) {
      const clerkUserId: string | undefined =
        (req as Request & { clerkUserId?: string }).clerkUserId ??
        (req.headers["x-dev-user-id"] as string | undefined);
      if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });
      const [caller] = await db
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.clerkId, clerkUserId))
        .limit(1);
      if (!caller || caller.role !== "owner") {
        return res.status(403).json({ error: "Forbidden: owner only" });
      }
    }

    const existingBranches = await db.select({ id: branchesTable.id }).from(branchesTable).limit(1);
    if (existingBranches.length > 0) {
      return res.json({ message: "Already seeded" });
    }

    const [douala, yaounde] = await db
      .insert(branchesTable)
      .values([
        { name: "Douala Central Bakery", city: "Douala", manager: "Jean Mbarga", phone: "+237 655 123 456" },
        { name: "Yaoundé Bakery", city: "Yaoundé", manager: "Marie Nkomo", phone: "+237 677 987 654" },
      ])
      .returning();

    const [owner, staff1, staff2] = await db
      .insert(usersTable)
      .values([
        { clerkId: "seed_owner_001", name: "Pierre Fotso", email: "pierre@bakerstock.cm", role: "owner" as const, branchId: douala.id },
        { clerkId: "seed_staff_001", name: "Carine Biya", email: "carine@bakerystock.cm", role: "staff" as const, branchId: douala.id },
        { clerkId: "seed_staff_002", name: "Paul Eto", email: "paul@bakerystock.cm", role: "staff" as const, branchId: yaounde.id },
      ])
      .returning();

    const items = await db
      .insert(inventoryItemsTable)
      .values([
        // Douala
        { name: "Farine de blé", category: "Ingrédients de base", quantity: "250", unit: "kg" as const, minThreshold: "50", branchId: douala.id },
        { name: "Sucre", category: "Ingrédients de base", quantity: "80", unit: "kg" as const, minThreshold: "20", branchId: douala.id },
        { name: "Beurre", category: "Produits laitiers", quantity: "30", unit: "kg" as const, minThreshold: "10", branchId: douala.id },
        { name: "Oeufs", category: "Produits laitiers", quantity: "12", unit: "trays" as const, minThreshold: "5", branchId: douala.id },
        { name: "Levure", category: "Ingrédients de base", quantity: "5", unit: "kg" as const, minThreshold: "2", branchId: douala.id },
        { name: "Huile de palme", category: "Huiles & Graisses", quantity: "40", unit: "liters" as const, minThreshold: "10", branchId: douala.id },
        { name: "Sachets pain", category: "Emballages", quantity: "3", unit: "boxes" as const, minThreshold: "10", branchId: douala.id },
        // Yaoundé
        { name: "Farine de blé", category: "Ingrédients de base", quantity: "180", unit: "kg" as const, minThreshold: "50", branchId: yaounde.id },
        { name: "Sucre", category: "Ingrédients de base", quantity: "15", unit: "kg" as const, minThreshold: "20", branchId: yaounde.id },
        { name: "Sel", category: "Ingrédients de base", quantity: "25", unit: "kg" as const, minThreshold: "5", branchId: yaounde.id },
        { name: "Lait en poudre", category: "Produits laitiers", quantity: "20", unit: "kg" as const, minThreshold: "5", branchId: yaounde.id },
        { name: "Levure", category: "Ingrédients de base", quantity: "1.5", unit: "kg" as const, minThreshold: "2", branchId: yaounde.id },
      ])
      .returning();

    const movementsData: Array<{ itemId: number; branchId: number; userId: number; type: MovementType; quantity: string; note: string }> = [
      // Douala — 12 movements
      { itemId: items[0].id, branchId: douala.id, userId: staff1.id, type: "stock_in", quantity: "100", note: "Livraison hebdomadaire farine" },
      { itemId: items[0].id, branchId: douala.id, userId: staff1.id, type: "used_in_production", quantity: "30", note: "Production pains du matin" },
      { itemId: items[0].id, branchId: douala.id, userId: staff1.id, type: "used_in_production", quantity: "25", note: "Production croissants" },
      { itemId: items[1].id, branchId: douala.id, userId: staff1.id, type: "used_in_production", quantity: "15", note: "Production gâteaux" },
      { itemId: items[1].id, branchId: douala.id, userId: staff1.id, type: "stock_in", quantity: "20", note: "Réapprovisionnement sucre" },
      { itemId: items[2].id, branchId: douala.id, userId: staff1.id, type: "damaged", quantity: "3", note: "Fondu - réfrigérateur en panne" },
      { itemId: items[3].id, branchId: douala.id, userId: staff1.id, type: "missing_lost", quantity: "2", note: "Introuvables lors de l'inventaire" },
      { itemId: items[3].id, branchId: douala.id, userId: staff1.id, type: "used_in_production", quantity: "4", note: "Gâteaux du jour" },
      { itemId: items[4].id, branchId: douala.id, userId: staff1.id, type: "used_in_production", quantity: "1", note: "Fournée pain blanc" },
      { itemId: items[5].id, branchId: douala.id, userId: owner.id, type: "stock_in", quantity: "20", note: "Achat mensuel huile" },
      { itemId: items[6].id, branchId: douala.id, userId: owner.id, type: "stock_in", quantity: "5", note: "Achat d'urgence sachets" },
      { itemId: items[6].id, branchId: douala.id, userId: staff1.id, type: "sold", quantity: "2", note: "Vente sachets au détail" },
      // Yaoundé — 8 movements
      { itemId: items[7].id, branchId: yaounde.id, userId: staff2.id, type: "stock_in", quantity: "50", note: "Réapprovisionnement farine" },
      { itemId: items[7].id, branchId: yaounde.id, userId: staff2.id, type: "used_in_production", quantity: "40", note: "Production du jour" },
      { itemId: items[8].id, branchId: yaounde.id, userId: staff2.id, type: "used_in_production", quantity: "8", note: "Pâtisserie" },
      { itemId: items[8].id, branchId: yaounde.id, userId: staff2.id, type: "stock_in", quantity: "10", note: "Commande urgente sucre" },
      { itemId: items[10].id, branchId: yaounde.id, userId: staff2.id, type: "used_in_production", quantity: "5", note: "Brioches au lait" },
      { itemId: items[11].id, branchId: yaounde.id, userId: staff2.id, type: "missing_lost", quantity: "0.5", note: "Manquant - investigation en cours" },
      { itemId: items[11].id, branchId: yaounde.id, userId: staff2.id, type: "stock_in", quantity: "2", note: "Nouvelle levure achetée" },
      { itemId: items[9].id, branchId: yaounde.id, userId: staff2.id, type: "used_in_production", quantity: "3", note: "Pain de mie" },
    ];

    const movements = await db
      .insert(stockMovementsTable)
      .values(movementsData)
      .returning();

    await db.insert(auditLogsTable).values(
      movementsData.map((m) => ({
        userId: m.userId,
        branchId: m.branchId,
        itemId: m.itemId,
        quantityChange: m.quantity,
        movementType: m.type,
        note: m.note,
      })),
    );

    return res.json({
      message: "Seeded successfully",
      branches: 2,
      users: 3,
      items: items.length,
      movements: movements.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
