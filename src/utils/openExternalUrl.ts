import { openOutApp, openWebview } from "zmp-sdk/apis";

function isMiniAppWebDevHost(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const { hostname } = window.location;
        return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
        return false;
    }
}

/**
 * ZMP SDK validate `url` (Zod `.url()`). Chuỗi kiểu `deo.vn` không có scheme → fail / native lỗi.
 */
function normalizeHttpUrlForOpen(raw: string): string {
    let t = typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
    if (!t) return t;
    if (t.startsWith("//")) t = `https:${t}`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
    return `https://${t}`;
}

/**
 * Mở URL trong Zalo Mini App: **openOutApp trước** (mở ngoài app, ít crash WebView nội bộ hơn),
 * rồi webview, rồi fallback trình duyệt.
 * `openOutApp` / `openWebview` trên **mpWeb (localhost)** resolve thành công nhưng không mở gì — fallback `window` / `location`.
 */
export async function openExternalUrl(url: string): Promise<void> {
    let trimmed = "";
    try {
        trimmed = normalizeHttpUrlForOpen(
            typeof url === "string" ? url : String(url ?? "")
        );
    } catch {
        return;
    }
    if (!trimmed) return;

    try {
        if (isMiniAppWebDevHost()) {
            try {
                const w = window.open(trimmed, "_blank", "noopener,noreferrer");
                if (w) return;
            } catch (e) {
                console.warn("[openExternalUrl] window.open (dev):", e);
            }
            window.location.assign(trimmed);
            return;
        }

        try {
            await openOutApp({ url: trimmed });
            return;
        } catch (e) {
            console.warn("[openExternalUrl] openOutApp:", e);
        }

        try {
            await openWebview({
                url: trimmed,
                config: { style: "normal" },
            });
            return;
        } catch (e) {
            console.warn("[openExternalUrl] openWebview:", e);
        }

        try {
            const w = window.open(trimmed, "_blank", "noopener,noreferrer");
            if (w) return;
        } catch (e) {
            console.warn("[openExternalUrl] window.open:", e);
        }

        window.location.assign(trimmed);
    } catch (e) {
        console.error("[openExternalUrl] unexpected:", e);
        try {
            window.location.assign(trimmed);
        } catch {
            /* ignore */
        }
    }
}
