import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const invitationsTable = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  clerkInvitationId: text("clerk_invitation_id"),
  status: text("status", { enum: ["pending", "accepted", "revoked"] })
    .notNull()
    .default("pending"),
  invitedByUserId: integer("invited_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export type Invitation = typeof invitationsTable.$inferSelect;
