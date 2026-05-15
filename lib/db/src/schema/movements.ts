import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  branchId: integer("branch_id").notNull(),
  userId: integer("user_id").notNull(),
  type: text("type", {
    enum: ["stock_in", "used_in_production", "sold", "damaged", "missing_lost", "returned"],
  }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
