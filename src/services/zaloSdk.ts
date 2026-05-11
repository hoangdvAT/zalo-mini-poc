/**
 * Zalo SDK wrapper — thin helpers around `zmp-sdk/apis`
 *
 * Flow chuẩn theo docs Zalo:
 *  1. getAccessToken()       → OAuth access token (BẮT BUỘC)
 *  2. Gửi access token về backend → Backend verify qua Zalo Open API
 *
 * Các API phụ (optional, dùng để enrich UI):
 *  - authorize()             → hỏi quyền scope.userInfo
 *  - getUserInfo()           → name, avatar (hiển thị UI trước khi backend trả)
 *  - getPhoneNumber()        → phone token (backend resolve)
 */

import {
  authorize,
  getUserInfo,
  getPhoneNumber,
  getAccessToken,
} from "zmp-sdk/apis";

// ── Types ──────────────────────────────────────────────────────────

export interface ZaloUserProfile {
  zaloId: string;
  name: string;
  avatar: string;
  idByOA?: string;
  followedOA?: boolean;
  isSensitive?: boolean;
}

export interface ZaloPhoneResult {
  /** @deprecated — may be empty in newer SDK versions */
  number?: string;
  /** Backend-resolvable phone token (single-use, 2 min TTL) */
  token?: string;
}

export interface ZaloAuthBundle {
  /** Access token — BẮT BUỘC, gửi về backend để verify */
  accessToken: string;
  /** Profile data từ client SDK (optional, dùng enrich UI) */
  profile: ZaloUserProfile | null;
  /** Phone token (optional, backend resolve) */
  phone: ZaloPhoneResult | null;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Request user permissions via Zalo SDK `authorize()`.
 * Returns an object with granted/denied per scope.
 */
export async function requestPermissions(
  scopes: ("scope.userInfo" | "scope.userLocation" | "scope.userPhonenumber")[] = [
    "scope.userInfo",
    "scope.userPhonenumber",
  ]
) {
  return authorize({ scopes });
}

/**
 * Fetch user profile via `getUserInfo()`.
 * Requires `scope.userInfo` to have been granted.
 */
export async function fetchZaloProfile(
  autoRequestPermission = true
): Promise<ZaloUserProfile> {
  const { userInfo } = await getUserInfo({ autoRequestPermission });
  return {
    zaloId: userInfo.id,
    name: userInfo.name,
    avatar: userInfo.avatar,
    idByOA: userInfo.idByOA,
    followedOA: userInfo.followedOA,
    isSensitive: userInfo.isSensitive,
  };
}

/**
 * Fetch phone number token via `getPhoneNumber()`.
 * Requires `scope.userPhonenumber` to have been granted.
 *
 * Returns null when the SDK call fails (user denied or dev mode).
 */
export async function fetchZaloPhone(): Promise<ZaloPhoneResult | null> {
  try {
    const result = await getPhoneNumber({});
    return { number: result.number, token: result.token };
  } catch (err) {
    console.warn("[ZaloSDK] getPhoneNumber failed (may be denied):", err);
    return null;
  }
}

/**
 * Full auth bundle — entry-point chính cho login page
 *
 * Flow:
 *  1. authorize()        → Hiện dialog xin quyền (tên, ảnh, SĐT)
 *  2. getAccessToken()   → Lấy access token (BẮT BUỘC)
 *  3. getUserInfo()      → Lấy name, avatar, zaloId
 *  4. getPhoneNumber()   → Lấy phone token (backend resolve)
 *
 * `skipAuthorize`: khi user đã từng đăng nhập thành công trên thiết bị — bỏ `authorize()` để không bị hỏi lại mỗi lần (BUG_31 / đồng bộ hành vi web sau lần đầu).
 */
export async function getZaloAuthBundle(options?: {
  skipAuthorize?: boolean;
}): Promise<ZaloAuthBundle> {
  const skipAuthorize = Boolean(options?.skipAuthorize);

  // 1. Xin quyền (chỉ lần đầu / chưa lưu cờ thiết bị)
  if (!skipAuthorize) {
    try {
      console.log("[ZaloSDK] Requesting permissions...");
      const authResult = await authorize({
        scopes: ["scope.userInfo", "scope.userPhonenumber"],
      });
      console.log("[ZaloSDK] Permission result:", authResult);
    } catch (err) {
      console.warn("[ZaloSDK] authorize() failed (user may have denied):", err);
    }
  } else {
    console.log("[ZaloSDK] skipAuthorize=true — bỏ qua authorize() (đã cấp quyền trước đó)");
  }

  // 2. Lấy access token — BẮT BUỘC
  const accessToken = await getAccessToken();

  console.log("[ZaloSDK] Access token received:", accessToken ? "✓" : "✗");

  if (!accessToken) {
    throw new Error("Không lấy được access token từ Zalo SDK");
  }

  // 3. Lấy profile (name, avatar) — cần scope.userInfo đã được cấp
  let profile: ZaloUserProfile | null = null;
  let phone: ZaloPhoneResult | null = null;

  try {
    profile = await fetchZaloProfile(false);
    console.log("[ZaloSDK] Profile:", profile?.name, profile?.zaloId);
  } catch (err) {
    console.warn("[ZaloSDK] getUserInfo (no auto) failed, retry with autoRequest:", err);
    try {
      profile = await fetchZaloProfile(true);
      console.log("[ZaloSDK] Profile (retry):", profile?.name, profile?.zaloId);
    } catch (err2) {
      console.warn("[ZaloSDK] getUserInfo failed:", err2);
    }
  }

  // 4. Lấy phone token — cần scope.userPhonenumber đã được cấp
  try {
    phone = await fetchZaloPhone();
    console.log("[ZaloSDK] Phone token:", phone?.token ? "✓" : "✗");
  } catch (err) {
    console.warn("[ZaloSDK] getPhoneNumber failed:", err);
  }

  return { accessToken, profile, phone };
}
