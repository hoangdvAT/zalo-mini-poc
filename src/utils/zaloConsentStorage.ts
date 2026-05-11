/** Lưu trên thiết bị: user đã từng hoàn tất cấp quyền Zalo (userInfo + phone) cho mini app — không hiện lại modal + authorize mỗi lần đăng nhập (BUG_31). */
const KEY = "zmp_oneat_zalo_permissions_done_v1";

export function hasCompletedZaloMiniPermissions(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markZaloMiniPermissionsCompleted(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}
