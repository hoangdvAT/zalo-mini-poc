/** Backend e-contract yêu cầu dd/mm/yyyy */

const pad2 = (n: number) => n.toString().padStart(2, "0");

export function formatDateToContractApiDdMmYyyy(d: Date): string {
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Hỗ trợ yyyy-mm-dd (profile) hoặc đã là dd/mm/yyyy */
export function normalizeToContractDdMmYyyy(raw: string): string {
    const t = (raw || "").trim();
    if (!t) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) {
        const y = m[1];
        const mo = m[2];
        const day = m[3];
        return `${day}/${mo}/${y}`;
    }
    return t;
}
