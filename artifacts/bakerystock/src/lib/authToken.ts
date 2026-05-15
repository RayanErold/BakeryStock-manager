/**
 * Global token getter — registered by ClerkTokenBridge when Clerk is active.
 * Falls back to null so the backend uses the dev X-Dev-User-Id header path.
 */
let tokenGetter: (() => Promise<string | null>) | null = null;

export function registerTokenGetter(fn: () => Promise<string | null>): void {
  tokenGetter = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (tokenGetter) {
    try {
      return await tokenGetter();
    } catch {
      return null;
    }
  }
  return null;
}
