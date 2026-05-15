import { Router } from "express";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthedRequest } from "../types/express";

const router = Router();

const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  // Dev-mode bypass: only active when CLERK_SECRET_KEY is absent AND not in
  // a production environment. This prevents header-spoofing if the key is
  // accidentally unset in a deployed environment.
  const isDevMode = !process.env.CLERK_SECRET_KEY && process.env.NODE_ENV !== "production";
  if (isDevMode) {
    const devUserId = req.headers["x-dev-user-id"] as string | undefined;
    if (!devUserId) {
      res.status(401).json({ error: "Unauthorized: no session (dev mode — select a user in the login page)" });
      return;
    }
    (req as AuthedRequest).clerkUserId = devUserId;
    next();
    return;
  }
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).clerkUserId = userId as string;
  next();
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
    // Use the authenticated identity — not a body-supplied clerkId — to prevent spoofing.
    const clerkId = req.clerkUserId;
    const { name, email } = req.body as { name: string; email: string };

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);

    if (existing.length > 0) return res.json({ ...existing[0], branchName: null });

    const totalUsers = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    const role = totalUsers.length === 0 ? "owner" : "staff";

    const [newUser] = await db
      .insert(usersTable)
      .values({ clerkId, name, email, role: role as "owner" | "staff" })
      .returning();

    return res.json({ ...newUser, branchName: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

const usersListHandler: RequestHandler = async (req: Request, res: Response) => {
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
      name: string; email: string; role: "owner" | "staff"; branchId?: number;
      /** Owner may supply the real Clerk user ID so the staff account can sign in via Clerk. */
      clerkId?: string;
    };
    // Use owner-supplied clerkId when provided (allows real Clerk accounts to be registered).
    // Fallback placeholder is only for manual/demo records that don't map to a real Clerk user.
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
