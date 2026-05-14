import React, { useEffect, useCallback, useState } from "react";
import { Page, Text, Box, Button, useNavigate, Icon, Sheet, Input, DatePicker } from "zmp-ui";
import { useAtom } from "jotai";
import { useAuth } from "@/hooks/useAuth";

import { conversionsAtom, loadingReportAtom } from "@/state/job";
import {
    fetchConversions,
    fetchCampaignsWithContract,
    fetchReportOverview,
    type PublisherConversionListMeta,
} from "@/services/api";
import { DataCard } from "@/components/display";
import { ConversionDetailSheet } from "@/components/display/ConversionDetailSheet";
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
    const [overview, setOverview] = useState<any>(null);
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
    const [orderIdInput, setOrderIdInput] = useState("");
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
            const overviewData = await fetchReportOverview({
                from_date,
                to_date,
                campaigns: filterCampaign ? [filterCampaign] : undefined,
            });
            setConvMeta(convData.meta || {});
            setConversions(convData.items);
            setOverview(overviewData);
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
            <div className="report-header">
                <div className="report-header__top">
                    <Text.Title className="report-header__title">Báo cáo</Text.Title>
                </div>
            </div>

            <div className="report-filters">
                <div className={`report-filter-btn ${filterTimeLabel ? 'active' : ''}`} onClick={() => setTimeSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterTimeLabel || "Thời gian"}</span>
                    {filterTimeLabel ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterTimeLabel(""); setConvPage(1); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterCampaign ? 'active' : ''}`} onClick={() => setCampaignSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterCampaignName || "Chương trình"}</span>
                    {filterCampaign ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterCampaign(""); setFilterCampaignName(""); setConvPage(1); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterUtmParam ? 'active' : ''}`} onClick={() => setUtmSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterUtmParam ? `${filterUtmParam}: ${filterUtmValue}` : "Nguồn UTM"}</span>
                    {filterUtmParam ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterUtmParam(""); setFilterUtmValue(""); setConvPage(1); }} style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: '#FF5A00' }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div className={`report-filter-btn ${filterSubParam ? 'active' : ''}`} onClick={() => setSubSheetVisible(true)}>
                    <span className="report-filter-btn-text">{filterSubParam ? `${filterSubParam}: ${filterSubValue}` : "Nguồn Sub"}</span>
                    {filterSubParam ? (
                        <div onClick={(e) => { e.stopPropagation(); setFilterSubParam(""); setFilterSubValue(""); setConvPage(1); }} style={{ display: 'flex', alignItems: 'center' }}>
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
                        {/* <div className="report-overview-section">
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-inbox" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Giá trị đơn hàng</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Tổng: (20%)</span>
                                    <span className="report-overview-card__value">
                                        {formatNumber(overview?.sale_amount?.total ?? convMeta.total_sale_amount ?? 0)}
                                    </span>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Tổng:</span>
                                    <span className="report-overview-card__value">
                                        {formatNumber(overview?.sale_amount?.total ?? convMeta.total_sale_amount ?? 0)}
                                    </span>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Đã duyệt:</span>
                                    <span className="report-overview-card__value report-overview-card__value--success">
                                        {formatNumber((overview?.sale_amount?.approved ?? 0) + (overview?.sale_amount?.pre_approved ?? 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-star" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Hoa hồng</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Tổng:</span>
                                    <span className="report-overview-card__value">
                                        {formatNumber(overview?.pub_commission?.total ?? convMeta.total_pub_commission ?? 0)}
                                    </span>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Đã duyệt:</span>
                                    <span className="report-overview-card__value report-overview-card__value--success">
                                        {formatNumber((overview?.pub_commission?.approved ?? 0) + (overview?.pub_commission?.pre_approved ?? 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-refresh" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Chuyển đổi</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Tổng:</span>
                                    <span className="report-overview-card__value">
                                        {formatNumber(overview?.conversion?.total ?? convMeta.total_conversion_part_quantity ?? 0)}
                                    </span>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">Đã duyệt:</span>
                                    <span className="report-overview-card__value report-overview-card__value--success">
                                        {formatNumber((overview?.conversion?.approved ?? 0) + (overview?.conversion?.pre_approved ?? 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="report-overview-card">
                                <div className="report-overview-card__header">
                                    <Icon icon="zi-more-grid" className="report-overview-card__icon" />
                                    <Text size="normal" bold>Khác</Text>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">CLICK:</span>
                                    <span className="report-overview-card__value">
                                        {formatNumber(overview?.click ?? 0)}
                                    </span>
                                </div>
                                <div className="report-overview-card__row">
                                    <span className="report-overview-card__label">EPC:</span>
                                    <span className="report-overview-card__value">
                                        {formatNumber(overview?.epc ?? 0)}
                                    </span>
                                </div>
                            </div>
                        </div> */}

                        <div className="report-list-section">
                            <Text size="large" bold className="report-list-section__title">Danh sách đơn hàng</Text>

                            <div className="report-list-stats">
                                <div className="report-list-stats__item">
                                    <span className="report-list-stats__label">Tổng đơn hàng</span>
                                    <span className="report-list-stats__value">{formatNumber(convMeta?.total ?? 0)}</span>
                                </div>
                                <div className="report-list-stats__item">
                                    <span className="report-list-stats__label">Tổng giá trị</span>
                                    <span className="report-list-stats__value">{formatNumber(convMeta?.total_sale_amount ?? 0)} đ</span>
                                </div>
                                <div className="report-list-stats__item">
                                    <span className="report-list-stats__label">Tổng số lượng</span>
                                    <span className="report-list-stats__value">{formatNumber(convMeta?.total_conversion_part_quantity ?? 0)}</span>
                                </div>
                                <div className="report-list-stats__item">
                                    <span className="report-list-stats__label">Tổng hoa hồng</span>
                                    <span className="report-list-stats__value report-list-stats__value--highlight">{formatNumber(convMeta?.total_pub_commission ?? 0)} đ</span>
                                </div>
                            </div>

                            <div className="report-list-filters">
                                <div className="report-search-box">
                                    <Icon icon="zi-search" className="report-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Tìm mã đơn hàng..."
                                        value={orderIdInput}
                                        onChange={(e) => setOrderIdInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setFilterOrderId(orderIdInput);
                                            }
                                        }}
                                        className="report-search-input"
                                    />
                                    {orderIdInput && (
                                        <div className="report-search-clear" onClick={() => { setOrderIdInput(""); setFilterOrderId(""); }}>
                                            <Icon icon="zi-close-circle-solid" size={16} />
                                        </div>
                                    )}
                                </div>
                                <div className="report-quick-status">
                                    <div
                                        className={`report-quick-status__item ${!filterStatus ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('')}
                                    >Tất cả</div>
                                    <div
                                        className={`report-quick-status__item ${filterStatus === 'pending' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('pending')}
                                    >Đang chờ</div>
                                    <div
                                        className={`report-quick-status__item ${filterStatus === 'pre_approved' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('pre_approved')}
                                    >Tạm duyệt</div>
                                    <div
                                        className={`report-quick-status__item ${filterStatus === 'approved' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('approved')}
                                    >Đã duyệt</div>
                                    <div
                                        className={`report-quick-status__item ${filterStatus === 'rejected' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('rejected')}
                                    >Từ chối</div>
                                </div>
                            </div>

                            {conversions.length === 0 ? (
                                <div className="empty-state" style={{ padding: 16 }}>
                                    <Text size="small">Chưa có đơn hàng nào</Text>
                                </div>
                            ) : (
                                <div className="conversion-list">
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
                                            statusText = "Đang chờ";
                                            statusClass = "pending";
                                        } else if (conv.status === "rejected") {
                                            statusText = "Từ chối";
                                            statusClass = "rejected";
                                        }

                                        const saleAmount = getSaleAmount(conv);
                                        const commAmount = getPublisherCommissionAmount(conv);
                                        const commPct = getCommissionPercentLabel(conv, commAmount);

                                        return (
                                            <div
                                                className="conversion-card"
                                                key={conv.conversion_id || i}
                                                onClick={() => setSelectedConversion(conv)}
                                            >
                                                <div className="conversion-card__header">
                                                    <div className="conversion-card__campaign">
                                                        <span className="conversion-card__campaign-name">
                                                            {conv.campaign_name || `Mã ĐH: ${conv.order_id || "N/A"}`}
                                                        </span>
                                                    </div>
                                                    <span className={`conversion-card__status conversion-card__status--${statusClass}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div className="conversion-card__body">
                                                    <div className="conversion-card__meta" style={!conv.campaign_name ? { justifyContent: 'flex-end' } : {}}>
                                                        {conv.campaign_name && (
                                                            <span className="conversion-card__id">
                                                                Mã ĐH: {conv.order_id || "N/A"}
                                                            </span>
                                                        )}
                                                        <span className="conversion-card__time">{conv.action_date_time ? formatDateTime(conv.action_date_time) : "—"}</span>
                                                    </div>
                                                    <div className="conversion-card__amounts">
                                                        <div className="conversion-card__amount-item">
                                                            <span className="conversion-card__amount-label">Giá trị:</span>
                                                            <span className="conversion-card__amount-value">{formatNumber(saleAmount)} đ</span>
                                                        </div>
                                                        <div className="conversion-card__amount-item">
                                                            <span className="conversion-card__amount-label">Hoa hồng:</span>
                                                            <span className={`conversion-card__amount-value conversion-card__amount-value--${statusClass}`}>
                                                                +{formatNumber(commAmount)} đ {commPct ? <span className="conversion-card__pct">{commPct}</span> : null}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {conversions.length > 0 && (
                                <div className="report-pagination">
                                    <Button
                                        size="small"
                                        variant="secondary"
                                        disabled={convPage <= 1 || loading}
                                        onClick={() => setConvPage((p) => Math.max(1, p - 1))}
                                    >
                                        ←
                                    </Button>
                                    <Text size="small" className="report-pagination__text">
                                        Trang {(convMeta.page ?? convPage)}/{Math.max(1, Math.ceil((convMeta.total ?? conversions.length) / pageSize))}
                                    </Text>
                                    <Button
                                        size="small"
                                        variant="secondary"
                                        disabled={
                                            loading ||
                                            !convMeta.total ||
                                            convPage * pageSize >= convMeta.total
                                        }
                                        onClick={() => setConvPage((p) => p + 1)}
                                    >
                                        →
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="report-footer">Powered by ACCESSTRADE</div>
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
            <ConversionDetailSheet
                conversionId={selectedConversion?.id || selectedConversion?.conversion_id || null}
                onClose={() => setSelectedConversion(null)}
            />
        </Page>
    );
};

export default ReportPage;
