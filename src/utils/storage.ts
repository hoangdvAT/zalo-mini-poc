/**
 * Auth storage - persist token & user
 * Dev: localStorage. Production: có thể chuyển sang zmp getStorage/setStorage
 */

const AUTH_TOKEN_KEY = "zalo_mini_auth_token";
const AUTH_USER_KEY = "zalo_mini_auth_user";
const AUTH_REFRESH_TOKEN_KEY = "zalo_mini_refresh_token";
const AUTH_IS_GUEST_KEY = "zalo_mini_is_guest";

export interface StoredUser {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  zaloId?: string;
  email?: string;
  isNewUser: boolean;
}

export function getStoredAuth(): {
  token: string;
  user: StoredUser;
  refreshToken: string | null;
  isGuest: boolean;
} | null {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!token || !userStr) return null;

    const user = JSON.parse(userStr) as StoredUser;
    const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    const isGuest = localStorage.getItem(AUTH_IS_GUEST_KEY) === "true";
    return { token, user, refreshToken, isGuest };
  } catch {
    return null;
  }
}

export function setStoredAuth(
  token: string,
  user: StoredUser,
  refreshToken?: string | null,
  isGuest?: boolean
): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }
  localStorage.setItem(AUTH_IS_GUEST_KEY, isGuest ? "true" : "false");
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_IS_GUEST_KEY);
}
