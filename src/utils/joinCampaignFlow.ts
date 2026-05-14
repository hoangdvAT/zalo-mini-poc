/** Payload join contract — khớp logic `join()` trong `campaign/index/index.component.ts` (portal web). */
export interface JoinContractPayload {
  status?: string;
  data?: {
    check?: {
      total?: number;
      pending?: number;
      active?: number;
    };
  };
  errorCode?: number;
  message?: string;
}

function unwrapJoinResponse(raw: unknown): JoinContractPayload {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  if (typeof root.status === "string") return root as JoinContractPayload;
  const d = root.data;
  if (d && typeof d === "object") {
    const dr = d as Record<string, unknown>;
    if (typeof dr.status === "string") return dr as JoinContractPayload;
    const inner = dr.data;
    if (inner && typeof inner === "object" && typeof (inner as Record<string, unknown>).status === "string") {
      return inner as JoinContractPayload;
    }
  }
  return root as JoinContractPayload;
}

export function normalizeJoinContractResponse(axiosBody: unknown): JoinContractPayload {
  return unwrapJoinResponse(axiosBody);
}

type SnackbarType = "success" | "error" | "warning" | "default";

export interface JoinCampaignUi {
  openSnackbar: (opts: { type: SnackbarType; text: string; duration?: number }) => void;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  /** Sau join thành công — ví dụ reload list trên Home hoặc refetch chi tiết */
  onSuccess?: () => void | Promise<void>;
  /** Mở modal “Đến Hồ sơ” khi thiếu ad space (thay fireCenter portal). */
  onNeedAdSpace?: (message: string) => void;
}

/**
 * Xử lý body API join campaign — đồng bộ nhánh `fail` / `error` / success với Angular portal.
 * @returns true nếu join thành công (caller nên refetch campaign).
 */
export async function applyJoinCampaignResponse(
  res: JoinContractPayload,
  ui: JoinCampaignUi
): Promise<boolean> {
  const { openSnackbar, navigate, onSuccess, onNeedAdSpace } = ui;

  if (res.status === "fail") {
    const check = res.data?.check;
    const typeCheck = typeof check;
    if (typeCheck === "object" && check) {
      const total = Number(check.total);
      const pending = Number(check.pending);
      if (!Number.isNaN(total) && total > 0) {
        if (!Number.isNaN(pending) && pending > 0) {
          openSnackbar({
            type: "default",
            text: "Ad space của bạn đang ở trạng thái chờ duyệt và sẽ được xử lý trong vòng 24h.",
            duration: 4500,
          });
          return false;
        }
        const msg = "Bạn chưa có Ad Spaces. Vui lòng tạo Ad Spaces để được tham gia chiến dịch.";
        if (onNeedAdSpace) onNeedAdSpace(msg);
        else {
          openSnackbar({ type: "warning", text: msg, duration: 4000 });
          navigate("/profile");
        }
        return false;
      }
      const msg = "Bạn chưa có Ad Spaces. Vui lòng tạo Ad Spaces để được tham gia chiến dịch.";
      if (onNeedAdSpace) onNeedAdSpace(msg);
      else {
        openSnackbar({ type: "warning", text: msg, duration: 4000 });
        navigate("/profile");
      }
      return false;
    }
    if (typeCheck === "undefined") {
      openSnackbar({
        type: "error",
        text: "Bạn không có quyền tham gia chiến dịch (chưa thuộc phân khúc hoặc chưa đủ điều kiện).",
        duration: 4500,
      });
      return false;
    }
    openSnackbar({
      type: "error",
      text: "Không thể tham gia chiến dịch. Vui lòng thử lại sau.",
      duration: 4000,
    });
    return false;
  }

  if (res.status === "error") {
    if (res.errorCode === 403 && res.message) {
      openSnackbar({ type: "error", text: String(res.message), duration: 4500 });
    } else {
      openSnackbar({
        type: "error",
        text: "Tham gia chiến dịch thất bại. Vui lòng thử lại.",
        duration: 4000,
      });
    }
    return false;
  }

  /** Các trường hợp còn lại (success / không có `status` / HTTP 200) — giống nhánh `else` trên portal. */
  openSnackbar({
    type: "success",
    text: "Tham gia chiến dịch thành công",
    duration: 3500,
  });
  await Promise.resolve(onSuccess?.());
  return true;
}
