import type { ConversionItem } from "@/types/campaign";

type Conv = ConversionItem | Record<string, unknown>;

function num(v: unknown): number {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
    }
    return 0;
}

/**
 * Tổng SL dòng hàng — đồng bộ portal: cộng `conversion_parts`, fallback các field phẳng API có thể trả.
 */
export function getConversionQuantitySum(conv: Conv): number {
    const c = conv as Record<string, unknown>;
    const direct = c.total_quantity ?? c.quantity ?? c.conversion_part_quantity ?? c.items_quantity;
    const d = num(direct);
    if (d > 0) return d;

    const parts = (c.conversion_parts as Array<Record<string, unknown>> | undefined) || [];
    if (!parts.length) return 0;
    return parts.reduce((s, p) => {
        const q = p.quantity ?? p.qty ?? p.amount_quantity ?? p.item_quantity;
        return s + num(q);
    }, 0);
}

/**
 * Hoa hồng publisher — ưu tiên `total_cal_commission_pub` (giống web), sau đó `total_commission`, `total_cal_commission`.
 */
export function getPublisherCommissionAmount(conv: Conv): number {
    const c = conv as Record<string, unknown>;
    const cal = c.cal_commission as Record<string, unknown> | undefined;
    if (cal && typeof cal === "object") {
        const pub = cal.total_cal_commission_pub;
        if (typeof pub === "number") return pub;
        if (pub && typeof pub === "object" && "amount" in (pub as object)) {
            const a = num((pub as { amount?: unknown }).amount);
            if (a > 0) return a;
        }
        const total = cal.total_cal_commission as { amount?: unknown } | undefined;
        if (total && typeof total.amount !== "undefined") {
            const a = num(total.amount);
            if (a > 0) return a;
        }
    }
    const tc = c.total_commission as { amount?: unknown } | undefined;
    if (tc && typeof tc.amount !== "undefined") return num(tc.amount);
    const pc = c.pub_commission as { amount?: unknown } | undefined;
    if (pc && typeof pc.amount !== "undefined") return num(pc.amount);
    if (cal && typeof cal === "object") {
        const total = cal.total_cal_commission as { amount?: unknown } | undefined;
        if (total && typeof total.amount !== "undefined") return num(total.amount);
    }
    return 0;
}

/**
 * Lý do / ghi chú trạng thái — mảng `reason` hoặc chuỗi trực tiếp.
 */
export function getConversionReasonText(conv: Conv): string {
    const c = conv as Record<string, unknown>;
    const reasons = c.reason;
    if (Array.isArray(reasons) && reasons.length > 0) {
        const last = reasons[reasons.length - 1] as Record<string, unknown>;
        const t =
            (typeof last.log_action === "string" && last.log_action) ||
            (typeof last.message === "string" && last.message) ||
            (typeof last.reason === "string" && last.reason) ||
            (typeof last.content === "string" && last.content);
        if (t && String(t).trim()) return String(t).trim();
    }
    if (typeof c.reason === "string" && c.reason.trim()) return c.reason.trim();
    if (typeof c.reject_reason === "string" && c.reject_reason.trim()) return c.reject_reason.trim();
    if (typeof c.note === "string" && c.note.trim()) return c.note.trim();
    return "—";
}

/** Giá trị đơn (sale) */
export function getSaleAmount(conv: Conv): number {
    const c = conv as Record<string, unknown>;
    const t = c.total_sale_amount as { amount?: unknown } | undefined;
    if (t && typeof t.amount !== "undefined") return num(t.amount);
    return num(c.sale_amount ?? c.total_sale);
}

/** % hoa hồng so với giá trị đơn */
export function getCommissionPercentLabel(conv: Conv, commAmount: number): string {
    const sale = getSaleAmount(conv);
    if (sale <= 0 || commAmount <= 0) return "";
    const pct = (commAmount / sale) * 100;
    return `(${pct.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%)`;
}

/** Giá trị dòng sản phẩm trong part */
export function getPartLineAmount(part: Record<string, unknown>): number {
    return num(
        part.total_price ??
            part.line_amount ??
            part.sale_amount ??
            part.amount ??
            part.price
    );
}
