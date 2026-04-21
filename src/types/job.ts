/** Thông tin một Job/Campaign affiliate */
export interface Job {
    id: string;
    name: string;
    description?: string;
    default_img_url: string;
    images?: string[];
    category_name: string;
    category_id?: number;
    /** Commission hiển thị, vd: "10%" hoặc "50,000đ" */
    commission: string;
    commission_type: string;
    /** Color code cho card background */
    color_code?: string;
    /** Rating (0-5) */
    rating?: number;
    review_count?: number;
    /** Số người tham gia */
    user_count?: number;
    /** Trạng thái đăng ký: 'NOT_REGISTERED' | 'REGISTERED' | 'APPROVED' */
    register_status?: string;
    /** Partner code, vd: 'PARTNER_1_POINT_5', 'PARTNER_D2C' */
    partner_code?: string;
    partner_ref_campaign_id?: string;
    /** Thời gian hiệu lực */
    start_date?: string;
    end_date?: string;
    /** Link mặc định */
    adv_default_link?: string[];
    adv_default_link_type?: number;
    /** Referral code */
    referral_code?: string;
    /** Bonus info */
    bonus?: string;
    /** Tips */
    tips?: string[];
    /** Các block nội dung chi tiết */
    detail_blocks?: JobDetailBlock[];
    /** Comment nổi bật */
    top_comment?: JobComment;
    /** Thông tin thu nhập - là commission hay monthly */
    is_commission?: boolean;
}

export interface JobDetailBlock {
    title: string;
    content: string;
    index: number;
}

export interface JobComment {
    name: string;
    avatar?: string;
    comment: string;
}

export interface JobCategory {
    id: number;
    name: string;
    icon_name?: string;
}

export interface JobListResponse {
    data: Job[];
    total: number;
    page: number;
    page_size: number;
    is_no_more: boolean;
}

/** Report / Thống kê */
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
      total_cal_commission: { amount: number; currency: string };
      campaign_code?: string;
      campaign_name?: string;
    };
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
      sub5?: string;
    };
    reason?: { log_time: string; log_action: string }[];
    conversion_parts?: any[];
}

export interface TrackingLink {
    id: string;
    url: string;
    short_url?: string;
    created_at: string;
    campaign_name?: string;
}

export interface IncomeSummary {
    temporary_approved: number;
    approved: number;
    paid: number;
    rejected: number;
}
