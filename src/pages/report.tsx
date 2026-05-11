import React, { useEffect, useCallback, useState } from "react";
import { Page, Text, Box, Button, useNavigate, Icon, Sheet, Input, DatePicker } from "zmp-ui";
import { useAtom } from "jotai";
import { useAuth } from "@/hooks/useAuth";

import { conversionsAtom, loadingReportAtom } from "@/state/job";
import {
    fetchConversions,
    fetchCampaignsWithContract,
    fetchReportOverview,
    fetchConversionDetail,
    fetchCampaignById,
    type PublisherConversionListMeta,
} from "@/services/api";
import { DataCard } from "@/components/display";
import { BodyPortal, BODY_OVERLAY_Z_INDEX, CUSTOM_DATE_RANGE_BODY_CLASS } from "@/components/base";
import { formatNumber, formatDateTime } from "@/utils/format";
import {
    getCommissionPercentLabel,
    getConversionQuantitySum,
    getConversionReasonText,
    getPartLineAmount,
    getPublisherCommissionAmount,
    getSaleAmount,
} from "@/utils/conversionDisplay";

const REPORT_UTM_PARAMS = [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_term",
    "utm_content",
] as const;
const REPORT_SUB_PARAMS = [
    "sub", "sub1", "sub2", "sub3", "sub4",
    // "sub5"
] as const;

/** Mặc định giống web: 7 ngày gần nhất (portal: Last 7 Days). */
function getDefaultDateRange7d(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

const ReportPage: React.FC = () => {
    const [conversions, setConversions] = useAtom(conversionsAtom);
    const [loading, setLoading] = useAtom(loadingReportAtom);
    const [convMeta, setConvMeta] = useState<PublisherConversionListMeta>({});
    const [convPage, setConvPage] = useState(1);
    const pageSize = 20;
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Bottom Sheet states
    const [timeSheetVisible, setTimeSheetVisible] = useState(false);
    const [campaignSheetVisible, setCampaignSheetVisible] = useState(false);
    const [statusSheetVisible, setStatusSheetVisible] = useState(false);
    const [utmSheetVisible, setUtmSheetVisible] = useState(false);
    const [subSheetVisible, setSubSheetVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    /** Tránh mount DatePicker ngay khi mở overlay (chạm đóng sheet có thể mở nhầm picker + mask chồng lớp). */
    const [customDatePickersReady, setCustomDatePickersReady] = useState(false);

    // Filter values
    const [filterOrderId, setFilterOrderId] = useState("");
    const [filterCampaign, setFilterCampaign] = useState<string | number>("");
    const [filterCampaignName, setFilterCampaignName] = useState("");
    const [filterUtmParam, setFilterUtmParam] = useState("");
    const [filterUtmValue, setFilterUtmValue] = useState("");
    const [filterSubParam, setFilterSubParam] = useState("");
    const [filterSubValue, setFilterSubValue] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterTimeLabel, setFilterTimeLabel] = useState("7 ngày qua");
    
    // Temporary states for apply buttons
    const [filterUtmParamSelected, setUtmParamSelected] = useState("");
    const [filterUtmValueInput, setFilterUtmValueInput] = useState("");
    const [filterSubParamSelected, setSubParamSelected] = useState("");
    const [filterSubValueInput, setFilterSubValueInput] = useState("");
    
    // Custom date states
    const [startDate, setStartDate] = useState<Date>(() => getDefaultDateRange7d().start);
    const [endDate, setEndDate] = useState<Date>(() => getDefaultDateRange7d().end);
    const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
    const [tempEndDate, setTempEndDate] = useState<Date>(new Date());

    // Selected conversion for detail modal
    const [selectedConversion, setSelectedConversion] = useState<any>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [expandedUtm, setExpandedUtm] = useState(false);
    const [expandedSub, setExpandedSub] = useState(false);

    const handleConversionClick = async (conv: any) => {
        setSelectedConversion(conv); // show list data temporarily
        setIsDetailLoading(true);
        setExpandedUtm(false);
        setExpandedSub(false);
        try {
            const detailRes = await fetchConversionDetail(conv.conversion_id || conv.id);
            let merged = { ...conv };
            if (detailRes) {
                // If detailRes is wrapped in { conversion: ... } or is the object itself
                const detailData = detailRes.conversion ? detailRes.conversion : detailRes;
                merged = { ...merged, ...detailData };
            }

            // Fetch campaign to get campaign_name if not available
            if (merged.campaign_id && (!merged.click_detail?.campaign_name && !merged.cal_commission?.campaign_name && !merged.campaign_name)) {
                const campaignRes = await fetchCampaignById(merged.campaign_id);
                if (campaignRes && campaignRes.name) {
                    merged.campaign_name = campaignRes.name;
                }
            }

            setSelectedConversion(merged);
        } catch (e) {
            console.error("Lỗi tải chi tiết đơn hàng", e);
        } finally {
            setIsDetailLoading(false);
        }
    };

    // Campaign Search & List
    const [campaignList, setCampaignList] = useState<any[]>([]);
    const [campaignSearchText, setCampaignSearchText] = useState("");
    const [isCampaignLoading, setIsCampaignLoading] = useState(false);

    const loadCampaigns = useCallback(async (searchText: string = "") => {
        setIsCampaignLoading(true);
        try {
            const data = await fetchCampaignsWithContract({
                page: 1,
                name: searchText || undefined,
            });
            setCampaignList(data.campaigns || []);
        } catch (error) {
            console.error("Lỗi tải danh sách chiến dịch:", error);
        } finally {
            setIsCampaignLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!campaignSheetVisible) return;
        const timer = setTimeout(() => {
            loadCampaigns(campaignSearchText);
        }, 500); // Debounce 500ms
        return () => clearTimeout(timer);
    }, [campaignSheetVisible, campaignSearchText, loadCampaigns]);

    /** Mở sheet UTM/Sub: đồng bộ bản nháp với filter đang áp dụng (Select zmp-ui xử lý value rỗng kém). */
    useEffect(() => {
        if (!utmSheetVisible) return;
        setUtmParamSelected(filterUtmParam);
        setFilterUtmValueInput(filterUtmValue);
    }, [utmSheetVisible, filterUtmParam, filterUtmValue]);

    useEffect(() => {
        if (!subSheetVisible) return;
        setSubParamSelected(filterSubParam);
        setFilterSubValueInput(filterSubValue);
    }, [subSheetVisible, filterSubParam, filterSubValue]);

    useEffect(() => {
        if (!datePickerVisible) {
            setCustomDatePickersReady(false);
            return;
        }
        setCustomDatePickersReady(false);
        const id = window.setTimeout(() => setCustomDatePickersReady(true), 450);
        return () => window.clearTimeout(id);
    }, [datePickerVisible]);

    /** Sheet DatePicker zmp-ui (~1001) phải nổi trên overlay tùy chỉnh (10000), không thì không đóng được picker. */
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (datePickerVisible) {
            document.body.classList.add(CUSTOM_DATE_RANGE_BODY_CLASS);
        } else {
            document.body.classList.remove(CUSTOM_DATE_RANGE_BODY_CLASS);
        }
        return () => document.body.classList.remove(CUSTOM_DATE_RANGE_BODY_CLASS);
    }, [datePickerVisible]);

    /** Khớp portal statusVi: pending | pre_approved | approved | rejected */
    const statusMap: Record<string, string> = {
        pending: "Đang chờ xử lý",
        pre_approved: "Tạm duyệt",
        approved: "Đã duyệt",
        rejected: "Từ chối",
    };

    const loadData = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const formatD = (d: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            };
            const from_date = formatD(startDate);
            const to_date = formatD(endDate);

            /** Backend giống portal ReportService: status là mã chuỗi */
            const apiStatus = filterStatus ? filterStatus : undefined;

            const convData = await fetchConversions({
                from_time: `${from_date} 00:00:00`,
                to_time: `${to_date} 23:59:59`,
                page: convPage,
                page_size: pageSize,
                campaign_id: filterCampaign ? filterCampaign : undefined,
                status: apiStatus,
                order_id: filterOrderId ? filterOrderId : undefined,
                utm_param: filterUtmParam ? filterUtmParam : undefined,
                utm_value: filterUtmValue ? filterUtmValue : undefined,
                sub_param: filterSubParam ? filterSubParam : undefined,
                sub_value: filterSubValue ? filterSubValue : undefined,
            });
            setConvMeta(convData.meta || {});
            setConversions(convData.items);
        } catch (err) {
            console.error("Lỗi tải báo cáo:", err);
        } finally {
            setLoading(false);
        }
    }, [
        isAuthenticated,
        setConversions,
        setLoading,
        startDate,
        endDate,
        filterCampaign,
        filterStatus,
        filterOrderId,
        filterUtmParam,
        filterUtmValue,
        filterSubParam,
        filterSubValue,
        convPage,
    ]);

    useEffect(() => {
        // Handled by AuthGuard
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated, loadData]);

    if (!isAuthenticated) return null;

    return (
        <Page className="report-page" hideScrollbar>
            {/* Header */}
            <div className="report-header">
                <Text.Title size="large" className="report-header__title">
                    Báo cáo
                </Text.Title>
            </div>

            {/* Filters (Mock UI) */}
            <div className="report-filters">
                <div className={`report-filter-btn ${filterTimeLabel ? 'active' : ''}`} onClick={() => setTimeSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterTimeLabel || "Thời gian"}</span>
                    {filterTimeLabel ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterTimeLabel(""); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterCampaign ? 'active' : ''}`} onClick={() => setCampaignSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterCampaignName || "Chương trình"}</span>
                    {filterCampaign ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterCampaign(""); setFilterCampaignName(""); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterStatus ? 'active' : ''}`} onClick={() => setStatusSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterStatus ? statusMap[filterStatus] : "Trạng thái"}</span>
                    {filterStatus ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterUtmValue ? 'active' : ''}`} onClick={() => setUtmSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterUtmValue ? `${filterUtmParam}: ${filterUtmValue}` : "UTM"}</span>
                    {filterUtmValue ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterUtmValue(""); setFilterUtmParam(""); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterSubValue ? 'active' : ''}`} onClick={() => setSubSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterSubValue ? `${filterSubParam}: ${filterSubValue}` : "Sub"}</span>
                    {filterSubValue ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterSubValue(""); setFilterSubParam(""); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
            </div>

            <div className="report-content">
                {loading ? (
                    <div className="report-skeleton" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="report-skeleton__card shimmer" style={{ height: '140px', width: '100%' }} />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Data Sections */}
                        {/* 4 ô thống kê cùng nguồn meta danh sách đơn — giống v2/report index (web) */}
                        <div className="report-overview-section">
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-inbox" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Tổng đơn hàng</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__value" style={{ fontSize: 22 }}>
                                        {formatNumber(convMeta.total ?? 0)}
                                    </span>
                                </div>
                            </div>
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-star" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Tổng giá trị đơn</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__value" style={{ fontSize: 22 }}>
                                        {formatNumber(convMeta.total_sale_amount ?? 0)}
                                    </span>
                                </div>
                            </div>
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-auto-solid" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Tổng số lượng</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__value" style={{ fontSize: 22 }}>
                                        {formatNumber(convMeta.total_conversion_part_quantity ?? 0)}
                                    </span>
                                </div>
                            </div>
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-more-grid" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Tổng hoa hồng</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__value" style={{ fontSize: 22 }}>
                                        {formatNumber(convMeta.total_pub_commission ?? 0)} đ
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Danh sách đơn — card (mobile): tránh bảng ngang quá rộng chồng cột; UTM xem trong chi tiết */}
                        <div className="report-list-section">
                            <Text size="large" bold style={{ padding: "16px 16px 8px 16px" }}>
                                Danh sách đơn hàng
                            </Text>
                            {conversions.length === 0 ? (
                                <div className="empty-state" style={{ padding: 16 }}>
                                    <Text size="small">Chưa có đơn hàng nào</Text>
                                </div>
                            ) : (
                                <div className="report-order-list">
                                    {conversions.map((conv, i) => {
                                        let statusText = conv.status;
                                        let statusClass = "pending";
                                        if (conv.status === "pre_approved") {
                                            statusText = "Tạm duyệt";
                                            statusClass = "pre_approved";
                                        } else if (conv.status === "approved") {
                                            statusText = "Đã duyệt";
                                            statusClass = "approved";
                                        } else if (conv.status === "pending") {
                                            statusText = "Đang chờ xử lý";
                                            statusClass = "pending";
                                        } else if (conv.status === "rejected") {
                                            statusText = "Từ chối";
                                            statusClass = "rejected";
                                        }

                                        const saleAmount = getSaleAmount(conv);
                                        const commAmount = getPublisherCommissionAmount(conv);
                                        const commPct = getCommissionPercentLabel(conv, commAmount);
                                        const qtySum = getConversionQuantitySum(conv);
                                        const reasonText = getConversionReasonText(conv);
                                        const campaignLabel =
                                            (conv as { click_detail?: { campaign_name?: string } }).click_detail?.campaign_name ||
                                            conv.cal_commission?.campaign_name ||
                                            conv.cal_commission?.campaign_code ||
                                            "—";

                                        return (
                                            <div
                                                key={conv.conversion_id || i}
                                                className="report-order-card"
                                                onClick={() => handleConversionClick(conv)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        handleConversionClick(conv);
                                                    }
                                                }}
                                            >
                                                <div className="report-order-card__head">
                                                    <span className="report-order-card__order">{conv.order_id || "—"}</span>
                                                    <span className={`report-order-card__status report-order-card__status--${statusClass}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div className="report-order-card__campaign">{campaignLabel}</div>
                                                <div className="report-order-card__metrics">
                                                    <div className="report-order-card__metric">
                                                        <span className="report-order-card__metric-label">Số lượng</span>
                                                        <span className="report-order-card__metric-value">{qtySum}</span>
                                                    </div>
                                                    <div className="report-order-card__metric">
                                                        <span className="report-order-card__metric-label">Giá trị</span>
                                                        <span className="report-order-card__metric-value">{formatNumber(saleAmount)} đ</span>
                                                    </div>
                                                    <div className="report-order-card__metric">
                                                        <span className="report-order-card__metric-label">Hoa hồng</span>
                                                        <span className={`report-order-card__metric-value report-order-card__metric-value--commission ${statusClass}`}>
                                                            {statusClass !== 'rejected' && commAmount > 0 ? '+' : ''}{formatNumber(commAmount)} đ
                                                            {commPct ? <small className="report-order-card__pct">{commPct}</small> : null}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="report-order-card__dates">
                                                    <span>
                                                        GD:{" "}
                                                        {conv.action_date_time
                                                            ? formatDateTime(conv.action_date_time)
                                                            : "—"}
                                                    </span>
                                                    {conv.updated_time ? (
                                                        <span className="report-order-card__date-sub">
                                                            Cập nhật: {formatDateTime(conv.updated_time)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="report-order-card__reason" title={reasonText}>
                                                    <span className="report-order-card__reason-label">Lý do:</span> {reasonText}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {conversions.length > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px 16px 24px",
                                        gap: 12,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        disabled={convPage <= 1 || loading}
                                        onClick={() => setConvPage((p) => Math.max(1, p - 1))}
                                    >
                                        Trang trước
                                    </Button>
                                    <Text size="small" style={{ color: "#667085" }}>
                                        Trang {convMeta.page ?? convPage}
                                        {convMeta.total != null
                                            ? ` · ${convMeta.total} đơn`
                                            : ""}
                                    </Text>
                                    <Button
                                        size="small"
                                        disabled={
                                            loading ||
                                            !convMeta.total ||
                                            convPage * pageSize >= convMeta.total
                                        }
                                        onClick={() => setConvPage((p) => p + 1)}
                                    >
                                        Trang sau
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Individual Filter Bottom Sheets */}
            
            {/* Time Sheet — portal: tránh bottom nav đè lên (stacking context route) */}
            <BodyPortal>
            <Sheet visible={timeSheetVisible} onClose={() => setTimeSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Chọn thời gian</Text.Title>
                    <div onClick={() => setTimeSheetVisible(false)}><Icon icon="zi-close" /></div>
                </div>
                <Box className="filter-sheet-content">
                    <div className="filter-option" onClick={() => {
                        const today = new Date();
                        setStartDate(today);
                        setEndDate(today);
                        setFilterTimeLabel("Hôm nay");
                        setConvPage(1);
                        setTimeSheetVisible(false);
                    }}>Hôm nay</div>
                    <div className="filter-option" onClick={() => {
                        const today = new Date();
                        const past7 = new Date();
                        past7.setDate(today.getDate() - 6);
                        setStartDate(past7);
                        setEndDate(today);
                        setFilterTimeLabel("7 ngày qua");
                        setConvPage(1);
                        setTimeSheetVisible(false);
                    }}>7 ngày qua</div>
                    <div className="filter-option" onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        setStartDate(firstDay);
                        setEndDate(lastDay);
                        setFilterTimeLabel("Tháng này");
                        setConvPage(1);
                        setTimeSheetVisible(false);
                    }}>Tháng này</div>
                    <div className="filter-option" onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                        setStartDate(firstDay);
                        setEndDate(lastDay);
                        setFilterTimeLabel("Tháng trước");
                        setConvPage(1);
                        setTimeSheetVisible(false);
                    }}>Tháng trước</div>
                    <div className="filter-option" onClick={() => {
                        setTempStartDate(startDate);
                        setTempEndDate(endDate);
                        setTimeSheetVisible(false);
                        // Delay mở sheet để tránh conflict animation đóng sheet cũ
                        setTimeout(() => setDatePickerVisible(true), 300);
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon="zi-calendar" size={16} /> Tùy chỉnh (Chọn ngày)
                        </div>
                    </div>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Campaign Sheet */}
            <BodyPortal>
            <Sheet visible={campaignSheetVisible} onClose={() => setCampaignSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Chọn chương trình</Text.Title>
                    <div onClick={() => setCampaignSheetVisible(false)}><Icon icon="zi-close" /></div>
                </div>
                <Box className="filter-sheet-content" p={4} pb={6}>
                    <Input
                        placeholder="Nhập để tìm kiếm..."
                        value={campaignSearchText}
                        onChange={(e) => setCampaignSearchText(e.target.value)}
                        clearable
                    />
                    <div style={{ marginTop: 16, maxHeight: '50vh', overflowY: 'auto' }}>
                        {isCampaignLoading ? (
                            <div style={{ padding: '16px 0', textAlign: 'center', color: '#666' }}>Đang tải...</div>
                        ) : campaignList.length === 0 ? (
                            <div style={{ padding: '16px 0', textAlign: 'center', color: '#666' }}>Không tìm thấy chiến dịch</div>
                        ) : (
                            campaignList.map(camp => (
                                <div 
                                    key={camp.id} 
                                    className="filter-option" 
                                    onClick={() => { 
                                        setFilterCampaign(camp.id); 
                                        setFilterCampaignName(camp.name);
                                        setConvPage(1);
                                        setCampaignSheetVisible(false); 
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {camp.logo ? (
                                            <img src={camp.logo} alt={camp.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon icon="zi-star" size={16} style={{ color: '#aaa' }} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <Text size="normal" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{camp.name}</Text>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Status Sheet */}
            <BodyPortal>
            <Sheet visible={statusSheetVisible} onClose={() => setStatusSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Chọn trạng thái</Text.Title>
                    <div onClick={() => setStatusSheetVisible(false)}><Icon icon="zi-close" /></div>
                </div>
                <Box className="filter-sheet-content">
                    <div className="filter-option" onClick={() => { setFilterStatus(""); setConvPage(1); setStatusSheetVisible(false); }}>Tất cả</div>
                    <div className="filter-option" onClick={() => { setFilterStatus("pending"); setConvPage(1); setStatusSheetVisible(false); }}>Đang chờ xử lý</div>
                    <div className="filter-option" onClick={() => { setFilterStatus("pre_approved"); setConvPage(1); setStatusSheetVisible(false); }}>Tạm duyệt</div>
                    <div className="filter-option" onClick={() => { setFilterStatus("approved"); setConvPage(1); setStatusSheetVisible(false); }}>Đã duyệt</div>
                    <div className="filter-option" onClick={() => { setFilterStatus("rejected"); setConvPage(1); setStatusSheetVisible(false); }}>Từ chối</div>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* UTM Sheet */}
            <BodyPortal>
            <Sheet visible={utmSheetVisible} onClose={() => setUtmSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Lọc theo UTM</Text.Title>
                    <div onClick={() => setUtmSheetVisible(false)}><Icon icon="zi-close" /></div>
                </div>
                <Box className="filter-sheet-content" p={4} pb={6}>
                    <div
                        className={`filter-option filter-option--pick ${!filterUtmParamSelected ? "filter-option--active" : ""}`}
                        onClick={() => {
                            setUtmParamSelected("");
                            setFilterUtmValueInput("");
                        }}
                    >
                        <span>Bỏ chọn</span>
                        {!filterUtmParamSelected ? (
                            <Icon icon="zi-check" size={18} style={{ color: "var(--zaui-light-color-primary, #006af5)" }} />
                        ) : null}
                    </div>
                    {REPORT_UTM_PARAMS.map((key) => (
                        <div
                            key={key}
                            className={`filter-option filter-option--pick ${filterUtmParamSelected === key ? "filter-option--active" : ""}`}
                            onClick={() => setUtmParamSelected(key)}
                        >
                            <span>{key}</span>
                            {filterUtmParamSelected === key ? (
                                <Icon icon="zi-check" size={18} style={{ color: "var(--zaui-light-color-primary, #006af5)" }} />
                            ) : null}
                        </div>
                    ))}
                    {filterUtmParamSelected ? (
                        <Box mt={4}>
                            <Input
                                placeholder={`Nhập giá trị ${filterUtmParamSelected}...`}
                                value={filterUtmValueInput}
                                onChange={(e) => setFilterUtmValueInput(e.target.value)}
                                clearable
                                autoFocus
                            />
                        </Box>
                    ) : null}
                    <Button
                        fullWidth
                        style={{ marginTop: 24 }}
                        onClick={() => {
                            setFilterUtmParam(filterUtmParamSelected);
                            setFilterUtmValue(filterUtmParamSelected ? filterUtmValueInput : "");
                            setConvPage(1);
                            setUtmSheetVisible(false);
                        }}
                    >
                        Áp dụng
                    </Button>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Sub Sheet */}
            <BodyPortal>
            <Sheet visible={subSheetVisible} onClose={() => setSubSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Lọc theo Sub</Text.Title>
                    <div onClick={() => setSubSheetVisible(false)}><Icon icon="zi-close" /></div>
                </div>
                <Box className="filter-sheet-content" p={4} pb={6}>
                    <div
                        className={`filter-option filter-option--pick ${!filterSubParamSelected ? "filter-option--active" : ""}`}
                        onClick={() => {
                            setSubParamSelected("");
                            setFilterSubValueInput("");
                        }}
                    >
                        <span>Bỏ chọn</span>
                        {!filterSubParamSelected ? (
                            <Icon icon="zi-check" size={18} style={{ color: "var(--zaui-light-color-primary, #006af5)" }} />
                        ) : null}
                    </div>
                    {REPORT_SUB_PARAMS.map((key) => (
                        <div
                            key={key}
                            className={`filter-option filter-option--pick ${filterSubParamSelected === key ? "filter-option--active" : ""}`}
                            onClick={() => setSubParamSelected(key)}
                        >
                            <span>{key}</span>
                            {filterSubParamSelected === key ? (
                                <Icon icon="zi-check" size={18} style={{ color: "var(--zaui-light-color-primary, #006af5)" }} />
                            ) : null}
                        </div>
                    ))}
                    {filterSubParamSelected ? (
                        <Box mt={4}>
                            <Input
                                placeholder={`Nhập giá trị ${filterSubParamSelected}...`}
                                value={filterSubValueInput}
                                onChange={(e) => setFilterSubValueInput(e.target.value)}
                                clearable
                                autoFocus
                            />
                        </Box>
                    ) : null}
                    <Button
                        fullWidth
                        style={{ marginTop: 24 }}
                        onClick={() => {
                            setFilterSubParam(filterSubParamSelected);
                            setFilterSubValue(filterSubParamSelected ? filterSubValueInput : "");
                            setConvPage(1);
                            setSubSheetVisible(false);
                        }}
                    >
                        Áp dụng
                    </Button>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Custom Date Range Overlay */}
            {datePickerVisible && (
                <BodyPortal>
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: BODY_OVERLAY_Z_INDEX,
                    display: 'flex',
                    alignItems: 'flex-end'
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        width: '100%',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        paddingBottom: '24px'
                    }}>
                        <div className="filter-sheet-header" style={{ padding: '16px 16px 0 16px', borderBottom: 'none' }}>
                            <Text.Title className="filter-sheet-header__title">Tùy chỉnh thời gian</Text.Title>
                            <div onClick={() => setDatePickerVisible(false)}><Icon icon="zi-close" /></div>
                        </div>
                        <Box className="filter-sheet-content" p={4} pb={0}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Box style={{ flex: 1 }}>
                                    <Text size="small" bold style={{ marginBottom: '8px', color: '#666' }}>Từ ngày</Text>
                                    {customDatePickersReady ? (
                                        <DatePicker
                                            dateFormat="dd/mm/yyyy"
                                            title="Từ ngày"
                                            action={{ text: "Xong", close: true }}
                                            value={tempStartDate}
                                            onChange={(val: any) => setTempStartDate(val as Date)}
                                        />
                                    ) : (
                                        <div
                                            className="report-custom-date-placeholder"
                                            style={{
                                                minHeight: 44,
                                                borderRadius: 8,
                                                border: "1px solid #eee",
                                                background: "#fafafa",
                                            }}
                                        />
                                    )}
                                </Box>
                                <Box style={{ flex: 1 }}>
                                    <Text size="small" bold style={{ marginBottom: '8px', color: '#666' }}>Đến ngày</Text>
                                    {customDatePickersReady ? (
                                        <DatePicker
                                            dateFormat="dd/mm/yyyy"
                                            title="Đến ngày"
                                            action={{ text: "Xong", close: true }}
                                            value={tempEndDate}
                                            onChange={(val: any) => setTempEndDate(val as Date)}
                                        />
                                    ) : (
                                        <div
                                            className="report-custom-date-placeholder"
                                            style={{
                                                minHeight: 44,
                                                borderRadius: 8,
                                                border: "1px solid #eee",
                                                background: "#fafafa",
                                            }}
                                        />
                                    )}
                                </Box>
                            </div>
                            <Button fullWidth style={{ marginTop: 24 }} onClick={() => {
                                setStartDate(tempStartDate);
                                setEndDate(tempEndDate);
                                setFilterTimeLabel(`${tempStartDate.toLocaleDateString('vi-VN')} - ${tempEndDate.toLocaleDateString('vi-VN')}`);
                                setConvPage(1);
                                setDatePickerVisible(false);
                            }}>
                                Áp dụng
                            </Button>
                        </Box>
                    </div>
                </div>
                </BodyPortal>
            )}

            {/* Conversion Detail Sheet */}
            <BodyPortal>
            <Sheet
                visible={!!selectedConversion}
                onClose={() => { setSelectedConversion(null); setExpandedUtm(false); setExpandedSub(false); }}
                autoHeight
                zIndex={BODY_OVERLAY_Z_INDEX}
            >
                <div className="conv-detail-sheet-header">
                    <Text.Title style={{ fontSize: 18, marginBottom: 4 }}>Chi tiết đơn hàng</Text.Title>
                    <Text size="small" style={{ color: '#667085' }}>{selectedConversion?.order_id || '—'}</Text>
                </div>
                <Box className="conv-detail-sheet-body" p={4} pb={6} style={{ maxHeight: '80vh', overflowY: 'auto', overflowX: 'hidden', background: '#f4f5f6' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
                            <Text size="small" style={{ color: '#667085', marginBottom: 4 }}>Hoa hồng (publisher)</Text>
                            <Text size="large" bold style={{ color: '#039855' }}>+{formatNumber(getPublisherCommissionAmount(selectedConversion || {}))} đ</Text>
                            {(() => {
                                const c = selectedConversion || {};
                                const pct = getCommissionPercentLabel(c, getPublisherCommissionAmount(c));
                                return pct ? (
                                    <Text size="xSmall" style={{ color: '#667085', marginTop: 4 }}>{pct}</Text>
                                ) : null;
                            })()}
                        </div>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
                            <Text size="small" style={{ color: '#667085', marginBottom: 4 }}>Giá trị đơn hàng</Text>
                            <Text size="large" bold style={{ color: '#111827' }}>{formatNumber(getSaleAmount(selectedConversion || {}))} đ</Text>
                        </div>
                    </div>

                    <div className="conv-detail-section">
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Trạng thái</span>
                            <span className="conv-detail-row__value" style={{
                                color: selectedConversion?.status === 'approved' ? '#039855' :
                                       selectedConversion?.status === 'pre_approved' ? '#b05c0d' :
                                       selectedConversion?.status === 'rejected' ? '#d92d20' : '#006ce6'
                            }}>{statusMap[String(selectedConversion?.status)] || selectedConversion?.status || "—"}</span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Lý do</span>
                            <span className="conv-detail-row__value" style={{ fontWeight: 400 }}>{getConversionReasonText(selectedConversion || {})}</span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Tổng số lượng</span>
                            <span className="conv-detail-row__value">{getConversionQuantitySum(selectedConversion || {})}</span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Tên chiến dịch</span>
                            <span className="conv-detail-row__value">{selectedConversion?.campaign_name || selectedConversion?.click_detail?.campaign_name || selectedConversion?.cal_commission?.campaign_name || selectedConversion?.cal_commission?.campaign_code || "—"}</span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Mã giới thiệu</span>
                            <span className="conv-detail-row__value">{selectedConversion?.pub_utm_param?.sub || selectedConversion?.publisher_name || "—"}</span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Nền tảng thiết bị</span>
                            <span className="conv-detail-row__value" style={{ fontWeight: 400 }}>
                                {selectedConversion?.click_detail?.client?.deviceOs ? `${selectedConversion.click_detail.client.deviceOs}${selectedConversion.click_detail.client.deviceType ? `, ${selectedConversion.click_detail.client.deviceType}` : ''}` : "—"}
                            </span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Trình duyệt</span>
                            <span className="conv-detail-row__value" style={{ fontWeight: 400 }}>
                                {selectedConversion?.click_detail?.client?.deviceBrowserName || selectedConversion?.user_agent || "—"}
                            </span>
                        </div>
                        <div className="conv-detail-row" style={{ flexDirection: 'column', gap: 8 }}>
                            <span className="conv-detail-row__label">Link affiliate</span>
                            <span className="conv-detail-row__value conv-detail-row__value--link" style={{ fontSize: 13, textAlign: 'left', fontWeight: 400 }}>
                                {selectedConversion?.click_detail?.click_uri || selectedConversion?.click_detail?.target_uri || "—"}
                            </span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Ngày click</span>
                            <span className="conv-detail-row__value" style={{ fontWeight: 400 }}>{selectedConversion?.click_detail?.click_time?.replace('T', ' ')?.split('+')[0] || "—"}</span>
                        </div>
                        <div className="conv-detail-row">
                            <span className="conv-detail-row__label">Ngày đặt hàng</span>
                            <span className="conv-detail-row__value" style={{ fontWeight: 400 }}>{selectedConversion?.action_date_time?.replace('T', ' ')?.split('+')[0] || "—"}</span>
                        </div>
                    </div>

                    {selectedConversion?.conversion_parts && selectedConversion.conversion_parts.length > 0 && (
                        <div className="conv-detail-section">
                            <Text size="normal" bold style={{ marginBottom: 12, display: 'block', color: '#111827' }}>Danh sách sản phẩm</Text>
                            <div className="report-table-wrapper" style={{ margin: '0 -16px', overflowX: 'auto', borderTop: '1px solid #edf0f2', borderBottom: 'none' }}>
                                <div className="report-table" style={{ minWidth: 800, display: 'flex', flexDirection: 'column' }}>
                                    <div className="report-table__header" style={{ display: 'flex', background: '#f9fafb', padding: '12px 16px', fontSize: 13, color: '#6b7280', fontWeight: 600, alignItems: 'center' }}>
                                        <div style={{ width: 40, flexShrink: 0 }}>ID</div>
                                        <div style={{ width: 80, flexShrink: 0 }}>SKU</div>
                                        <div style={{ flex: 1, minWidth: 150 }}>Tên sản phẩm</div>
                                        <div style={{ width: 80, textAlign: 'center', flexShrink: 0 }}>Số lượng</div>
                                        <div style={{ width: 140, flexShrink: 0 }}>Nhóm hàng</div>
                                        <div style={{ width: 110, textAlign: 'center', flexShrink: 0 }}>Trạng thái</div>
                                        <div style={{ width: 110, textAlign: 'right', flexShrink: 0 }}>Giá trị đơn hàng</div>
                                    </div>
                                    {selectedConversion.conversion_parts.map((p: any, i: number) => {
                                        const pStatus = p.status || selectedConversion?.status;
                                        const statusText = statusMap[String(pStatus)] || pStatus || "—";
                                        
                                        let statusColor = '#006ce6';
                                        let statusBg = '#e6f0ff';
                                        let statusBorder = '#b3d4ff';
                                        
                                        if (pStatus === 'approved') {
                                            statusColor = '#039855';
                                            statusBg = '#ecfdf3';
                                            statusBorder = '#a6f4c5';
                                        } else if (pStatus === 'pre_approved' || pStatus === 'pending') {
                                            statusColor = '#b05c0d';
                                            statusBg = '#fef0c7';
                                            statusBorder = '#fec84b';
                                        } else if (pStatus === 'rejected') {
                                            statusColor = '#d92d20';
                                            statusBg = '#fef3f2';
                                            statusBorder = '#fec3e6';
                                        }

                                        return (
                                            <div key={i} className="report-table__row" style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                                                <div style={{ width: 40, flexShrink: 0, fontSize: 13, color: '#111827', fontWeight: 500 }}>{i + 1}</div>
                                                <div style={{ width: 80, flexShrink: 0, fontSize: 13, color: '#6b7280' }}>{p.sku || p.product_sku || "—"}</div>
                                                <div style={{ flex: 1, minWidth: 150, fontSize: 13, color: '#006ce6', fontWeight: 500, paddingRight: 16 }}>{p.name || p.product_name || "—"}</div>
                                                <div style={{ width: 80, flexShrink: 0, textAlign: 'center', fontSize: 13, color: '#111827' }}>{p.quantity ?? p.qty ?? 1}</div>
                                                <div style={{ width: 140, flexShrink: 0, fontSize: 13, color: '#6b7280', paddingRight: 16 }}>{p.category || p.category_name || "—"}</div>
                                                <div style={{ width: 110, flexShrink: 0, textAlign: 'center' }}>
                                                    <span style={{ 
                                                        display: 'inline-block', 
                                                        padding: '4px 10px', 
                                                        borderRadius: 16, 
                                                        border: `1px solid ${statusBorder}`, 
                                                        background: statusBg, 
                                                        color: statusColor, 
                                                        fontSize: 11, 
                                                        fontWeight: 500 
                                                    }}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div style={{ width: 110, flexShrink: 0, textAlign: 'right', fontSize: 13, color: '#111827', fontWeight: 500 }}>{formatNumber(getPartLineAmount(p))} đ</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </Box>
            </Sheet>
            </BodyPortal>
        </Page>
    );
};

export default ReportPage;
