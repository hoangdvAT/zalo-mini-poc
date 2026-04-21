import { openOutApp } from "zmp-sdk/apis";

// Ví dụ Scheme của App Native: myapp:// hoặc openat://
const NATIVE_APP_SCHEME = "openat://job?id=";
const NATIVE_APP_FALLBACK_URL = "https://oneat.vn/download"; // Link Web để tải app hoặc redirect

export const openNativeApp = async (jobId: number | string) => {
    try {
        // Thử dùng API mở ứng dụng ngoài của Zalo
        await openOutApp({
            url: `${NATIVE_APP_SCHEME}${jobId}`,
            success: () => {
                // Zalo gọi API thành công (Lưu ý: Không đảm bảo Native App bung lên)
                console.log("Called openOutApp API successfully with URI:", `${NATIVE_APP_SCHEME}${jobId}`);
            },
            fail: (error) => {
                // Zalo từ chối mở hoặc thiết bị không hỗ trợ
                console.log("Failed to openOutApp, fallback to Webview:", error);
                fallbackToWebview(jobId);
            }
        });
    } catch (error) {
        console.log("Exception in openOutApp, fallback to Webview:", error);
        fallbackToWebview(jobId);
    }
};

const fallbackToWebview = (jobId: number | string) => {
    // Thay vì văng ra trình duyệt mặc định, dùng Webview trong Zalo mở Landing Page.
    // Tại Landing Page đó (Web của team), user sẽ ấn 1 nút cứng để trigger Universal Link/App Link.
    const fallbackUrl = `${NATIVE_APP_FALLBACK_URL}?jobId=${jobId}`;

    // Mở trình duyệt ngoài (OS default browser) -> Tỉ lệ bung app native cao hơn in-app browser
    window.open(fallbackUrl, '_blank');
};
