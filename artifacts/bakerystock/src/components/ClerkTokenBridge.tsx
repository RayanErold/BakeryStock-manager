import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { registerTokenGetter } from "@/lib/authToken";

/**
 * Registers the Clerk token getter so that api.ts can forward
 * the Bearer token on every API request.  Must be rendered inside ClerkProvider.
 */
export function ClerkTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}
