import { Router } from "express";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthedRequest } from "../types/express";

const router = Router();

/** Cache the auto-user clerkId so we don't hit the DB on every request. */
let cachedUserId: string | null = null;

async function getOrCreateDefaultUser(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const [first] = await db
    .select({ clerkId: usersTable.clerkId })
    .from(usersTable)
    .limit(1);

  if (first) {
    cachedUserId = first.clerkId;
    return first.clerkId;
  }

  // No users yet — create a default owner
  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId: "default_owner",
      name: "Owner",
      email: "owner@bakerystock.local",
      role: "owner",
    })
    .returning();
  cachedUserId = created.clerkId;
  return created.clerkId;
}

const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkUserId = await getOrCreateDefaultUser();
    (req as AuthedRequest).clerkUserId = clerkUserId;
    next();
  } catch {
    res.status(500).json({ error: "Could not resolve user" });
  }
};

const requireOwner: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkUserId = (req as AuthedRequest).clerkUserId;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkUserId))
      .limit(1);
    if (!user || user.role !== "owner") {
      res.status(403).json({ error: "Forbidden: owner only" });
      return;
    }
    (req as AuthedRequest).localUser = user;
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/auth/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        clerkId: usersTable.clerkId,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        branchId: usersTable.branchId,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ ...user, branchName: null });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/sync", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId))
      .limit(1);
    if (user) return res.json({ ...user, branchName: null });
    return res.status(404).json({ error: "User not found" });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

const usersListHandler: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        clerkId: usersTable.clerkId,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        branchId: usersTable.branchId,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable);
    return res.json(users.map((u) => ({ ...u, branchName: null })));
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/users", requireAuth, requireOwner, usersListHandler);
router.get("/auth/users", requireAuth, requireOwner, usersListHandler);

router.post("/users", requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const { name, email, role, branchId, clerkId: bodyClerkId } = req.body as {
      name: string; email: string; role: "owner" | "staff"; branchId?: number; clerkId?: string;
    };
    const clerkId = bodyClerkId?.trim() || `manual_${Date.now()}`;
    const [user] = await db
      .insert(usersTable)
      .values({ clerkId, name, email, role, branchId })
      .returning();
    return res.status(201).json({ ...user, branchName: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

const getUserByIdHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ ...user, branchName: null });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const body = req.body as Partial<{ name: string; role: "owner" | "staff"; branchId: number | "" }>;
    const updateData: Partial<{ name: string; role: "owner" | "staff"; branchId: number | null }> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.branchId !== undefined) updateData.branchId = body.branchId === "" ? null : body.branchId;
    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ ...user, branchName: null });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUserHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/users/:id", requireAuth, requireOwner, getUserByIdHandler);
router.put("/users/:id", requireAuth, requireOwner, updateUserHandler);
router.delete("/users/:id", requireAuth, requireOwner, deleteUserHandler);

router.get("/auth/users/:id", requireAuth, requireOwner, getUserByIdHandler);
router.put("/auth/users/:id", requireAuth, requireOwner, updateUserHandler);
router.delete("/auth/users/:id", requireAuth, requireOwner, deleteUserHandler);

export { requireAuth, requireOwner };
export default router;
