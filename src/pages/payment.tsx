import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Page, Box, Text, Icon, Button, Sheet, Input, DatePicker } from "zmp-ui";
import { useAuth } from "@/hooks/useAuth";
import { fetchPaymentInvoices, fetchPaymentConfig } from "@/services/api";
import { InvoiceItem } from "@/types/payment";
import { BodyPortal, BODY_OVERLAY_Z_INDEX, CUSTOM_DATE_RANGE_BODY_CLASS } from "@/components/base";
import { formatNumber } from "@/utils/format";
import { IllustrationEmptyInvoice } from "@/components/icons/LineIllustrations";

interface StatusConfig {
    value: number;
    name: string;
}

const formatDateYmd = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseYmdToDate = (ymd: string): Date | null => {
    if (!ymd) return null;
    const [y, m, day] = ymd.split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
};

const PaymentPage: React.FC = () => {
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [statusConfig, setStatusConfig] = useState<StatusConfig[]>([]);

    const [dateSheetVisible, setDateSheetVisible] = useState(false);
    const [datePaidSheetVisible, setDatePaidSheetVisible] = useState(false);
    const [statusSheetVisible, setStatusSheetVisible] = useState(false);
    const [codeSheetVisible, setCodeSheetVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [datePaidPickerVisible, setDatePaidPickerVisible] = useState(false);
    /** Tránh 2 lớp modal chồng + chạm ma mở nhầm DatePicker khi vừa đóng sheet filter */
    const [customPeriodPickersReady, setCustomPeriodPickersReady] = useState(false);
    const [customPaidPickersReady, setCustomPaidPickersReady] = useState(false);

    const [dateFilterLabel, setDateFilterLabel] = useState("");
    const [datePaidFilterLabel, setDatePaidFilterLabel] = useState("");
    const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
    const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
    const [tempPaidStartDate, setTempPaidStartDate] = useState<Date>(new Date());
    const [tempPaidEndDate, setTempPaidEndDate] = useState<Date>(new Date());
    const [draftInvoiceCode, setDraftInvoiceCode] = useState("");

    // Active filters
    const [activeFilters, setActiveFilters] = useState({
        invoice_code: "",
        status: undefined as number | undefined,
        date_start: "",
        date_end: "",
        date_paid_start: "",
        date_paid_end: "",
    });

    const STATUS_TRANSLATIONS: Record<string, string> = {
        // "New": "Mới",
        // "Pending": "Chờ thanh toán",
        // "Approve": "Đã duyệt",
        // "Rejected": "Từ chối",
        // "Paid": "Đã thanh toán",
        // "Cancel": "Đã huỷ",
        // "Waiting": "Đang chờ"

        "Waiting": "Chờ thanh toán",
        "Rejected": "Từ chối",
        "Paid": "Đã thanh toán",
    };

    const DEFAULT_STATUS_MAP: Record<number, string> = {
        // 1: "Mới",
        // 2: "Chờ thanh toán",
        // 3: "Đã duyệt",
        // 4: "Từ chối",
        // 5: "Đã thanh toán",
        // 6: "Đã huỷ"

        2: "Chờ thanh toán",
        3: "Từ chối",
        4: "Đã thanh toán",
    };

    useEffect(() => {
        if (!datePickerVisible) {
            setCustomPeriodPickersReady(false);
            return;
        }
        setCustomPeriodPickersReady(false);
        const id = window.setTimeout(() => setCustomPeriodPickersReady(true), 450);
        return () => window.clearTimeout(id);
    }, [datePickerVisible]);

    useEffect(() => {
        if (!datePaidPickerVisible) {
            setCustomPaidPickersReady(false);
            return;
        }
        setCustomPaidPickersReady(false);
        const id = window.setTimeout(() => setCustomPaidPickersReady(true), 450);
        return () => window.clearTimeout(id);
    }, [datePaidPickerVisible]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const open = datePickerVisible || datePaidPickerVisible;
        if (open) {
            document.body.classList.add(CUSTOM_DATE_RANGE_BODY_CLASS);
        } else {
            document.body.classList.remove(CUSTOM_DATE_RANGE_BODY_CLASS);
        }
        return () => document.body.classList.remove(CUSTOM_DATE_RANGE_BODY_CLASS);
    }, [datePickerVisible, datePaidPickerVisible]);

    const loadConfig = async () => {
        try {
            const config = await fetchPaymentConfig();
            if (config?.status_invoice_publisher) {
                const statuses = Object.keys(config.status_invoice_publisher).map(key => {
                    const item = config.status_invoice_publisher[key];
                    const engName = typeof item === 'object' ? item.name : item;
                    const viName = STATUS_TRANSLATIONS[engName] || engName || DEFAULT_STATUS_MAP[Number(item.value)] || `Status ${item.value}`;
                    return { value: Number(item.value), name: viName };
                });
                setStatusConfig(statuses);
            } else {
                setStatusConfig(Object.entries(DEFAULT_STATUS_MAP).map(([k, v]) => ({ value: Number(k), name: v })));
            }
        } catch (e) {
            setStatusConfig(Object.entries(DEFAULT_STATUS_MAP).map(([k, v]) => ({ value: Number(k), name: v })));
        }
    };

    const loadData = useCallback(async (pageToLoad = 1, isReload = false) => {
        if (!isAuthenticated) return;
        
        if (isReload) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await fetchPaymentInvoices({
                page: pageToLoad,
                invoice_code: activeFilters.invoice_code || undefined,
                status: activeFilters.status,
                date_start: activeFilters.date_start || undefined,
                date_end: activeFilters.date_end || undefined,
                date_paid_start: activeFilters.date_paid_start || undefined,
                date_paid_end: activeFilters.date_paid_end || undefined,
            });

            if (isReload) {
                setInvoices(response.invoices);
            } else {
                setInvoices(prev => [...prev, ...response.invoices]);
            }
            
            setHasMore(response.meta.current_page < (Math.ceil(response.meta.total / 20) || 1));
            setPage(response.meta.current_page);
        } catch (error) {
            console.error("Lỗi tải dữ liệu thanh toán:", error);
            // snackbar.openSnackbar({ type: 'error', text: 'Tải dữ liệu thất bại', duration: 3000 });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, activeFilters]);

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        loadData(1, true);
    }, [loadData]);

    const applyDateRange = useCallback((start: Date, end: Date, label: string) => {
        setActiveFilters((prev) => ({
            ...prev,
            date_start: formatDateYmd(start),
            date_end: formatDateYmd(end),
        }));
        setDateFilterLabel(label);
        setDateSheetVisible(false);
    }, []);

    const openCustomDateRange = useCallback(() => {
        const s = parseYmdToDate(activeFilters.date_start);
        const e = parseYmdToDate(activeFilters.date_end);
        setTempStartDate(s || new Date());
        setTempEndDate(e || new Date());
        setDateSheetVisible(false);
        setTimeout(() => setDatePickerVisible(true), 300);
    }, [activeFilters.date_start, activeFilters.date_end]);

    const applyPaidDateRange = useCallback((start: Date, end: Date, label: string) => {
        setActiveFilters((prev) => ({
            ...prev,
            date_paid_start: formatDateYmd(start),
            date_paid_end: formatDateYmd(end),
        }));
        setDatePaidFilterLabel(label);
        setDatePaidSheetVisible(false);
    }, []);

    const openCustomPaidDateRange = useCallback(() => {
        const s = parseYmdToDate(activeFilters.date_paid_start);
        const e = parseYmdToDate(activeFilters.date_paid_end);
        setTempPaidStartDate(s || new Date());
        setTempPaidEndDate(e || new Date());
        setDatePaidSheetVisible(false);
        setTimeout(() => setDatePaidPickerVisible(true), 300);
    }, [activeFilters.date_paid_start, activeFilters.date_paid_end]);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        if (
            target.scrollHeight - target.scrollTop <= target.clientHeight + 100 &&
            hasMore &&
            !loadingMore &&
            !loading
        ) {
            loadData(page + 1);
        }
    };

    const getInvoiceStatusCode = (item: InvoiceItem): number | undefined => {
        const s = item.status as unknown;
        if (s !== null && typeof s === "object" && "id" in (s as object)) {
            const n = Number((s as { id: unknown }).id);
            return Number.isNaN(n) ? undefined : n;
        }
        if (typeof s === "number" && !Number.isNaN(s)) return s;
        if (typeof s === "string" && s.trim() !== "") {
            const n = Number(s);
            if (!Number.isNaN(n)) return n;
        }
        return undefined;
    };

    const getStatusLabel = (item: InvoiceItem) => {
        const explicit = item.status_name || item.status_label;
        if (explicit && String(explicit).trim()) {
            const raw = String(explicit).trim();
            return STATUS_TRANSLATIONS[raw] || raw;
        }
        const code = getInvoiceStatusCode(item);
        if (code !== undefined) {
            const conf = statusConfig.find((c) => c.value === code);
            if (conf) {
                return conf.name;
            };
        }
        const raw = item.status;
        const conf2 = statusConfig.find((c) => String(c.value) === String(raw));
        if (conf2) return conf2.name;
        return `Status ${String(raw)}`;
    };

    const getStatusClass = (item: InvoiceItem) => {
        const label = getStatusLabel(item).toLowerCase();
        if (label.includes("chờ") || label.includes("đang") || label.includes("mới")) return "pending";
        if (label.includes("đã thanh toán") || label.includes("đã duyệt")) return "approved";
        if (label.includes("từ chối") || label.includes("huỷ")) return "rejected";
        return "default";
    };

    const formatMonth = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };

    const periodChipText = useMemo(() => {
        if (!activeFilters.date_start || !activeFilters.date_end) return "Kỳ đối soát";
        if (dateFilterLabel) return dateFilterLabel;
        const s = parseYmdToDate(activeFilters.date_start);
        const e = parseYmdToDate(activeFilters.date_end);
        if (s && e) return `${s.toLocaleDateString("vi-VN")} - ${e.toLocaleDateString("vi-VN")}`;
        return "Kỳ đối soát";
    }, [activeFilters.date_start, activeFilters.date_end, dateFilterLabel]);

    const paidDateChipText = useMemo(() => {
        if (!activeFilters.date_paid_start || !activeFilters.date_paid_end) return "Ngày thanh toán";
        if (datePaidFilterLabel) return datePaidFilterLabel;
        const s = parseYmdToDate(activeFilters.date_paid_start);
        const e = parseYmdToDate(activeFilters.date_paid_end);
        if (s && e) return `${s.toLocaleDateString("vi-VN")} - ${e.toLocaleDateString("vi-VN")}`;
        return "Ngày thanh toán";
    }, [activeFilters.date_paid_start, activeFilters.date_paid_end, datePaidFilterLabel]);

    const statusChipText = useMemo(() => {
        if (activeFilters.status === undefined) return "Trạng thái";
        const conf = statusConfig.find((c) => c.value === activeFilters.status);
        return conf?.name || "Trạng thái";
    }, [activeFilters.status, statusConfig]);

    const hasDateFilter = !!(activeFilters.date_start && activeFilters.date_end);
    const hasDatePaidFilter = !!(activeFilters.date_paid_start && activeFilters.date_paid_end);
    const hasStatusFilter = activeFilters.status !== undefined;
    const hasCodeFilter = !!activeFilters.invoice_code.trim();

    return (
        <Page className="payment-page" onScroll={handleScroll}>
            <div className="payment-header">
                <Text.Title className="payment-header__title">Quản lý thanh toán</Text.Title>
            </div>

            <div className="report-filters">
                <div
                    className={`report-filter-btn ${hasDatePaidFilter ? "active" : ""}`}
                    onClick={() => setDatePaidSheetVisible(true)}
                >
                    <span className="report-filter-btn-text">{paidDateChipText}</span>
                    {hasDatePaidFilter ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilters((prev) => ({
                                    ...prev,
                                    date_paid_start: "",
                                    date_paid_end: "",
                                }));
                                setDatePaidFilterLabel("");
                            }}
                            style={{ display: "flex", alignItems: "center" }}
                        >
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: "#FF5A00" }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div
                    className={`report-filter-btn ${hasDateFilter ? "active" : ""}`}
                    onClick={() => setDateSheetVisible(true)}
                >
                    <span className="report-filter-btn-text">{periodChipText}</span>
                    {hasDateFilter ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilters((prev) => ({ ...prev, date_start: "", date_end: "" }));
                                setDateFilterLabel("");
                            }}
                            style={{ display: "flex", alignItems: "center" }}
                        >
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: "#FF5A00" }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div
                    className={`report-filter-btn ${hasStatusFilter ? "active" : ""}`}
                    onClick={() => setStatusSheetVisible(true)}
                >
                    <span className="report-filter-btn-text">{statusChipText}</span>
                    {hasStatusFilter ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilters((prev) => ({ ...prev, status: undefined }));
                            }}
                            style={{ display: "flex", alignItems: "center" }}
                        >
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: "#FF5A00" }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
                <div
                    className={`report-filter-btn ${hasCodeFilter ? "active" : ""}`}
                    onClick={() => {
                        setDraftInvoiceCode(activeFilters.invoice_code);
                        setCodeSheetVisible(true);
                    }}
                >
                    <span className="report-filter-btn-text">
                        {hasCodeFilter ? activeFilters.invoice_code : "Mã hóa đơn"}
                    </span>
                    {hasCodeFilter ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilters((prev) => ({ ...prev, invoice_code: "" }));
                            }}
                            style={{ display: "flex", alignItems: "center" }}
                        >
                            <Icon icon="zi-close-circle" size={16} style={{ marginLeft: 4, color: "#FF5A00" }} />
                        </div>
                    ) : (
                        <Icon icon="zi-chevron-down" size={16} />
                    )}
                </div>
            </div>

            <div className="payment-content">
                {loading && page === 1 ? (
                    <div className="payment-skeleton">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="payment-skeleton__card shimmer" />
                        ))}
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="payment-empty">
                        <div className="payment-empty__icon" aria-hidden>
                            <IllustrationEmptyInvoice />
                        </div>
                        <Text className="payment-empty__text">Chưa có dữ liệu thanh toán</Text>
                    </div>
                ) : (
                    <div className="payment-list">
                        {invoices.map(item => (
                            <div key={item.id || item.invoice_code} className="payment-card">
                                <div className="payment-card__header">
                                    <span className="payment-card__month">Tháng {formatMonth(item.date_to)}</span>
                                    <span className={`payment-card__status payment-card__status--${getStatusClass(item)}`}>
                                        {getStatusLabel(item)}
                                    </span>
                                </div>
                                <div className="payment-card__body">
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Mã hóa đơn</span>
                                        <span className="payment-card__value payment-card__value--link">{item.invoice_code}</span>
                                    </div>
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Kỳ đối soát</span>
                                        <span className="payment-card__value">{formatDateDisplay(item.date_to)}</span>
                                    </div>
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Tổng hoa hồng</span>
                                        <span className={`payment-card__value payment-card__value--amount ${getStatusClass(item)}`}>
                                            +{formatNumber(Number(item.total_commission || item.amount || 0))} đ
                                        </span>
                                    </div>
                                    <div className="payment-card__row">
                                        <span className="payment-card__label">Ngày thanh toán</span>
                                        <span className="payment-card__value">
                                            {item.date_paid ? formatDateDisplay(item.date_paid) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loadingMore && (
                            <div style={{ textAlign: 'center', padding: '16px' }}>
                                <div className="shimmer" style={{ height: 20, width: 20, borderRadius: '50%', display: 'inline-block' }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Ngày thanh toán — cùng pattern kỳ đối soát; portal tránh bottom nav đè */}
            <BodyPortal>
            <Sheet visible={datePaidSheetVisible} onClose={() => setDatePaidSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Chọn ngày thanh toán</Text.Title>
                    <div onClick={() => setDatePaidSheetVisible(false)}>
                        <Icon icon="zi-close" />
                    </div>
                </div>
                <Box className="filter-sheet-content">
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            applyPaidDateRange(today, today, "Hôm nay");
                        }}
                    >
                        Hôm nay
                    </div>
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            const past7 = new Date();
                            past7.setDate(today.getDate() - 6);
                            applyPaidDateRange(past7, today, "7 ngày qua");
                        }}
                    >
                        7 ngày qua
                    </div>
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                            applyPaidDateRange(firstDay, lastDay, "Tháng này");
                        }}
                    >
                        Tháng này
                    </div>
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                            applyPaidDateRange(firstDay, lastDay, "Tháng trước");
                        }}
                    >
                        Tháng trước
                    </div>
                    <div className="filter-option" onClick={openCustomPaidDateRange}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Icon icon="zi-calendar" size={16} /> Tùy chỉnh (Chọn ngày)
                        </div>
                    </div>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Kỳ đối soát — giống sheet Thời gian ở Báo cáo */}
            <BodyPortal>
            <Sheet visible={dateSheetVisible} onClose={() => setDateSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Chọn kỳ đối soát</Text.Title>
                    <div onClick={() => setDateSheetVisible(false)}>
                        <Icon icon="zi-close" />
                    </div>
                </div>
                <Box className="filter-sheet-content">
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            applyDateRange(today, today, "Hôm nay");
                        }}
                    >
                        Hôm nay
                    </div>
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            const past7 = new Date();
                            past7.setDate(today.getDate() - 6);
                            applyDateRange(past7, today, "7 ngày qua");
                        }}
                    >
                        7 ngày qua
                    </div>
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                            applyDateRange(firstDay, lastDay, "Tháng này");
                        }}
                    >
                        Tháng này
                    </div>
                    <div
                        className="filter-option"
                        onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                            applyDateRange(firstDay, lastDay, "Tháng trước");
                        }}
                    >
                        Tháng trước
                    </div>
                    <div className="filter-option" onClick={openCustomDateRange}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Icon icon="zi-calendar" size={16} /> Tùy chỉnh (Chọn ngày)
                        </div>
                    </div>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Trạng thái — giống sheet Trạng thái ở Báo cáo */}
            <BodyPortal>
            <Sheet visible={statusSheetVisible} onClose={() => setStatusSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Chọn trạng thái</Text.Title>
                    <div onClick={() => setStatusSheetVisible(false)}>
                        <Icon icon="zi-close" />
                    </div>
                </div>
                <Box className="filter-sheet-content">
                    <div
                        className="filter-option"
                        onClick={() => {
                            setActiveFilters((prev) => ({ ...prev, status: undefined }));
                            setStatusSheetVisible(false);
                        }}
                    >
                        Tất cả
                    </div>
                    {statusConfig.map((s) => (
                        <div
                            key={s.value}
                            className="filter-option"
                            onClick={() => {
                                setActiveFilters((prev) => ({ ...prev, status: s.value }));
                                setStatusSheetVisible(false);
                            }}
                        >
                            {s.name}
                        </div>
                    ))}
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Mã hóa đơn — giống pattern UTM ở Báo cáo (Input + Áp dụng) */}
            <BodyPortal>
            <Sheet visible={codeSheetVisible} onClose={() => setCodeSheetVisible(false)} autoHeight zIndex={BODY_OVERLAY_Z_INDEX}>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Lọc theo mã hóa đơn</Text.Title>
                    <div onClick={() => setCodeSheetVisible(false)}>
                        <Icon icon="zi-close" />
                    </div>
                </div>
                <Box className="filter-sheet-content" p={4} pb={6}>
                    <Input
                        placeholder="Nhập mã hóa đơn..."
                        value={draftInvoiceCode}
                        onChange={(e) => setDraftInvoiceCode(e.target.value)}
                        clearable
                    />
                    <Button
                        fullWidth
                        style={{ marginTop: 24 }}
                        onClick={() => {
                            setActiveFilters((prev) => ({
                                ...prev,
                                invoice_code: draftInvoiceCode.trim(),
                            }));
                            setCodeSheetVisible(false);
                        }}
                    >
                        Áp dụng
                    </Button>
                </Box>
            </Sheet>
            </BodyPortal>

            {/* Tùy chỉnh kỳ — overlay giống Báo cáo */}
            {datePickerVisible && (
                <BodyPortal>
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: BODY_OVERLAY_Z_INDEX,
                        display: "flex",
                        alignItems: "flex-end",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            width: "100%",
                            borderTopLeftRadius: "16px",
                            borderTopRightRadius: "16px",
                            paddingBottom: "24px",
                        }}
                    >
                        <div className="filter-sheet-header" style={{ padding: "16px 16px 0 16px", borderBottom: "none" }}>
                            <Text.Title className="filter-sheet-header__title">Tùy chỉnh kỳ đối soát</Text.Title>
                            <div onClick={() => setDatePickerVisible(false)}>
                                <Icon icon="zi-close" />
                            </div>
                        </div>
                        <Box className="filter-sheet-content" p={4} pb={0}>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <Box style={{ flex: 1 }}>
                                    <Text size="small" bold style={{ marginBottom: "8px", color: "#666" }}>
                                        Từ ngày
                                    </Text>
                                    {customPeriodPickersReady ? (
                                        <DatePicker
                                            dateFormat="dd/mm/yyyy"
                                            title="Từ ngày"
                                            action={{ text: "Xong", close: true }}
                                            value={tempStartDate}
                                            onChange={(val: unknown) => setTempStartDate(val as Date)}
                                        />
                                    ) : (
                                        <div
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
                                    <Text size="small" bold style={{ marginBottom: "8px", color: "#666" }}>
                                        Đến ngày
                                    </Text>
                                    {customPeriodPickersReady ? (
                                        <DatePicker
                                            dateFormat="dd/mm/yyyy"
                                            title="Đến ngày"
                                            action={{ text: "Xong", close: true }}
                                            value={tempEndDate}
                                            onChange={(val: unknown) => setTempEndDate(val as Date)}
                                        />
                                    ) : (
                                        <div
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
                            <Button
                                fullWidth
                                style={{ marginTop: 24 }}
                                onClick={() => {
                                    const sMs = tempStartDate.getTime();
                                    const eMs = tempEndDate.getTime();
                                    const start = sMs <= eMs ? tempStartDate : tempEndDate;
                                    const end = sMs <= eMs ? tempEndDate : tempStartDate;
                                    setActiveFilters((prev) => ({
                                        ...prev,
                                        date_start: formatDateYmd(start),
                                        date_end: formatDateYmd(end),
                                    }));
                                    setDateFilterLabel(
                                        `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`
                                    );
                                    setDatePickerVisible(false);
                                }}
                            >
                                Áp dụng
                            </Button>
                        </Box>
                    </div>
                </div>
                </BodyPortal>
            )}

            {/* Tùy chỉnh ngày thanh toán */}
            {datePaidPickerVisible && (
                <BodyPortal>
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: BODY_OVERLAY_Z_INDEX,
                        display: "flex",
                        alignItems: "flex-end",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            width: "100%",
                            borderTopLeftRadius: "16px",
                            borderTopRightRadius: "16px",
                            paddingBottom: "24px",
                        }}
                    >
                        <div className="filter-sheet-header" style={{ padding: "16px 16px 0 16px", borderBottom: "none" }}>
                            <Text.Title className="filter-sheet-header__title">Tùy chỉnh ngày thanh toán</Text.Title>
                            <div onClick={() => setDatePaidPickerVisible(false)}>
                                <Icon icon="zi-close" />
                            </div>
                        </div>
                        <Box className="filter-sheet-content" p={4} pb={0}>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <Box style={{ flex: 1 }}>
                                    <Text size="small" bold style={{ marginBottom: "8px", color: "#666" }}>
                                        Từ ngày
                                    </Text>
                                    {customPaidPickersReady ? (
                                        <DatePicker
                                            dateFormat="dd/mm/yyyy"
                                            title="Từ ngày"
                                            action={{ text: "Xong", close: true }}
                                            value={tempPaidStartDate}
                                            onChange={(val: unknown) => setTempPaidStartDate(val as Date)}
                                        />
                                    ) : (
                                        <div
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
                                    <Text size="small" bold style={{ marginBottom: "8px", color: "#666" }}>
                                        Đến ngày
                                    </Text>
                                    {customPaidPickersReady ? (
                                        <DatePicker
                                            dateFormat="dd/mm/yyyy"
                                            title="Đến ngày"
                                            action={{ text: "Xong", close: true }}
                                            value={tempPaidEndDate}
                                            onChange={(val: unknown) => setTempPaidEndDate(val as Date)}
                                        />
                                    ) : (
                                        <div
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
                            <Button
                                fullWidth
                                style={{ marginTop: 24 }}
                                onClick={() => {
                                    const sMs = tempPaidStartDate.getTime();
                                    const eMs = tempPaidEndDate.getTime();
                                    const start = sMs <= eMs ? tempPaidStartDate : tempPaidEndDate;
                                    const end = sMs <= eMs ? tempPaidEndDate : tempPaidStartDate;
                                    setActiveFilters((prev) => ({
                                        ...prev,
                                        date_paid_start: formatDateYmd(start),
                                        date_paid_end: formatDateYmd(end),
                                    }));
                                    setDatePaidFilterLabel(
                                        `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`
                                    );
                                    setDatePaidPickerVisible(false);
                                }}
                            >
                                Áp dụng
                            </Button>
                        </Box>
                    </div>
                </div>
                </BodyPortal>
            )}
        </Page>
    );
};

export default PaymentPage;
