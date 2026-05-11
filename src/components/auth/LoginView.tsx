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
        <p className="login-view__subtitle">
          Đăng nhập để quản lý chiến dịch, theo dõi thu nhập và ký hợp đồng điện tử.
        </p>
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

        <div className="login-view__input-wrapper login-view__input-wrapper--spaced">
          <input
            id="password-input"
            type={showPassword ? "text" : "password"}
            className="login-view__input login-view__input--with-toggle"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="login-view__password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
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
        <div className="login-view__zalo-content">
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
