import express from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import type { AuthedRequest, Response } from "../types/express";
import { logger } from "../lib/logger";

const router = express.Router();

// Pool of active client connections for SSE
// Maps local user.id -> Array of Express Response objects
const clients = new Map<number, Response[]>();

async function getCurrentUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return user ?? null;
}

// 1. Stream Server-Sent Events (SSE)
router.get("/notifications/stream", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = await getCurrentUser(req.clerkUserId);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = user.id;

    // Set headers for Server-Sent Events (SSE)
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no" // Disable buffering for Nginx/Netlify if applicable
    });

    // Send initial connection payload and a comment keepalive
    res.write(":\n\n");
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // Keep connection alive with periodic heartbeats (30 seconds)
    const heartbeat = setInterval(() => {
      res.write(":\n\n");
    }, 30000);

    // Register connection
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    clients.get(userId)!.push(res);

    logger.info({ userId }, "SSE notification client connected");

    req.on("close", () => {
      clearInterval(heartbeat);
      const userClients = clients.get(userId) || [];
      clients.set(userId, userClients.filter(c => c !== res));
      logger.info({ userId }, "SSE notification client disconnected");
    });
  } catch (err: unknown) {
    logger.error({ err }, "Error setting up SSE stream");
    res.status(500).end();
    return;
  }
});

// 2. Fetch user notifications
router.get("/notifications", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = await getCurrentUser(req.clerkUserId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const list = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    return res.json(list);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

// 3. Mark notification as read
router.put("/notifications/:id/read", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid notification ID" });

    const user = await getCurrentUser(req.clerkUserId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Notification not found" });

    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

// 4. Mark all notifications as read
router.put("/notifications/read-all", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const user = await getCurrentUser(req.clerkUserId);
    if (!user) return res.status(401).json({ error: "User not found" });

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, user.id));

    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

// Helper function to push real-time updates to all connections of a specific user
export function sendNotificationToUser(userId: number, notification: any) {
  const userClients = clients.get(userId) || [];
  logger.info({ userId, activeClients: userClients.length }, "Broadcasting SSE notification to user");
  userClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (err) {
      logger.error({ err, userId }, "Failed to write SSE notification to client");
    }
  });
}

export default router;
