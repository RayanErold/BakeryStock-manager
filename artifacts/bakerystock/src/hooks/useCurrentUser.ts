import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CurrentUser {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  branchId: number | null;
  branch?: { id: number; name: string; city: string } | null;
}

/**
 * Fetches the current user from the backend.
 *
 * Flow when Clerk is active:
 *   1. Try GET /auth/me  →  user already synced, return it.
 *   2. On 404 (first login): call POST /auth/sync — the backend looks up
 *      name + email from the Clerk API using the verified JWT, then retries
 *      GET /auth/me.
 *
 * In dev mode the X-Dev-User-Id header is forwarded by api.ts from localStorage.
 */
async function fetchCurrentUser(): Promise<CurrentUser> {
  try {
    return await api.get<CurrentUser>("/auth/me");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    const isNotFound =
      msg.includes("404") ||
      msg.includes("Not Found") ||
      msg.includes("User not found");

    if (isNotFound && import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
      // Backend reads name + email from Clerk API using the verified JWT clerkUserId.
      // No user data needs to be sent from the browser.
      await api.post("/auth/sync", {});
      return await api.get<CurrentUser>("/auth/me");
    }

    throw err;
  }
}

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
