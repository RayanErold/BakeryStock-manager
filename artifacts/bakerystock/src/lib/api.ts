import { getAuthToken } from "./authToken";

const BASE = "/api";

/** In dev mode (no Clerk), forward the X-Dev-User-Id header from localStorage. */
function devHeaders(): Record<string, string> {
  const devId = localStorage.getItem("dev_clerk_id");
  return devId ? { "X-Dev-User-Id": devId } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // When Clerk is active, attach Bearer token; otherwise fall back to dev header
  const token = await getAuthToken();
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : devHeaders();

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
