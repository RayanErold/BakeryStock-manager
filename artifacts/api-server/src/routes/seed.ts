import { Router } from "express";
import { db } from "@workspace/db";
import { requireAuth, requireOwner } from "./auth";
import {
  usersTable,
  branchesTable,
  inventoryItemsTable,
  stockMovementsTable,
  auditLogsTable,
} from "@workspace/db";

const router = Router();

router.post("/seed", requireAuth, requireOwner, async (_req: any, res: any) => {
  try {
    const existingBranches = await db.select().from(branchesTable);
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
        { clerkId: "seed_owner_001", name: "Pierre Fotso", email: "pierre@bakerstock.cm", role: "owner", branchId: douala.id },
        { clerkId: "seed_staff_001", name: "Carine Biya", email: "carine@bakerystock.cm", role: "staff", branchId: douala.id },
        { clerkId: "seed_staff_002", name: "Paul Eto", email: "paul@bakerystock.cm", role: "staff", branchId: yaounde.id },
      ])
      .returning();

    const items = await db
      .insert(inventoryItemsTable)
      .values([
        { name: "Farine de blé", category: "Ingrédients de base", quantity: "250", unit: "kg", minThreshold: "50", branchId: douala.id },
        { name: "Sucre", category: "Ingrédients de base", quantity: "80", unit: "kg", minThreshold: "20", branchId: douala.id },
        { name: "Beurre", category: "Produits laitiers", quantity: "30", unit: "kg", minThreshold: "10", branchId: douala.id },
        { name: "Oeufs", category: "Produits laitiers", quantity: "12", unit: "trays", minThreshold: "5", branchId: douala.id },
        { name: "Levure", category: "Ingrédients de base", quantity: "5", unit: "kg", minThreshold: "2", branchId: douala.id },
        { name: "Huile de palme", category: "Huiles & Graisses", quantity: "40", unit: "liters", minThreshold: "10", branchId: douala.id },
        { name: "Sachets pain", category: "Emballages", quantity: "3", unit: "boxes", minThreshold: "10", branchId: douala.id },
        { name: "Farine de blé", category: "Ingrédients de base", quantity: "180", unit: "kg", minThreshold: "50", branchId: yaounde.id },
        { name: "Sucre", category: "Ingrédients de base", quantity: "15", unit: "kg", minThreshold: "20", branchId: yaounde.id },
        { name: "Sel", category: "Ingrédients de base", quantity: "25", unit: "kg", minThreshold: "5", branchId: yaounde.id },
        { name: "Lait en poudre", category: "Produits laitiers", quantity: "20", unit: "kg", minThreshold: "5", branchId: yaounde.id },
        { name: "Levure", category: "Ingrédients de base", quantity: "1.5", unit: "kg", minThreshold: "2", branchId: yaounde.id },
      ])
      .returning();

    const movementsData = [
      { itemId: items[0].id, branchId: douala.id, userId: staff1.id, type: "stock_in" as const, quantity: "100", note: "Livraison hebdomadaire" },
      { itemId: items[0].id, branchId: douala.id, userId: staff1.id, type: "used_in_production" as const, quantity: "30", note: "Production pains du matin" },
      { itemId: items[1].id, branchId: douala.id, userId: staff1.id, type: "used_in_production" as const, quantity: "15", note: "Production gâteaux" },
      { itemId: items[3].id, branchId: douala.id, userId: staff1.id, type: "missing_lost" as const, quantity: "2", note: "Introuvables lors de l'inventaire" },
      { itemId: items[2].id, branchId: douala.id, userId: staff1.id, type: "damaged" as const, quantity: "3", note: "Fondu - réfrigérateur en panne" },
      { itemId: items[6].id, branchId: douala.id, userId: owner.id, type: "stock_in" as const, quantity: "5", note: "Achat d'urgence" },
      { itemId: items[7].id, branchId: yaounde.id, userId: staff2.id, type: "stock_in" as const, quantity: "50", note: "Réapprovisionnement" },
      { itemId: items[7].id, branchId: yaounde.id, userId: staff2.id, type: "used_in_production" as const, quantity: "40", note: "Production du jour" },
      { itemId: items[8].id, branchId: yaounde.id, userId: staff2.id, type: "used_in_production" as const, quantity: "8", note: "Pâtisserie" },
      { itemId: items[11].id, branchId: yaounde.id, userId: staff2.id, type: "missing_lost" as const, quantity: "0.5", note: "Manquant - investigation en cours" },
    ];

    const movements = await db
      .insert(stockMovementsTable)
      .values(movementsData.map((m) => ({ ...m, quantity: String(m.quantity) })))
      .returning();

    await db.insert(auditLogsTable).values(
      movementsData.map((m, i) => ({
        userId: m.userId,
        branchId: m.branchId,
        itemId: m.itemId,
        quantityChange: String(m.quantity),
        movementType: m.type,
        note: m.note,
      })),
    );

    return res.json({ message: "Seeded successfully", branches: 2, items: items.length, movements: movements.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
