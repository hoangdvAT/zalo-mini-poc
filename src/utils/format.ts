/**
 * Format số tiền VND
 */
export function formatPrice(price: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(price);
}

/**
 * Format số lượng rút gọn: 1500 → "1.5k", 24000 → "24k"
 */
export function formatCount(count: number): string {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
}

/**
 * Format số có dấu phẩy: 1234567 → "1,234,567"
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat("vi-VN").format(num);
}

/**
 * Tính phần trăm giảm giá
 */
export function calcDiscount(price: number, originalPrice?: number): number {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Format khoảng ngày: "2026-01-15", "2026-01-25" → "15-25/01/2026"
 */
export function formatDateRange(startStr?: string, endStr?: string): string {
  if (!startStr && !endStr) return "";
  if (!startStr) return endStr ? formatDate(endStr) : "";
  if (!endStr) return formatDate(startStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  const sd = start.getDate();
  const ed = end.getDate();
  const m = start.getMonth() + 1;
  const y = start.getFullYear();
  return `${sd}-${ed}/${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Format ngày: "2025-02-10T14:30:00Z" → "10/02/2025"
 */
export function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/**
 * Format ngày giờ: "2025-02-10T14:30:00Z" → "14:30 10/02/2025"
 */
export function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
    const date = d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    return `${time} ${date}`;
}

/**
 * Format phần trăm thay đổi: 15.2 → "+15.2%", -5.1 → "-5.1%"
 */
export function formatChange(change: number): string {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
}

/**
 * YYYY-MM-DD theo giờ local — tránh lệch ngày khi dùng `toISOString()` (UTC).
 */
export function formatLocalDateYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * `from_date` / `to_date` cho API report/overview — **tháng hiện tại** (theo lịch local).
 */
export function getCurrentMonthRangeYmd(): { from_date: string; to_date: string } {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        from_date: formatLocalDateYmd(first),
        to_date: formatLocalDateYmd(last),
    };
}

/** Caption hiển thị: ví dụ "Tháng 4/2026". */
export function getCurrentMonthCaptionVi(): string {
    const d = new Date();
    return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Chuẩn hoá URL mở ngoài app / trình duyệt (Zalo cần có scheme). */
export function ensureHttpUrl(url: string): string {
    const t = url.trim();
    if (!t) return t;
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}
