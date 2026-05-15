import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  clerkUserId: string;
  localUser?: { id: number; clerkId: string; name: string; role: "owner" | "staff"; branchId: number | null };
}

export type { Response, NextFunction };
