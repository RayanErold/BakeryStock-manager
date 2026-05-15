const USER_ID_KEY = "bakerystock_user_id";

export function getStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function setStoredUserId(id: string): void {
  localStorage.setItem(USER_ID_KEY, id);
}

export function clearStoredUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

// Legacy — kept so nothing else breaks
export async function getAuthToken(): Promise<string | null> {
  return null;
}
