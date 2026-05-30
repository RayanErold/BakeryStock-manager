import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["low_stock", "stock_movement", "staff_activity", "system"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata").$type<{
    itemId?: number;
    movementId?: number;
    currentQuantity?: string;
    threshold?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
