import axios from "axios";

const LOGIN_WRONG_CREDENTIALS = "Sai tên tài khoản hoặc mật khẩu";

/**
 * BUG_4: Không hiển thị "Bad request" khi sai tài khoản/mật khẩu.
 */
export function getLoginErrorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        if (!err.response) {
            return "Không thể kết nối máy chủ. Vui lòng thử lại.";
        }
        const status = err.response.status;
        const data = err.response.data as { message?: string; error?: string } | undefined;
        const rawMsg = String(data?.message ?? data?.error ?? "").toLowerCase();

        if (status === 400 || status === 401 || status === 403 || status === 422) {
            if (
                !rawMsg ||
                rawMsg.includes("bad request") ||
                rawMsg.includes("invalid") ||
                rawMsg.includes("credential") ||
                rawMsg.includes("unauthor") ||
                rawMsg.includes("incorrect") ||
                rawMsg.includes("wrong") ||
                rawMsg.includes("thất bại")
            ) {
                return LOGIN_WRONG_CREDENTIALS;
            }
        }
        if (status === 400 || status === 401) {
            return LOGIN_WRONG_CREDENTIALS;
        }
        if (data?.message && typeof data.message === "string") {
            return data.message;
        }
    }
    if (err instanceof Error && err.message && !err.message.includes("Network")) {
        return LOGIN_WRONG_CREDENTIALS;
    }
    return LOGIN_WRONG_CREDENTIALS;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        if (data?.message && typeof data.message === "string") return data.message;
        const first = data?.errors && Object.values(data.errors).flat()[0];
        if (typeof first === "string") return first;
    }
    if (err instanceof Error) return err.message || fallback;
    return fallback;
}
