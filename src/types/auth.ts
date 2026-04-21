/**
 * Auth types — match API response from pub-be-stag.mp.directsale.vn
 */

/** API auth response (shared between guest-token and login-account) */
export interface ApiAuthResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
  refresh_token_expires_at: string;
  is_active: boolean;
  expires_at: string;
  user_id: number;
  phone: string;
  user_name: string;
  refresh_token_value: string;
  email: string;
}

/** Wrapper response from API */
export interface ApiAuthWrapper {
  status: string;
  data: {
    response: ApiAuthResponse;
  };
}

/** Internal user representation */
export interface AuthUser {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  zaloId?: string;
  email?: string;
  isNewUser: boolean;
}

/** Convert API response to internal AuthUser */
export function apiResponseToAuthUser(res: ApiAuthResponse): AuthUser {
  return {
    id: String(res.user_id),
    name: res.user_name,
    phone: res.phone,
    email: res.email,
    isNewUser: false,
  };
}

/** GET /api/v1/publishers/me — dùng cho Profile (bổ sung thông tin publisher) */
export interface PublisherProfile {
  ad_space_code: string;
  user: AuthUser;
  /** Số chiến dịch đã tham gia (nếu backend trả về) */
  campaigns_count?: number;
  /** Tổng đơn / conversion (nếu backend trả về) */
  orders_count?: number;
  raw?: any;
}
