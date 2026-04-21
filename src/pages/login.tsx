import React, { useState, useCallback, useEffect } from "react";
import { Page, Icon } from "zmp-ui";
import { useNavigate, useLocation } from "zmp-ui";

import { useAuth } from "@/hooks/useAuth";
import { loginWithZalo } from "@/services/auth";
import { getZaloAuthBundle } from "@/services/zaloSdk";

import PermissionConsentModal from "@/components/auth/PermissionConsentModal";
import LoginView from "@/components/auth/LoginView";
import { getLoginErrorMessage } from "@/utils/authErrors";

type LoginStep = "manual" | "consent" | "loading";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated, loginWithCredentials } = useAuth();
  const [step, setStep] = useState<LoginStep>("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract redirect path from query params
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get("redirect") || "/";


  // If already authenticated (non-guest), redirect to target
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);



  /**
   * Login bằng username + password
   */
  const handleAccountLogin = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await loginWithCredentials(username, password);
        console.log("[Auth] Account login success, user:", result.user);
        navigate(redirectPath, { replace: true });
      } catch (err) {
        console.error("[Auth] Account login error:", err);
        setError(getLoginErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [loginWithCredentials, navigate]
  );

  /**
   * Luồng xác thực Zalo — gửi profile + phoneToken lên backend
   */
  const performZaloAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const bundle = await getZaloAuthBundle();

      console.log("[Auth] Zalo bundle collected", bundle);

      console.log("[Auth] Zalo bundle collected", {
        hasAccessToken: !!bundle.accessToken,
        hasProfile: !!bundle.profile,
        hasPhone: !!bundle.phone,
      });


      // Lấy phone token từ SDK (backend sẽ resolve ra SĐT thật)
      const phoneToken = bundle.phone?.token || "";

      // Gửi id_token (accessToken) + phone_token lên backend
      const res = await loginWithZalo({
        accessToken: bundle.accessToken,
        phoneToken,
      });

      // Merge: SDK profile data ưu tiên hơn backend response
      const phoneFromSdk = bundle.phone?.number?.trim();
      const mergedUser = {
        ...res.user,
        name: bundle.profile?.name || res.user.name,
        avatar: bundle.profile?.avatar || res.user.avatar,
        zaloId: bundle.profile?.zaloId || res.user.zaloId,
        /** BUG_6: ưu tiên SĐT từ getPhoneNumber (khi SDK trả number) khớp tài khoản Zalo */
        phone: phoneFromSdk || res.user.phone,
      };

      console.log("[Auth] Zalo login success:", mergedUser);
      // Dùng ssoToken.access_token làm auth token cho API calls
      setAuth(res.token, mergedUser, false, res.refreshToken);

      if (res.isNewUser) {
        navigate("/register", { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      console.error("[Auth] Zalo login flow error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Đăng nhập Zalo thất bại. Vui lòng thử lại.";
      const apiMsg = (err as any)?.response?.data?.message;
      setError(apiMsg || msg);
      setStep("manual");
    } finally {
      setLoading(false);
    }
  }, [setAuth, navigate]);

  /**
   * User nhấn "Cho phép" trên modal giải thích Zalo permissions
   */
  const handleAllow = useCallback(() => {
    setStep("loading");
    performZaloAuth();
  }, [performZaloAuth]);

  /**
   * User nhấn "Từ chối" trên modal
   */
  const handleReject = useCallback(() => {
    setStep("manual");
  }, []);

  /**
   * Nhấn "Đăng nhập với Zalo" trên LoginView
   */
  const handleZaloLoginFromManual = useCallback(() => {
    setStep("consent");
    setError(null);
  }, []);

  return (
    <Page className="login-page-be" hideScrollbar>
      <div 
        style={{ position: 'absolute', top: 16, left: 16, zIndex: 50, cursor: 'pointer', padding: 8 }} 
        onClick={() => navigate("/", { replace: true })}
      >
        <Icon icon="zi-arrow-left" style={{ fontSize: 24, color: '#1A1A2E' }} />
      </div>

      {/* Loading overlay */}
      {step === "loading" && (
        <div className="login-loading-overlay">
          <div className="login-loading-spinner" />
          <p className="login-loading-text">Đang kết nối Zalo...</p>
        </div>
      )}

      {/* Step 1: Permission consent modal (Zalo flow) */}
      <PermissionConsentModal
        open={step === "consent"}
        onAllow={handleAllow}
        onReject={handleReject}
      />

      {/* Main login view: Username/Password + Zalo button */}
      {step === "manual" && (
        <LoginView
          onLogin={handleAccountLogin}
          onZaloLogin={handleZaloLoginFromManual}
          loading={loading}
          error={error}
        />
      )}
    </Page>
  );
};

export default LoginPage;
