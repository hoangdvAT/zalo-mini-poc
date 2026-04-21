/**
 * Auth service
 * Handles authentication with staging backend
 *
 * Two login methods:
 * 1. Username/Password → POST /api/v1/auth/login-account
 * 2. Zalo Mini App → POST /api/v1/auth/social-signup
 *    (Client sends id_token from Zalo SDK)
 */

import type { AuthUser } from "@/types/auth";
import { setAuthToken, loginWithAccount as apiLoginWithAccount, loginWithZaloBackend } from "./api";

export interface LoginWithZaloParams {
  /** accessToken từ Zalo getAccessToken() — dùng làm id_token */
  accessToken: string;
  /** Phone token từ getPhoneNumber() — backend resolve ra SĐT thật */
  phoneToken?: string;
}

export interface LoginWithZaloResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

/**
 * Đăng nhập bằng Zalo — gửi id_token + phone_token lên backend
 * Backend dùng phone_token gọi Zalo API để lấy SĐT thật
 * POST /api/v1/auth/social-signup { id_token, provider: "zalo", phone_token }
 */
export async function loginWithZalo(
  params: LoginWithZaloParams
): Promise<LoginWithZaloResponse> {
  if (!params.accessToken) {
    throw new Error("Access token không hợp lệ");
  }

  return loginWithZaloBackend({
    idToken: params.accessToken,
    phoneToken: params.phoneToken,
  });
}

/**
 * Đăng nhập bằng username + password
 */
export { apiLoginWithAccount as loginAccount };

/**
 * Đăng ký User mới
 */
export interface RegisterParams {
  name: string;
  phone: string;
  email: string;
}

export async function registerUser(params: RegisterParams): Promise<AuthUser> {
  const response = await import("./api").then(m => m.default.post<{ data: AuthUser }>("/auth/register", params));
  return response.data.data;
}

/**
 * Đăng xuất (clear local)
 */
export function logout(): void {
  setAuthToken(null);
}
