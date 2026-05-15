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

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: () => api.get<CurrentUser>("/auth/me"),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}
