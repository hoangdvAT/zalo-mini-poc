/**
 * Types cho Campaign API (Scalef backend)
 * Match với response từ sun-workspace-api.demo.scalef.com
 */

export interface Campaign {
  id: number;
  code: string;
  name: string;
  description: string | null;
  url: string;
  domain: string;
  status: number; // 2 = active?
  max_commission_rate: string;
  max_commission_value: string;
  click_type: number;
  reoccur: number;
  started_at: string;
  ended_at: string | null;
  logo: string | null;
  has_deeplink: number;
  has_ref_code: number;
  device_type: number;
  tracking_template: string;
  approved_rate: string;
  commission_type: string | null;
  commission_value: string | null;
  label: string;
  auto_approve_conversion: number;
  lead_api: number;
  create_conversion: number;
  embed_script: number;
  categories: Category[];
  areas: Area[];
  type: CampaignType;
  commissions: any[]; // TODO: define proper type
  currencies: Currency[];
  epc30: number;
  cpa30: number;
  approved30: number;
  cvr30: number;
  click30: number;
  com30: number;
  files: any[];
  haravan_install: any;
  shopify_install: any;
  follower_id: number;
  /** List thường trả `type_name` thay vì object `type`. */
  type_name?: string;
  labels?: CampaignLabel[];
  average_payment?: number;
  /**
   * Tổng hợp hợp đồng publisher trên từng item list — đúng như `app-campaign-card` (mp-publisher-portal):
   * `total === 0` → Join; `active === 0 && pending > 0` → Chờ phản hồi;
   * `active > 0 && has_deeplink` → Tạo link.
   */
  total?: number;
  active?: number;
  pending?: number;
  /**
   * Một số bản API nhúng snapshot hợp đồng ngay trong list `without-contract`
   * (web chỉ gọi 1 API list — không gọi contracts/campaign từng id).
   */
  publisher_contract?: {
    status?: number;
    contract_status?: number;
    advertiser_status?: number;
    publisher_status?: number;
  } | null;
  /** Trường phẳng thay thế (nếu backend không nest object) */
  contract_status?: number;
  publisher_contract_status?: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
}

export interface CampaignType {
  id: number;
  name: string;
}

/** Nhãn trên item list (`labels` trong response without-contract). */
export interface CampaignLabel {
  code: string;
  name: string;
  pivot?: { campaign_id: number; label_id: number };
}

export interface Currency {
  id: number;
  name: string;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface CampaignDetailResponse {
  campaign: Campaign;
}

// Tracking Link — POST /api/v1/ad-space/create-deep-link
export interface DeepLinkRequest {
  campaign_id: number;
  /** Giống portal deep-link-form: bắt buộc khi backend yêu cầu */
  ad_space_code?: string;
  /** URL đích (sản phẩm / landing) — portal: redirect_url */
  redirect_url?: string;
}

/** Ad space gắn campaign — GET /campaigns/:id/ad-spaces (portal: DeepLinkService.getAdSpacesByCampaignId) */
export interface AdSpaceItem {
  id: number;
  code: string;
  contracts?: { campaign_id: number; code?: string }[];
}

export interface DeepLinkResponse {
  deeplink: string;
  short_link: string;
}

export interface DeepLinkListResponse {
  deepLink: { deep_link: string; shortlink: string | null; campaign_id: number }[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

// Contract
export interface Contract {
  id: number;
  code: string;
  campaign_id: number;
  ad_space_id: number;
  publisher_id: number;
  status: number;
  advertiser_status: number;
  publisher_status: number;
  created_at: string;
  updated_at: string;
  sync_contract_status: string;
}

export interface ContractListResponse {
  contract: Contract[];
  meta: {
    domain_deeplink: string;
  };
}

export interface ReportOverviewField {
  total: number;
  approved: number;
  pre_approved: number;
  pending: number;
  rejected: number;
}

export interface ReportOverview {
  sale_amount: ReportOverviewField;
  conversion: ReportOverviewField;
  pub_commission: ReportOverviewField;
  click: number;
  epc: number;
}

export interface ConversionItem {
  conversion_id: string;
  order_id: string;
  action_date_time: string;
  updated_time?: string;
  status: string;
  total_sale_amount?: { amount: number; currency: string };
  total_commission?: { amount: number; currency: string };
  cal_commission?: {
    /** Hoa hồng publisher (ưu tiên hiển thị — giống portal) */
    total_cal_commission_pub?: { amount: number; currency?: string } | number;
    total_cal_commission?: { amount: number; currency: string };
    campaign_code?: string;
    campaign_name?: string;
  };
  /** Một số bản API trả tổng SL ở cấp đơn */
  total_quantity?: number;
  quantity?: number;
  pub_commission?: { amount: number; currency?: string };
  click_detail?: { campaign_name?: string; click_time?: string; client_ip?: string };
  user_agent?: string;
  pub_utm_param?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    sub?: string;
    sub1?: string;
    sub2?: string;
    sub3?: string;
    sub4?: string;
    // sub5?: string;
  };
  reason?: { log_time: string; log_action: string }[];
  conversion_parts?: any[];
}

export interface IncomeSummary {
  temporary_approved: number;
  approved: number;
  paid: number;
  rejected: number;
}
