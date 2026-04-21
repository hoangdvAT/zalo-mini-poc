import React, { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import { authTokenAtom, userAtom, isGuestAtom, refreshTokenAtom } from "@/state/auth";
import { setAuthToken, fetchGuestToken } from "@/services/api";
import { getStoredAuth, clearStoredAuth, setStoredAuth } from "@/utils/storage";

interface AuthInitProps {
  children: React.ReactNode;
}

/**
 * Khởi tạo auth khi app load:
 * 1. Nếu có stored token (logged-in user) → dùng lại
 * 2. Nếu không → tự động gọi guest-token API
 */
const AuthInit: React.FC<AuthInitProps> = ({ children }) => {
  const setToken = useSetAtom(authTokenAtom);
  const setUser = useSetAtom(userAtom);
  const setIsGuest = useSetAtom(isGuestAtom);
  const setRefreshToken = useSetAtom(refreshTokenAtom);
  const [ready, setReady] = useState(false);

  console.log(1)

  useEffect(() => {
    const init = async () => {
      // 1. Try to restore from storage
      const stored = getStoredAuth();
      if (stored?.token) {
        // Validate: if stored as non-guest but token looks like a long JWT 
        // (wrong token from previous broken login), clear and re-fetch guest
        const isLikelyValidToken = stored.token.length < 200; // ssoToken.access_token is UUID ~36 chars
        if (!stored.isGuest && !isLikelyValidToken) {
          console.warn("[AuthInit] Stored token looks invalid (too long), clearing...");
          clearStoredAuth();
        } else {
          setToken(stored.token);
          setUser(stored.user);
          setIsGuest(stored.isGuest);
          setAuthToken(stored.token);
          if (stored.refreshToken) {
            setRefreshToken(stored.refreshToken);
          }
          console.log("[AuthInit] Restored from storage, isGuest:", stored.isGuest);
          setReady(true);
          return;
        }
      }

      // 2. No stored token → fetch guest token
      try {
        console.log("[AuthInit] No stored auth, fetching guest token...");
        const result = await fetchGuestToken();
        setToken(result.accessToken);
        setUser(result.user);
        setIsGuest(true);
        setRefreshToken(result.refreshToken);
        setAuthToken(result.accessToken);
        setStoredAuth(result.accessToken, result.user, result.refreshToken, true);
        console.log("[AuthInit] Guest token obtained successfully");
      } catch (err) {
        console.error("[AuthInit] Failed to get guest token:", err);
        // Still allow app to load — pages will handle missing token gracefully
        clearStoredAuth();
      }

      setReady(true);
    };

    init();
  }, [setToken, setUser, setIsGuest, setRefreshToken]);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg, #f4f5f7)",
        }}
      >
        <span style={{ fontSize: 18, color: "var(--text-muted, #9ca3af)" }}>
          Đang tải...
        </span>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthInit;
