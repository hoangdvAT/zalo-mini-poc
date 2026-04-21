import { atom } from "jotai";
import { Campaign, DeepLinkResponse } from "@/types/campaign";

// ========== Campaign List ==========
/** Danh sách campaigns đã load */
export const campaignsAtom = atom<Campaign[]>([]);

/** Trạng thái loading danh sách */
export const loadingAtom = atom<boolean>(true);

/** Từ khóa tìm kiếm */
export const searchQueryAtom = atom<string>("");

/** Category ID đang chọn (0 = Tất cả) */
export const selectedCategoryIdAtom = atom<number>(0);

/** Danh sách categories */
export const categoriesAtom = atom<{ id: number; name: string }[]>([]);

/** Trang hiện tại (pagination) */
export const currentPageAtom = atom<number>(1);

/** Đã hết data chưa */
export const noMoreAtom = atom<boolean>(false);

/** Loading thêm (loadMore) */
export const loadingMoreAtom = atom<boolean>(false);

// ========== Campaign Detail ==========
/** Campaign đang xem chi tiết */
export const selectedCampaignAtom = atom<Campaign | null>(null);

/** Loading chi tiết */
export const loadingDetailAtom = atom<boolean>(false);

// ========== Report ==========
/** Tab report đang chọn: 'overview' | 'income' | 'top-job' */
export const reportTabAtom = atom<string>("overview");

/** Report stats */
export const reportOverviewAtom = atom<import("@/types/campaign").ReportOverview | null>(null);

/** Danh sách conversion */
export const conversionsAtom = atom<import("@/types/campaign").ConversionItem[]>([]);

/** Loading report */
export const loadingReportAtom = atom<boolean>(false);

// ========== Get Link ==========
/** Tracking link đã tạo */
export const trackingLinksAtom = atom<DeepLinkResponse[]>([]);

/** Ad space code của publisher hiện tại */
export const adSpaceCodeAtom = atom<string | null>(null);

/** Loading tạo link */
export const loadingLinkAtom = atom<boolean>(false);
