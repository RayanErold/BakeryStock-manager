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
 *   2. If 404 (first login), call POST /auth/sync to create the DB record,
 *      then retry GET /auth/me.
 *
 * In dev mode (no Clerk key) the X-Dev-User-Id header is forwarded by api.ts
 * using the localStorage value set by the account picker.
 */
async function fetchCurrentUser(): Promise<CurrentUser> {
  try {
    return await api.get<CurrentUser>("/auth/me");
  } catch (err: unknown) {
    // On 404, attempt first-login sync (Clerk mode only — dev mode seeds users via /seed)
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("404") || msg.includes("Not Found") || msg.includes("User not found")) {
      // Gather Clerk user metadata if available (name / email for DB record)
      let name: string | undefined;
      let email: string | undefined;

      if (typeof window !== "undefined" && import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
        try {
          // Clerk stores user info on window.Clerk when loaded
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clerkUser = (window as any).Clerk?.user;
          if (clerkUser) {
            name = clerkUser.fullName ?? clerkUser.firstName ?? undefined;
            email = clerkUser.primaryEmailAddress?.emailAddress ?? undefined;
          }
        } catch {
          // ignore — name/email are optional for sync
        }
      }

      await api.post("/auth/sync", { name, email });
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
