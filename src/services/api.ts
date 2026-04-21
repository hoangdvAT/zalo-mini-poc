import axios from "axios";
import {
    Campaign,
    CampaignListResponse,
    DeepLinkResponse,
    ContractListResponse,
    ConversionItem,
} from "@/types/campaign";
import type {
    AuthUser,
    ApiAuthResponse,
    ApiAuthWrapper,
    PublisherProfile,
} from "@/types/auth";
import { apiResponseToAuthUser } from "@/types/auth";

// Base URL — giống oneat-zalo-mini: Vite `.env` → `VITE_API_BASE_URL` (vd: https://apigw-publisher.dev.oneat.org)
const BASE_URL =
  (typeof import.meta !== "undefined" &&
    typeof import.meta.env?.VITE_API_BASE_URL === "string" &&
    import.meta.env.VITE_API_BASE_URL.trim()) ||
  "https://pub-be-stag.mp.directsale.vn";

// Create axios instance
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "x-mp-language": "vi",
        "Mp-Language": "vi",
        "x-port-type": "PUB",
    },
});

// Auth token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

export const getAuthToken = () => authToken;

// Interceptors for error handling — auto-fallback to guest token on 401
let isRefreshingGuestToken = false;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 || error.response?.status === 400) {
            console.warn("[API] Auth error", error.response?.status, "— token may be invalid");

            // Auto-refetch guest token if not already doing so
            if (!isRefreshingGuestToken) {
                isRefreshingGuestToken = true;
                try {
                    const { clearStoredAuth } = await import("@/utils/storage");
                    clearStoredAuth();
                    console.log("[API] Cleared stored auth, will refetch guest token on next init");
                } catch { }
                isRefreshingGuestToken = false;
            }
        }
        return Promise.reject(error);
    }
);

// ============ AUTH API ============

/**
 * Lấy guest token — user chưa đăng nhập vẫn có thể xem campaigns
 * POST /api/v1/auth/guest-token
 */
export async function fetchGuestToken(): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    raw: ApiAuthResponse;
}> {
    const response = await api.post<ApiAuthWrapper>("/api/v1/auth/guest-token");
    const data = response.data.data.response;
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: apiResponseToAuthUser(data),
        raw: data,
    };
}

/**
 * Login bằng tài khoản + mật khẩu
 * POST /api/v1/auth/login-account
 */
export async function loginWithAccount(
    username: string,
    password: string
): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    raw: ApiAuthResponse;
}> {
    const response = await api.post<ApiAuthWrapper>("/api/v1/auth/login-account", {
        username,
        password,
    });
    const data = response.data.data.response;
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: apiResponseToAuthUser(data),
        raw: data,
    };
}

/**
 * Gửi thông tin Zalo lên backend — client gửi profile data trực tiếp
 * Backend KHÔNG cần gọi graph.zalo.me nữa
 *
 * POST /api/v1/auth/zalo-mini-app
 */
export async function loginWithZaloBackend(params: {
    idToken: string;
    phoneToken?: string;
}): Promise<{ token: string; refreshToken: string; user: AuthUser; isNewUser: boolean }> {
    const response = await api.post("/api/v1/auth/social-signup", {
        id_token: params.idToken,
        provider: "zalo",
        phone_token: params.phoneToken || "",
    });
    const data = response.data?.data;

    // social-signup response: data.ssoToken.access_token
    if (data?.ssoToken) {
        const sso = data.ssoToken;
        return {
            token: sso.access_token,
            refreshToken: sso.refresh_token,
            user: apiResponseToAuthUser(sso),
            isNewUser: false,
        };
    }

    // Fallback: same shape as login-account
    if (data?.response) {
        const res = data.response;
        return {
            token: res.access_token,
            refreshToken: res.refresh_token,
            user: apiResponseToAuthUser(res),
            isNewUser: false,
        };
    }

    throw new Error("Unexpected response from social-signup API");
}

// ============ CAMPAIGN API ============

/**
 * Lấy danh sách campaigns (không có contract)
 * GET /api/v1/campaigns/without-contract
 */
export async function fetchCampaigns(params?: {
    page?: number;
    search?: string;
    category_ids?: number[];
    type_ids?: number[];
    area_ids?: number[];
    sort?: string;
    /** "1" = chỉ chiến dịch đã tham gia (theo flow web /me/campaigns) */
    invited?: string;
}): Promise<CampaignListResponse> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.search) queryParams.append("filters[name]", params.search);
        if (params?.category_ids?.length)
            queryParams.append("filters[category_ids]", params.category_ids.join(","));
        if (params?.type_ids?.length)
            queryParams.append("filters[type_ids]", params.type_ids.join(","));
        if (params?.area_ids?.length)
            queryParams.append("filters[area_ids]", params.area_ids.join(","));
        if (params?.sort) queryParams.append("sort", params.sort);

        // Add empty filter defaults (match the cURL example)
        if (!params?.search) queryParams.append("filters[name]", "");
        if (!queryParams.has("filters[in_status]"))
            queryParams.append("filters[in_status]", "");
        if (!queryParams.has("filters[invited]"))
            queryParams.append("filters[invited]", params?.invited !== undefined ? params.invited : "");
        if (!queryParams.has("filters[contract_status]"))
            queryParams.append("filters[contract_status]", "");
        if (!queryParams.has("filters[publisher_status]"))
            queryParams.append("filters[publisher_status]", "");

        const response = await api.get(
            `/api/v1/campaigns/without-contract?${queryParams.toString()}`
        );
        return (
            response.data?.data || {
                campaigns: [],
                meta: { total: 0, per_page: 20, current_page: 1, last_page: 1 },
            }
        );
    } catch (error) {
        console.error("[API] Error fetching campaigns:", error);
        return {
            campaigns: [],
            meta: { total: 0, per_page: 20, current_page: 1, last_page: 1 },
        };
    }
}

/**
 * Lấy chi tiết campaign theo ID
 * GET /api/v1/campaigns/{id}
 */
export async function fetchCampaignById(
    id: number | string
): Promise<Campaign | null> {
    try {
        const response = await api.get(`/api/v1/campaigns/${id}`);
        return response.data?.data?.campaign || null;
    } catch (error) {
        console.error(`[API] Error fetching campaign ${id}:`, error);
        return null;
    }
}

/**
 * Lấy danh sách contracts của một campaign
 * GET /api/v1/contracts/campaign/{campaign_id}?status=1,2,3,4,5,6
 */
export async function fetchContractsByCampaign(
    campaignId: number | string,
    statuses: number[] = [1, 2, 3, 4, 5, 6]
): Promise<ContractListResponse> {
    try {
        const response = await api.get(
            `/api/v1/contracts/campaign/${campaignId}?status=${statuses.join(",")}`
        );
        return (
            response.data?.data || { contract: [], meta: { domain_deeplink: "" } }
        );
    } catch (error) {
        console.error(
            `[API] Error fetching contracts for campaign ${campaignId}:`,
            error
        );
        return { contract: [], meta: { domain_deeplink: "" } };
    }
}

/**
 * Danh sách Chiến dịch (Filter)
 * GET /api/v1/campaigns/without-contract
 */
export async function fetchCampaignsWithoutContract(params: {
    page: number;
    sort?: string;
    filters?: {
        name?: string;
        type_ids?: string;
        category_ids?: string;
        status?: number;
    };
}): Promise<{ campaigns: import("@/types/campaign").Campaign[]; meta: any }> {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", params.page.toString());
        if (params.sort) queryParams.append("sort", params.sort);
        if (params.filters?.name) queryParams.append("filters[name]", params.filters.name);
        if (params.filters?.type_ids) queryParams.append("filters[type_ids]", params.filters.type_ids);
        if (params.filters?.category_ids) queryParams.append("filters[category_ids]", params.filters.category_ids);
        if (params.filters?.status !== undefined) queryParams.append("filters[status]", params.filters.status.toString());

        const response = await api.get(`/api/v1/campaigns/without-contract?${queryParams.toString()}`);
        return response.data?.data || { campaigns: [], meta: { total: 0, current_page: 1, per_page: 20 } };
    } catch (error) {
        console.error("[API] Error fetching campaigns without contract:", error);
        return { campaigns: [], meta: { total: 0, current_page: 1, per_page: 20 } };
    }
}

/** Giống `CONSTANTS.myCampaign` trên mp-publisher-portal — danh sách đã tham gia (có hợp đồng). */
export const MY_CAMPAIGN_LIST_FILTERS = {
    invited: "1",
    contract_status: "1,2,5",
    publisher_status: "2",
    in_status: "2,4,5",
} as const;

/**
 * Chiến dịch publisher đã tham gia (có hợp đồng) — Báo cáo / Deep link / Home "Đã tham gia"
 * GET /api/v1/campaigns/with-contract
 */
export async function fetchCampaignsWithContract(params: {
    page: number;
    name?: string;
    sort?: string;
    category_ids?: number[];
    /** true: chỉ camp trong scope /me/campaigns (myCampaign), không dùng cho filter báo cáo rộng */
    myCampaignScope?: boolean;
}): Promise<{ campaigns: Campaign[]; meta: Record<string, unknown> }> {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", String(params.page));
        queryParams.append("filters[is_customize]", "1");
        if (params.name) queryParams.append("filters[name]", params.name);
        if (params.sort) queryParams.append("sort", params.sort);
        if (params.category_ids?.length) {
            queryParams.append("filters[category_ids]", params.category_ids.join(","));
        }
        if (params.myCampaignScope) {
            queryParams.append("filters[invited]", MY_CAMPAIGN_LIST_FILTERS.invited);
            queryParams.append("filters[contract_status]", MY_CAMPAIGN_LIST_FILTERS.contract_status);
            queryParams.append("filters[publisher_status]", MY_CAMPAIGN_LIST_FILTERS.publisher_status);
            queryParams.append("filters[in_status]", MY_CAMPAIGN_LIST_FILTERS.in_status);
        }
        const response = await api.get(`/api/v1/campaigns/with-contract?${queryParams.toString()}`);
        return response.data?.data || { campaigns: [], meta: {} };
    } catch (error) {
        console.error("[API] fetchCampaignsWithContract:", error);
        return { campaigns: [], meta: {} };
    }
}

// ============ DEEP LINK / TRACKING LINK API ============

/**
 * Ad spaces của campaign (đã lọc contract activated) — giống portal
 * GET /api/v1/campaigns/{id}/ad-spaces?filters[contract_status]=2&filters[status]=2
 */
export async function fetchAdSpacesByCampaignId(
    campaignId: number | string
): Promise<{
    adSpaces: import("@/types/campaign").AdSpaceItem[];
    meta: { domain_deeplink?: string };
}> {
    try {
        const response = await api.get(`/api/v1/campaigns/${campaignId}/ad-spaces`, {
            params: {
                "filters[contract_status]": 2,
                "filters[status]": 2,
            },
        });
        const data = response.data?.data ?? response.data;
        const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
        const list =
            (Array.isArray(raw.adSpaces) && raw.adSpaces) ||
            (Array.isArray(raw.ad_spaces) && raw.ad_spaces) ||
            [];
        const meta =
            raw.meta && typeof raw.meta === "object"
                ? (raw.meta as { domain_deeplink?: string })
                : {};
        return {
            adSpaces: list as import("@/types/campaign").AdSpaceItem[],
            meta: { domain_deeplink: meta.domain_deeplink },
        };
    } catch (error) {
        console.error(`[API] fetchAdSpacesByCampaignId ${campaignId}:`, error);
        return { adSpaces: [], meta: {} };
    }
}

/**
 * Tạo tracking link (deep link)
 * POST /api/v1/ad-space/create-deep-link
 * Portal tương đương: POST /ad-spaces/deep-link — mini backend gom vào một endpoint.
 */
export async function createTrackingLink(
    campaignId: number,
    options?: {
        ad_space_code?: string;
        redirect_url?: string;
    }
): Promise<DeepLinkResponse> {
    if (!getAuthToken()) {
        throw new Error("Vui lòng đăng nhập để thực hiện");
    }
    const body: Record<string, unknown> = { campaign_id: campaignId };
    if (options?.ad_space_code) body.ad_space_code = options.ad_space_code;
    if (options?.redirect_url?.trim()) body.redirect_url = options.redirect_url.trim();
    const response = await api.post("/api/v1/ad-space/create-deep-link", body);
    return response.data?.data;
}

// ============ REPORT API ============

export async function fetchReportOverview(
    params: {
        from_date: string;
        to_date: string;
        field?: string;
        campaigns?: (number | string)[];
    }
): Promise<import("@/types/campaign").ReportOverview | null> {
    try {
        if (!getAuthToken()) return null;
        const response = await api.post("/api/v1/report/overview", params);
        const data = response.data?.data?.report?.current?.meta;
        if (!data) return null;

        return {
            sale_amount: data.sale_amount || { total: 0, approved: 0, pre_approved: 0, rejected: 0, pending: 0 },
            conversion: data.conversion || { total: 0, approved: 0, pre_approved: 0, rejected: 0, pending: 0 },
            pub_commission: data.pub_commission || { total: 0, approved: 0, pre_approved: 0, rejected: 0, pending: 0 },
            click: data.click || 0, // Fallback nếu có
            epc: data.epc || 0, // Fallback nếu có
        };
    } catch (error) {
        console.error("[API] Error fetching report overview:", error);
        return null;
    }
}

/** Meta danh sách đơn — cùng nguồn thống kê 4 ô trên web (report index) */
export interface PublisherConversionListMeta {
    total?: number;
    page?: number;
    page_size?: number;
    total_sale_amount?: number;
    total_pub_commission?: number;
    total_conversion_part_quantity?: number;
}

export async function fetchConversions(params: {
    from_time: string;
    to_time: string;
    page: number;
    page_size?: number;
    campaign_id?: number | string;
    /** Web portal: pending | pre_approved | approved | rejected */
    status?: number | string;
    order_id?: string;
    utm_param?: string;
    utm_value?: string;
    sub_param?: string;
    sub_value?: string;
}): Promise<{
    items: import("@/types/campaign").ConversionItem[];
    meta: PublisherConversionListMeta;
}> {
    try {
        if (!getAuthToken()) return { items: [], meta: {} };

        const queryParams = new URLSearchParams();
        queryParams.append("from_time", params.from_time);
        queryParams.append("to_time", params.to_time);
        queryParams.append("page", params.page.toString());
        if (params.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params.campaign_id) queryParams.append("campaign_id", params.campaign_id.toString());
        if (params.status !== undefined && params.status !== null && params.status !== "") {
            queryParams.append("status", String(params.status));
        }
        if (params.order_id) queryParams.append("filters[order_id]", params.order_id);
        if (params.utm_param && params.utm_value) queryParams.append(`filters[${params.utm_param}]`, params.utm_value);
        if (params.sub_param && params.sub_value) queryParams.append(`filters[${params.sub_param}]`, params.sub_value);

        const response = await api.get(`/api/v1/publisher/conversion?${queryParams.toString()}`);

        const data = response.data?.data;
        if (!data) return { items: [], meta: {} };

        const m = data.meta && typeof data.meta === "object" ? data.meta : {};
        const meta: PublisherConversionListMeta = {
            total: typeof m.total === "number" ? m.total : undefined,
            page: typeof m.page === "number" ? m.page : undefined,
            page_size: typeof m.page_size === "number" ? m.page_size : undefined,
            total_sale_amount:
                typeof m.total_sale_amount === "number"
                    ? m.total_sale_amount
                    : typeof (m as { total_sale_amount?: { amount?: number } }).total_sale_amount?.amount === "number"
                      ? (m as { total_sale_amount: { amount: number } }).total_sale_amount.amount
                      : undefined,
            total_pub_commission:
                typeof m.total_pub_commission === "number"
                    ? m.total_pub_commission
                    : typeof (m as { total_pub_commission?: { amount?: number } }).total_pub_commission?.amount === "number"
                      ? (m as { total_pub_commission: { amount: number } }).total_pub_commission.amount
                      : undefined,
            total_conversion_part_quantity:
                typeof m.total_conversion_part_quantity === "number" ? m.total_conversion_part_quantity : undefined,
        };

        return {
            items: data.conversions || [],
            meta,
        };
    } catch (error) {
        console.error("[API] Error fetching conversions:", error);
        return { items: [], meta: {} };
    }
}

// ============ PAYMENT / INVOICE API ============

export async function fetchPaymentInvoices(params: {
    page: number;
    invoice_code?: string;
    status?: number;
    date_start?: string;
    date_end?: string;
    /** Phạm vi ngày thanh toán (date_paid) — cùng pattern filters[][start|end] với kỳ đối soát */
    date_paid_start?: string;
    date_paid_end?: string;
}): Promise<import("@/types/payment").PaymentInvoicesResponse> {
    try {
        if (!getAuthToken()) return { invoices: [], meta: { total: 0, current_page: 1 } };
        
        const queryParams = new URLSearchParams();
        queryParams.append("page", params.page.toString());
        if (params.invoice_code) queryParams.append("filters[invoice_code]", params.invoice_code);
        if (params.status) queryParams.append("filters[status]", params.status.toString());
        if (params.date_start) queryParams.append("filters[date_to][start]", params.date_start);
        if (params.date_end) queryParams.append("filters[date_to][end]", params.date_end);
        if (params.date_paid_start) queryParams.append("filters[date_paid][start]", params.date_paid_start);
        if (params.date_paid_end) queryParams.append("filters[date_paid][end]", params.date_paid_end);

        const response = await api.get(`/api/v1/payment/invoices?${queryParams.toString()}`);
        
        const data = response.data?.data;
        if (!data) return { invoices: [], meta: { total: 0, current_page: 1 } };
        
        return {
            invoices: data.invoices || [],
            meta: data.meta || { total: 0, current_page: 1 },
        };
    } catch (error) {
        console.error("[API] Error fetching payment invoices:", error);
        return { invoices: [], meta: { total: 0, current_page: 1 } };
    }
}

export async function fetchPaymentConfig(): Promise<any> {
    try {
        if (!getAuthToken()) return null;
        const response = await api.get("/api/v1/get/config/invoice");
        return response.data?.data;
    } catch (error) {
        console.error("[API] Error fetching payment config:", error);
        return null;
    }
}

// ============ USER/PUBLISHER API ============

export interface UserProfileUpdatePayload {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    address?: string;
    date_of_birth?: string;
    country?: string;
    city?: string;
    primary_category?: number;
    company_name?: string;
    card_number?: string;
    image_before_card?: string;
    image_after_card?: string;
    id?: number;
    account_type?: string;
    gender?: number;
}

export async function updateUserProfile(data: UserProfileUpdatePayload): Promise<any> {
    try {
        if (!getAuthToken()) {
            throw new Error("Vui lòng đăng nhập để thực hiện");
        }
        const response = await api.put("/api/v1/users/me/account-settings", data);
        return response.data;
    } catch (error) {
        console.error("[API] Error updating user profile:", error);
        throw error;
    }
}

export async function uploadBase64Image(base64String: string): Promise<string> {
    try {
        if (!getAuthToken()) {
            throw new Error("Vui lòng đăng nhập để thực hiện");
        }
        
        // Remove data:image/*;base64, prefix if exists
        const base64Data = base64String.split(',')[1] || base64String;

        const response = await api.put("/api/v1/uploads-base64", {
            files: [
                {
                    data: base64Data,
                    filename: `image_${Date.now()}.png`,
                    mime_type: "image/png"
                }
            ]
        });
        
        // Assuming response structure contains URL
        return response.data?.data?.url || response.data?.data?.image || response.data?.data || "";
    } catch (error) {
        console.error("[API] Error uploading base64 image:", error);
        throw error;
    }
}

export async function fetchPublisherProfile(): Promise<PublisherProfile | null> {
    try {
        const response = await api.get("/api/v1/users/me");
        const raw = response.data?.data;
        const rec = asRecord(raw);
        if (!rec) return null;
        const code = String(rec.ad_space_code ?? rec.adSpaceCode ?? "");
        const userBlock =
            asRecord(rec.user) || asRecord(rec.publisher) || rec;
        const user = mapPublisherUser(userBlock);
        const campaigns_count = pickOptionalNum(
            rec,
            "campaigns_count",
            "campaign_count",
            "joined_campaigns",
            "total_campaigns"
        );
        const orders_count = pickOptionalNum(
            rec,
            "orders_count",
            "total_orders",
            "conversions_count"
        );
        return {
            ad_space_code: code,
            user,
            campaigns_count: campaigns_count ?? undefined,
            orders_count: orders_count ?? undefined,
            raw: raw,
        };
    } catch (error) {
        console.error("[API] Error fetching publisher profile:", error);
        return null;
    }
}

// ============ eKYC / E-CONTRACT API ============
export async function saveEkycContract(data: {
    full_name: string;
    id_number: string;
    id_issue_date: string;
    bank_name: string;
    account_number: string;
}): Promise<{ status: string; message: string }> {
    if (!getAuthToken()) {
        throw new Error("Vui lòng đăng nhập để thực hiện");
    }
    const response = await api.post("/api/v1/ekyc/create/contract", data);
    return response.data;
}

// ============ Response normalization (API gateway có thể trả snake_case / lồng object) ============

function asRecord(v: unknown): Record<string, unknown> | null {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        return v as Record<string, unknown>;
    }
    return null;
}

function pickOptionalNum(
    r: Record<string, unknown>,
    ...keys: string[]
): number | undefined {
    for (const k of keys) {
        const v = r[k];
        if (v === undefined || v === null || v === "") continue;
        const n = typeof v === "number" ? v : Number(v);
        if (!Number.isNaN(n)) return n;
    }
    return undefined;
}

function mapPublisherUser(u: Record<string, unknown>): AuthUser {
    const id =
        u.user_id ?? u.id ?? u.publisher_id ?? u.publisherId ?? "";
    return {
        id: String(id),
        name: String(u.user_name ?? u.name ?? u.full_name ?? ""),
        avatar: (u.avatar as string) || (u.avatar_url as string) || undefined,
        phone: (u.phone as string) || undefined,
        email: (u.email as string) || undefined,
        isNewUser: false,
    };
}

export default api;
