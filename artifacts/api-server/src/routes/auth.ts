import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const requireAuth = async (req: any, res: any, next: any) => {
  // Dev-mode bypass: only active when CLERK_SECRET_KEY is absent AND we are
  // not in a production environment. This prevents header-spoofing if the
  // key is accidentally unset in a deployed environment.
  const isDevMode = !process.env.CLERK_SECRET_KEY && process.env.NODE_ENV !== "production";
  if (isDevMode) {
    const devUserId = req.headers["x-dev-user-id"] as string | undefined;
    if (!devUserId) {
      return res.status(401).json({ error: "Unauthorized: no session (dev mode — select a user in the login page)" });
    }
    req.clerkUserId = devUserId;
    return next();
  }
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.clerkUserId = userId;
  next();
};

const requireOwner = async (req: any, res: any, next: any) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId))
      .limit(1);
    if (!user || user.role !== "owner") {
      return res.status(403).json({ error: "Forbidden: owner only" });
    }
    req.localUser = user;
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/auth/me", requireAuth, async (req: any, res: any) => {
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ ...user, branchName: null });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/sync", requireAuth, async (req: any, res: any) => {
  try {
    // Use the authenticated identity, not body-supplied clerkId, to prevent spoofing
    const clerkId = req.clerkUserId as string;
    const { name, email } = req.body;

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ ...existing[0], branchName: null });
    }

    const totalUsers = await db.select().from(usersTable);
    const role = totalUsers.length === 0 ? "owner" : "staff";

    const [newUser] = await db
      .insert(usersTable)
      .values({ clerkId, name, email, role })
      .returning();

    return res.json({ ...newUser, branchName: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const usersListHandler = async (req: any, res: any) => {
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
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/users", requireAuth, requireOwner, usersListHandler);
router.get("/auth/users", requireAuth, requireOwner, usersListHandler);

router.post("/users", requireAuth, requireOwner, async (req: any, res: any) => {
  try {
    const { name, email, role, branchId } = req.body;
    const [user] = await db
      .insert(usersTable)
      .values({ clerkId: `manual_${Date.now()}`, name, email, role, branchId })
      .returning();
    return res.status(201).json({ ...user, branchName: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const getUserByIdHandler = async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ ...user, branchName: null });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserHandler = async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, branchId } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (branchId !== undefined) updateData.branchId = branchId === "" ? null : branchId;
    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ ...user, branchName: null });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUserHandler = async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return res.status(204).send();
  } catch {
    res.status(500).json({ error: "Internal server error" });
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
