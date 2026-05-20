import type { Campaign, Contract } from "@/types/campaign";
import { formatNumber } from "@/utils/format";

export type CampaignListCtaMode = "join" | "pending" | "create-link" | "rejected";

function firstNum(...vals: unknown[]): number | undefined {
    for (const v of vals) {
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
    }
    return undefined;
}

/**
 * CTA theo đúng template web `campaign-card.component.html` (mp-publisher-portal):
 * Join khi `total === 0`; chờ khi `active === 0 && pending > 0`;
 * tạo link khi `active > 0 && has_deeplink`.
 */
function resolveCtaFromPortalAggregates(c: Campaign): CampaignListCtaMode | null {
    const r = c as Record<string, unknown>;
    const totalRaw = r.total;
    const activeRaw = r.active;
    const pendingRaw = r.pending;

    const hasAny =
        (totalRaw !== undefined && totalRaw !== null && totalRaw !== "") ||
        (activeRaw !== undefined && activeRaw !== null && activeRaw !== "") ||
        (pendingRaw !== undefined && pendingRaw !== null && pendingRaw !== "");

    if (!hasAny) return null;

    const total = Number(totalRaw);
    const active = Number(activeRaw);
    const pending = Number(pendingRaw);
    const deeplink = Number(c.has_deeplink);
    /** Một số bản API list trả thêm số hợp đồng từ chối — ưu tiên trước nhánh “chờ” tổng hợp. */
    const rejectedAgg = firstNum(r.rejected, r.rejected_count, r.contract_rejected, r.reject_count);
    if (rejectedAgg !== undefined && !Number.isNaN(rejectedAgg) && rejectedAgg > 0) return "rejected";

    if (!Number.isNaN(total) && total === 0) return "join";
    if (!Number.isNaN(active) && active > 0 && !Number.isNaN(deeplink) && deeplink > 0) return "create-link";
    if (!Number.isNaN(active) && !Number.isNaN(pending) && active === 0 && pending > 0) return "pending";
    /** Web v1: active=0 & pending=0 & đã có contract — "Contract invalid"; gần với chờ / không tạo link. */
    if (!Number.isNaN(active) && !Number.isNaN(pending) && active === 0 && pending === 0 && !Number.isNaN(total) && total > 0) {
        return "pending";
    }
    /** Đã active nhưng campaign không bật deeplink — không hiện nút tạo link trên web. */
    if (!Number.isNaN(active) && active > 0 && (Number.isNaN(deeplink) || deeplink <= 0)) return "pending";

    return null;
}

/**
 * Đọc snapshot hợp đồng từ chính item campaign trong response list (1 API without-contract).
 * Hỗ trợ: publisher_contract (object), contract (object), mảng contracts[0], hoặc field phẳng contract_status / …
 */
type ListItemContractSnapshot = {
    status: number;
    advertiser_status: number;
    publisher_status: number;
    sync_contract_status: string;
};

function readStringField(o: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function contractRowFromUnknown(row: Record<string, unknown>): Contract {
    return {
        id: firstNum(row.id) ?? 0,
        code: String(row.code ?? ""),
        campaign_id: firstNum(row.campaign_id, row.campaignId) ?? 0,
        ad_space_id: firstNum(row.ad_space_id, row.adSpaceId) ?? 0,
        publisher_id: firstNum(row.publisher_id, row.publisherId) ?? 0,
        status: firstNum(row.status, row.contract_status, row.contractStatus) ?? 0,
        advertiser_status: firstNum(row.advertiser_status, row.advertiserStatus) ?? 0,
        publisher_status: firstNum(row.publisher_status, row.publisherStatus) ?? 0,
        created_at: String(row.created_at ?? row.createdAt ?? ""),
        updated_at: String(row.updated_at ?? row.updatedAt ?? ""),
        sync_contract_status: readStringField(row, ["sync_contract_status", "syncContractStatus"]),
    };
}

/** true nếu bất kỳ hợp đồng nhúng trong item list đều là từ chối (không chỉ phần tử [0]). */
function anyEmbeddedContractRejectedInListItem(c: Campaign): boolean {
    const r = c as Record<string, unknown>;
    const listKeys = ["contracts", "publisher_contracts"];
    for (const k of listKeys) {
        const arr = r[k];
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            if (isContractRejected(contractRowFromUnknown(item as Record<string, unknown>))) return true;
        }
    }
    const nestedKeys = ["publisher_contract", "publisherContract", "contract"];
    for (const k of nestedKeys) {
        const v = r[k];
        if (v && typeof v === "object" && !Array.isArray(v)) {
            if (isContractRejected(contractRowFromUnknown(v as Record<string, unknown>))) return true;
        }
    }
    return false;
}

function readContractSnapshotFromListItem(c: Campaign): ListItemContractSnapshot | null {
    const r = c as Record<string, unknown>;

    let status = firstNum(r.contract_status, r.publisher_contract_status);
    let adv = firstNum(r.advertiser_status, r.advertiserStatus);
    let pub = firstNum(r.publisher_status, r.publisherStatus);
    let sync = readStringField(r, ["sync_contract_status", "syncContractStatus"]);

    const nestedKeys = ["publisher_contract", "publisherContract", "contract"];
    for (const k of nestedKeys) {
        const v = r[k];
        if (v && typeof v === "object" && !Array.isArray(v)) {
            const o = v as Record<string, unknown>;
            status = status ?? firstNum(o.status, o.contract_status, o.contractStatus);
            adv = adv ?? firstNum(o.advertiser_status, o.advertiserStatus);
            pub = pub ?? firstNum(o.publisher_status, o.publisherStatus);
            if (!sync) sync = readStringField(o, ["sync_contract_status", "syncContractStatus"]);
        }
    }

    const listKeys = ["contracts", "publisher_contracts"];
    for (const k of listKeys) {
        const arr = r[k];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        /** Portal: `status === 3` = rejected — ưu tiên bất kỳ bản ghi từ chối, không chỉ `contracts[0]`. */
        for (const item of arr) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const row = contractRowFromUnknown(item as Record<string, unknown>);
            if (isContractRejected(row)) {
                return {
                    status: row.status,
                    advertiser_status: row.advertiser_status,
                    publisher_status: row.publisher_status,
                    sync_contract_status: row.sync_contract_status || "",
                };
            }
        }
        if (typeof arr[0] === "object") {
            const o = arr[0] as Record<string, unknown>;
            status = status ?? firstNum(o.status, o.contract_status, o.contractStatus);
            adv = adv ?? firstNum(o.advertiser_status, o.advertiserStatus);
            pub = pub ?? firstNum(o.publisher_status, o.publisherStatus);
            if (!sync) sync = readStringField(o, ["sync_contract_status", "syncContractStatus"]);
            break;
        }
    }

    /** Có dữ liệu hợp đồng nhúng — kể cả chỉ có advertiser_status (từ chối) mà thiếu status */
    const hasContractSignal =
        status !== undefined || adv !== undefined || pub !== undefined || Boolean(sync);
    if (!hasContractSignal) return null;

    return {
        status: status ?? 0,
        advertiser_status: adv ?? 0,
        publisher_status: pub ?? 0,
        sync_contract_status: sync,
    };
}

function syntheticContractFromListSnapshot(c: Campaign, snap: ListItemContractSnapshot): Contract {
    return {
        id: 0,
        code: "",
        campaign_id: c.id,
        ad_space_id: 0,
        publisher_id: 0,
        status: snap.status,
        advertiser_status: snap.advertiser_status,
        publisher_status: snap.publisher_status,
        created_at: "",
        updated_at: "",
        sync_contract_status: snap.sync_contract_status,
    };
}

/**
 * CTA card home — chỉ từ dữ liệu list campaign (không gọi thêm API contracts từng campaign).
 * Từ chối (publisher_contract / advertiser_status) phải thắng aggregate `active=0 & pending=0 & total>0`
 * (trước đây luôn thành "Chờ phản hồi" dù chi tiết đã từ chối — BUG).
 */
export function resolveCtaModeFromCampaignListItem(c: Campaign): CampaignListCtaMode {
    const snap = readContractSnapshotFromListItem(c);
    if (snap) {
        const syn = syntheticContractFromListSnapshot(c, snap);
        if (isContractRejected(syn)) return "rejected";
    }
    if (anyEmbeddedContractRejectedInListItem(c)) return "rejected";

    const fromPortal = resolveCtaFromPortalAggregates(c);
    if (fromPortal !== null) return fromPortal;

    if (snap) {
        return resolveContractCtaMode([syntheticContractFromListSnapshot(c, snap)]);
    }
    return "join";
}

export function resolveCtaModeFromCampaignListItem2(campaign: Campaign): CampaignListCtaMode | "" {
    if (campaign.total === 0) {
        return "join";
    }
    if (Number(campaign.active) === 0 && Number(campaign.pending) > 0) {
        return "pending";
    }
    if (Number(campaign.active) > 0 && campaign.has_deeplink) {
        return "create-link";
    }
    return "";
}

/**
 * Payload campaign đã đủ để suy CTA giống list (total/active/pending hoặc snapshot contract),
 * không cần gọi thêm GET contracts/campaign.
 */
export function campaignPayloadHasCtaHint(c: Campaign): boolean {
    if (resolveCtaFromPortalAggregates(c) !== null) return true;
    if (readContractSnapshotFromListItem(c) !== null) return true;
    if (anyEmbeddedContractRejectedInListItem(c)) return true;
    return false;
}

/**
 * Tab web `/me/campaigns` — `campaign-card.component.html`: nút Join khi `campaign.total === 0`.
 * Khi API `with-contract` lẫn chiến dịch chưa có HĐ, loại các item có `total === 0` (số rõ ràng).
 */
export function filterJoinTabCampaignsHasContract(campaigns: Campaign[]): Campaign[] {
    return campaigns.filter((c) => {
        const r = c as unknown as Record<string, unknown>;
        const raw = r.total;
        if (raw === undefined || raw === null || raw === "") return true;
        const total = Number(raw);
        if (Number.isNaN(total)) return true;
        return total > 0;
    });
}

/** Badge kiểu CPL / CPO trên ảnh */
export function getCampaignTypeBadge(c: Campaign): string {
    const ct = c.commission_type?.trim();
    if (ct && ct.length <= 8) return ct.toUpperCase();
    const typeName = c.type_name?.trim() || "";
    if (typeName.length >= 3) return typeName.slice(0, 3).toUpperCase();
    const name = c.type?.name?.trim() || "";
    if (name.length >= 3) return name.slice(0, 3).toUpperCase();
    return "ADS";
}

/** Giá trị hiển thị sau chữ "Hoa hồng" — ưu tiên value (đ) trước, sau đó rate (%) */
export function getCampaignCommissionDisplay(c: Campaign): string {
    const rate = parseFloat(c.max_commission_rate) || 0;
    const value = parseFloat(c.max_commission_value) || 0;
    if (value > 0) return `${formatNumber(value)} đ`;
    if (rate > 0) return `${rate}%`;
    return "";
}

/**
 * Contract đủ điều kiện hiển thị nút "Tạo link" (đồng bộ web card):
 * - `status === 2`: hợp đồng kích hoạt (theo campaign-modal Angular: 1=pending, 2=activated).
 * - Nếu API có `advertiser_status`: phải là 2 (đã duyệt phía advertiser). Khi = 1 là chờ advertiser → web vẫn "Chờ phản hồi".
 * - Không dùng `publisher_status === 2` thay cho `status` — dễ gây nhầm (publisher duyệt nhưng contract chưa activated / chờ brand).
 */
export function isContractApprovedForLink(c: Contract): boolean {
    if (c.status !== 2) return false;
    const adv = Number(c.advertiser_status);
    if (Number.isNaN(adv) || adv === 0) return true;
    return adv === 2;
}

/**
 * Hợp đồng bị từ chối / không còn hiệu lực tạo link — khớp portal:
 * - `campaign-modal.component.ts`: `item.status === 3` → rejected (đếm contractStatus.rejected).
 * - Thêm: `advertiser_status === 3`, sync text, và một số mã status cũ (4 / 6).
 */
export function isContractRejected(c: Contract): boolean {
    const adv = Number(c.advertiser_status);
    if (adv === 3) return true;
    const st = Number(c.status);
    if (!Number.isNaN(st) && (st === 3 || st === 4 || st === 6)) return true;
    const sync = String(c.sync_contract_status || "").toLowerCase();
    if (sync.includes("reject") || sync.includes("tu cho") || sync.includes("từ chối")) return true;
    return false;
}

/** Ưu tiên contract đủ điều kiện tạo link, không thì lấy bản mới nhất để hiển thị trạng thái */
export function pickPrimaryContract(contracts: Contract[]): Contract | null {
    if (!contracts?.length) return null;
    const approved = contracts.find((c) => isContractApprovedForLink(c));
    if (approved) return approved;
    const sorted = [...contracts].sort(
        (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    return sorted[0];
}

/**
 * Trạng thái nút trên card (giống web):
 * - Chưa có hợp đồng → Tham gia
 * - Có hợp đồng đã duyệt / kích hoạt → Tạo link
 * - Có hợp đồng nhưng chưa đủ điều kiện → Chờ phản hồi
 * - Bị từ chối phía advertiser → Đã từ chối (không tạo link)
 */
export function resolveContractCtaMode(contracts: Contract[]): CampaignListCtaMode {
    if (!contracts?.length) return "join";
    if (contracts.some((c) => isContractApprovedForLink(c))) return "create-link";
    const primary = pickPrimaryContract(contracts);
    if (primary && isContractRejected(primary)) return "rejected";
    if (contracts.some((c) => isContractRejected(c))) return "rejected";
    return "pending";
}
