import { Router } from "express";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, branchesTable, invitationsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import type { AuthedRequest } from "../types/express";

const router = Router();

const LEGACY_ORG_ID = "00000000-0000-0000-0000-000000000001";
let legacyMigrationDone = false;

async function migrateToLegacyOrg() {
  if (legacyMigrationDone) return;
  legacyMigrationDone = true;
  await db.update(usersTable).set({ organizationId: LEGACY_ORG_ID }).where(isNull(usersTable.organizationId));
  await db.update(branchesTable).set({ organizationId: LEGACY_ORG_ID }).where(isNull(branchesTable.organizationId));
}

let cachedDefaultClerkId: string | null = null;

async function getOrCreateDefaultUser(): Promise<{ clerkId: string; organizationId: string | null }> {
  await migrateToLegacyOrg();

  if (cachedDefaultClerkId) {
    const [user] = await db
      .select({ clerkId: usersTable.clerkId, organizationId: usersTable.organizationId })
      .from(usersTable)
      .where(eq(usersTable.clerkId, cachedDefaultClerkId))
      .limit(1);
    if (user) return user;
  }

  const [first] = await db
    .select({ clerkId: usersTable.clerkId, organizationId: usersTable.organizationId })
    .from(usersTable)
    .limit(1);

  if (first) {
    cachedDefaultClerkId = first.clerkId;
    return first;
  }

  const orgId = crypto.randomUUID();
  const [created] = await db
    .insert(usersTable)
    .values({ clerkId: "default_owner", name: "Owner", email: "owner@bakerystock.local", role: "owner", organizationId: orgId })
    .returning();
  cachedDefaultClerkId = created.clerkId;
  return { clerkId: created.clerkId, organizationId: created.organizationId };
}

const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headerUserId = req.headers["x-user-id"] as string | undefined;
    if (headerUserId) {
      const id = parseInt(headerUserId, 10);
      const [user] = await db
        .select({ clerkId: usersTable.clerkId, organizationId: usersTable.organizationId })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (user) {
        (req as AuthedRequest).clerkUserId = user.clerkId;
        (req as AuthedRequest).organizationId = user.organizationId;
        next();
        return;
      }
    }
    const { clerkId, organizationId } = await getOrCreateDefaultUser();
    (req as AuthedRequest).clerkUserId = clerkId;
    (req as AuthedRequest).organizationId = organizationId;
    next();
  } catch {
    res.status(500).json({ error: "Could not resolve user" });
  }
};

const requireOwner: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkUserId = (req as AuthedRequest).clerkUserId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
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
      .select({ id: usersTable.id, clerkId: usersTable.clerkId, name: usersTable.name, email: usersTable.email, role: usersTable.role, branchId: usersTable.branchId, organizationId: usersTable.organizationId, createdAt: usersTable.createdAt })
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
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.clerkUserId))
      .limit(1);
    if (existingUser) return res.json({ ...existingUser, branchName: null });

    // User not in local DB — look up their email via Clerk Admin API
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(404).json({ error: "User not found" });
    }

    const clerkUserRes = await fetch(
      `https://api.clerk.com/v1/users/${req.clerkUserId}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    if (!clerkUserRes.ok) {
      return res.status(404).json({ error: "User not found" });
    }

    const clerkUser = await clerkUserRes.json() as {
      first_name?: string;
      last_name?: string;
      email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
    };

    const primaryEmail = clerkUser.email_addresses?.find(
      (e) => e.verification?.status === "verified",
    )?.email_address ?? clerkUser.email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      return res.status(400).json({ error: "No email address found for this user" });
    }

    const fullName = [clerkUser.first_name, clerkUser.last_name]
      .filter(Boolean)
      .join(" ") || "Staff Member";

    // Check if this email was invited
    const [invitation] = await db
      .select()
      .from(invitationsTable)
      .where(eq(invitationsTable.email, primaryEmail.toLowerCase()))
      .limit(1);

    if (!invitation || invitation.status !== "pending") {
      return res.status(403).json({
        error: "Access denied. You must be invited by an owner to access this application.",
      });
    }

    // Resolve the org from the inviting owner so the new staff member
    // is placed in the correct organization.
    let orgId: string = LEGACY_ORG_ID;
    if (invitation.invitedByUserId) {
      const [inviter] = await db
        .select({ organizationId: usersTable.organizationId })
        .from(usersTable)
        .where(eq(usersTable.id, invitation.invitedByUserId))
        .limit(1);
      if (inviter?.organizationId) orgId = inviter.organizationId;
    }

    // Create local user record with staff role, scoped to the owner's org
    const [newUser] = await db
      .insert(usersTable)
      .values({
        clerkId: req.clerkUserId,
        name: fullName,
        email: primaryEmail.toLowerCase(),
        role: "staff",
        organizationId: orgId,
      })
      .returning();

    // Mark invitation as accepted
    await db
      .update(invitationsTable)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitationsTable.id, invitation.id));

    return res.json({ ...newUser, branchName: null });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/find-by-email", async (req: Request, res: Response) => {
  try {
    const { email } = req.query as Record<string, string | undefined>;
    if (!email?.trim()) return res.status(400).json({ error: "email is required" });
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, organizationId: usersTable.organizationId })
      .from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase()))
      .limit(1);
    if (!user) return res.status(404).json({ error: "No account found with that email" });
    return res.json(user);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/register-owner", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body as { name: string; email: string };
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    if (!email?.trim()) return res.status(400).json({ error: "email is required" });

    const orgId = crypto.randomUUID();
    const clerkId = `owner_${Date.now()}`;
    const [user] = await db
      .insert(usersTable)
      .values({ clerkId, name: name.trim(), email: email.trim().toLowerCase(), role: "owner", organizationId: orgId })
      .returning();
    return res.status(201).json({ ...user, branchName: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    return res.status(500).json({ error: msg });
  }
});

const usersListHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const orgId = (req as AuthedRequest).organizationId;
    const users = await db
      .select({ id: usersTable.id, clerkId: usersTable.clerkId, name: usersTable.name, email: usersTable.email, role: usersTable.role, branchId: usersTable.branchId, organizationId: usersTable.organizationId, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(orgId ? eq(usersTable.organizationId, orgId) : isNull(usersTable.organizationId));
    return res.json(users.map((u) => ({ ...u, branchName: null })));
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/users", requireAuth, requireOwner, usersListHandler);
router.get("/auth/users", requireAuth, requireOwner, usersListHandler);

router.post("/users", requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const ownerOrgId = (req as AuthedRequest).organizationId;
    const { name, email, role, branchId, clerkId: bodyClerkId } = req.body as {
      name: string; email: string; role: "owner" | "staff"; branchId?: number; clerkId?: string;
    };
    const clerkId = bodyClerkId?.trim() || `manual_${Date.now()}`;
    const orgId = role === "owner" ? crypto.randomUUID() : (ownerOrgId ?? LEGACY_ORG_ID);
    const [user] = await db
      .insert(usersTable)
      .values({ clerkId, name, email, role, branchId, organizationId: orgId })
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
    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
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

router.post("/auth/invite", requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const { email, redirectUrl } = req.body as { email: string; redirectUrl?: string };
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const owner = (req as AuthedRequest).localUser;

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({ error: "Invitation service is not configured (missing CLERK_SECRET_KEY)" });
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const baseUrl = `${proto}://${host}`;

    // Force same-origin redirect — ignore any client-supplied URL to prevent
    // open-redirect abuse even though this endpoint is owner-only.
    const signUpUrl = `${baseUrl}/sign-up`;
    void redirectUrl; // accept the field in the body but never use it

    const clerkRes = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: normalizedEmail,
        redirect_url: signUpUrl,
        ignore_existing: true,
      }),
    });

    if (!clerkRes.ok) {
      const clerkBody = await clerkRes.json().catch(() => ({})) as { errors?: Array<{ message?: string }> };
      const msg = clerkBody?.errors?.[0]?.message || `Clerk API error ${clerkRes.status}`;
      return res.status(clerkRes.status).json({ error: msg });
    }

    const clerkInvitation = await clerkRes.json() as { id: string };

    // Upsert into local invitations table so /auth/sync can verify invite status
    await db
      .insert(invitationsTable)
      .values({
        email: normalizedEmail,
        clerkInvitationId: clerkInvitation.id,
        status: "pending",
        invitedByUserId: owner?.id ?? null,
      })
      .onConflictDoUpdate({
        target: invitationsTable.email,
        set: {
          clerkInvitationId: clerkInvitation.id,
          status: "pending",
          invitedByUserId: owner?.id ?? null,
          acceptedAt: null,
        },
      });

    return res.status(201).json({ ok: true, invitationId: clerkInvitation.id, email: normalizedEmail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: msg });
  }
});

export { requireAuth, requireOwner };
export default router;
