import React, { useState, useCallback } from "react";
import { Button } from "zmp-ui";
import atLogo from "@/static/at-logo.png";
import icZaloColored from "@/static/ic_zalo_colored.svg";

interface LoginViewProps {
  onLogin: (username: string, password: string) => void;
  onZaloLogin: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * Màn hình đăng nhập - Username/Password + Zalo
 */
const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  onZaloLogin,
  loading = false,
  error = null,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (username.trim() && password.trim()) {
        onLogin(username.trim(), password);
      }
    },
    [username, password, onLogin]
  );

  const isValid = username.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="login-view">
      {/* Header Title */}
      <div className="login-view__header">
        <img src={atLogo} alt="ACCESSTRADE" className="login-view__brand-img" />
        <h1 className="login-view__title">
          Kiếm tiền cùng ACCESSTRADE
        </h1>
      </div>

      {/* Username/Password Login Form */}
      <form className="login-view__form" onSubmit={handleSubmit}>
        <div className="login-view__input-wrapper">
          <input
            id="username-input"
            type="text"
            className="login-view__input"
            placeholder="Tên tài khoản"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
          />
        </div>

        <div className="login-view__input-wrapper" style={{ marginTop: 12, position: "relative" }}>
          <input
            id="password-input"
            type={showPassword ? "text" : "password"}
            className="login-view__input"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: 14,
            }}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {error && (
          <div className="login-view__error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className={`login-view__btn-continue ${isValid && !loading ? "" : "login-view__btn-continue--disabled"}`}
          disabled={!isValid || loading}
        >
          {loading ? (
            <span className="login-view__spinner" />
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="login-view__divider">
        <span className="login-view__divider-line" />
        <span className="login-view__divider-text">hoặc</span>
        <span className="login-view__divider-line" />
      </div>

      {/* Zalo Login Button */}
      <Button
        variant="primary"
        fullWidth
        size="large"
        className="login-view__btn-zalo"
        onClick={onZaloLogin}
        disabled={loading}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <img
            src={icZaloColored}
            alt="Zalo"
            className="login-view__zalo-icon"
          />
          <span>Đăng nhập với Zalo</span>
        </div>
      </Button>

      {/* Footer / Terms */}
      <div className="login-view__footer">
        <p className="login-view__terms">
          Bằng việc tiếp tục, bạn đồng ý với{" "}
          <a href="#" className="login-view__link">
            Quy chế sàn TMĐT
          </a>
          ,{" "}
          <a href="#" className="login-view__link">
            Hợp đồng vận chuyển
          </a>{" "}
          của <strong>ACCESSTRADE</strong> và ACCESSTRADE được xử lý dữ liệu cá nhân
          của mình.
        </p>
      </div>
    </div>
  );
};

export default LoginView;
