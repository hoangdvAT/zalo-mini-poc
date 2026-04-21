import { useCallback } from "react";
import { useAtom } from "jotai";
import { useNavigate } from "zmp-ui";
import { authTokenAtom, userAtom, isGuestAtom, refreshTokenAtom } from "@/state/auth";
import { setAuthToken, loginWithAccount, fetchGuestToken } from "@/services/api";
import { logout as authLogout } from "@/services/auth";
import type { AuthUser } from "@/types/auth";
import { setStoredAuth, clearStoredAuth } from "@/utils/storage";

export function useAuth() {
  const [token, setToken] = useAtom(authTokenAtom);
  const [user, setUser] = useAtom(userAtom);
  const [isGuest, setIsGuest] = useAtom(isGuestAtom);
  const [refreshToken, setRefreshToken] = useAtom(refreshTokenAtom);
  const navigate = useNavigate();

  /** User has a real (non-guest) token */
  const isAuthenticated = !!token && !isGuest;

  /**
   * Set auth state (for both guest and logged-in users)
   */
  const setAuth = useCallback(
    (
      newToken: string | null,
      newUser: AuthUser | null,
      guest: boolean = false,
      newRefreshToken?: string | null
    ) => {
      setToken(newToken);
      setUser(newUser);
      setIsGuest(guest);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      if (newToken && newUser) {
        setAuthToken(newToken);
        setStoredAuth(newToken, newUser, newRefreshToken, guest);
      } else {
        setAuthToken(null);
        clearStoredAuth();
      }
    },
    [setToken, setUser, setIsGuest, setRefreshToken]
  );

  /**
   * Login bằng username + password
   */
  const loginWithCredentials = useCallback(
    async (username: string, password: string) => {
      const result = await loginWithAccount(username, password);
      setAuth(result.accessToken, result.user, false, result.refreshToken);
      return result;
    },
    [setAuth]
  );

  /**
   * Fetch guest token (for browsing without login)
   */
  const loginAsGuest = useCallback(async () => {
    const result = await fetchGuestToken();
    setAuth(result.accessToken, result.user, true, result.refreshToken);
    return result;
  }, [setAuth]);

  /**
   * Đăng xuất → quay lại guest token
   */
  const logout = useCallback(async () => {
    authLogout();
    clearStoredAuth();

    // Fetch new guest token instead of going to login page
    try {
      const result = await fetchGuestToken();
      setAuth(result.accessToken, result.user, true, result.refreshToken);
    } catch {
      setToken(null);
      setUser(null);
      setIsGuest(true);
    }

    navigate("/");
  }, [setAuth, setToken, setUser, setIsGuest, navigate]);

  return {
    token,
    user,
    isGuest,
    isAuthenticated,
    refreshToken,
    logout,
    setAuth,
    loginWithCredentials,
    loginAsGuest,
  };
}
