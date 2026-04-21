import React, { useEffect } from "react";
import { useNavigate, useLocation } from "zmp-ui";
import { useAtomValue } from "jotai";
import { isGuestAtom } from "@/state/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Paths that require logged-in (non-guest) user */
const LOGIN_REQUIRED_PATHS = ["/get-link/", "/profile", "/report", "/payment"];

/**
 * AuthGuard:
 * - Cho phép TẤT CẢ pages khi có token (guest hoặc logged-in)
 * - Chỉ chặn /get-link/ nếu user là GUEST → redirect sang /login
 * - KHÔNG chặn khi không có token (AuthInit sẽ handle fetch guest token)
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isGuest = useAtomValue(isGuestAtom);
  const navigate = useNavigate();
  const location = useLocation();

  const needsLogin = LOGIN_REQUIRED_PATHS.some((p) =>
    location.pathname.startsWith(p)
  );

  useEffect(() => {
    // Guest trying to access login-required pages → go to login
    if (isGuest && needsLogin) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [isGuest, needsLogin, navigate]);

  // Block rendering while redirecting
  if (isGuest && needsLogin) return null;

  return <>{children}</>;
};

export default AuthGuard;
