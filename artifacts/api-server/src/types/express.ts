import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  clerkUserId: string;
  organizationId: string | null;
  localUser?: { id: number; clerkId: string; name: string; role: "owner" | "staff"; branchId: number | null; organizationId: string | null };
}

export type { Response, NextFunction };
