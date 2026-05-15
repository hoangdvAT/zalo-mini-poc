import React, { useEffect, useState } from "react";
import { Sheet, Text, Box, Icon } from "zmp-ui";
import { BodyPortal, BODY_OVERLAY_Z_INDEX } from "@/components/base";
import { formatNumber } from "@/utils/format";
import {
    getCommissionPercentLabel,
    getConversionReasonText,
    getPartLineAmount,
    getPublisherCommissionAmount,
    getSaleAmount,
} from "@/utils/conversionDisplay";
import { fetchConversionDetail, fetchPublisherRefCode } from "@/services/api";

interface ConversionDetailSheetProps {
    conversionId: string | null;
    onClose: () => void;
}

const EMPTY_VALUE = "Không có dữ liệu";

const statusMap: Record<string, string> = {
    pending: "Đang chờ xử lý",
    pre_approved: "Tạm duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
};

function getTextValue(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    return null;
}

function getDisplayLinkValue(...values: unknown[]): string {
    for (const value of values) {
        const text = getTextValue(value);
        if (!text) continue;
        if (text === "#" || text.toLowerCase() === "local api") continue;
        return text;
    }
    return EMPTY_VALUE;
}

function formatDateTime(value: unknown): string {
    const raw = getTextValue(value);
    if (!raw) return EMPTY_VALUE;

    const normalized = raw
        .replace("T", " ")
        .replace(/\.\d+/, "")
        .replace(/([+-]\d{2}):?(\d{2})$/, "")
        .trim();

    const [datePart, timePart = ""] = normalized.split(" ");
    const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return normalized || EMPTY_VALUE;

    const [, year, month, day] = dateMatch;
    return `${day}-${month}-${year}${timePart ? ` ${timePart}` : ""}`;
}

function hasUtmDetail(conversion: any): boolean {
    const params = conversion?.pub_utm_param;
    return !!(
        params?.utm_campaign ||
        params?.utm_content ||
        params?.utm_medium ||
        params?.utm_source ||
        params?.utm_term
    );
}

function hasSubDetail(conversion: any): boolean {
    const params = conversion?.pub_utm_param;
    return !!(
        params?.sub ||
        params?.sub1 ||
        params?.sub2 ||
        params?.sub3 ||
        params?.sub4
    );
}

export const ConversionDetailSheet: React.FC<ConversionDetailSheetProps> = ({
    conversionId,
    onClose,
}) => {
    const [selectedConversion, setSelectedConversion] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [expandedUtm, setExpandedUtm] = useState(false);
    const [expandedSub, setExpandedSub] = useState(false);

    useEffect(() => {
        if (!conversionId) {
            setSelectedConversion(null);
            setExpandedUtm(false);
            setExpandedSub(false);
            return;
        }

        let cancelled = false;

        const loadDetail = async () => {
            setLoading(true);
            try {
                const data = await fetchConversionDetail(conversionId);
                if (!data || cancelled) {
                    if (!cancelled) setSelectedConversion(data);
                    return;
                }

                let nextData = data;
                const refCode = await fetchPublisherRefCode({
                    campaign_id: data.campaign_id,
                    publisher_id: data.publisher_id,
                    ad_space_code: data?.click_detail?.ad_space_code,
                });

                if (refCode) {
                    nextData = { ...data, ref_code: refCode };
                }

                if (!cancelled) {
                    setSelectedConversion(nextData);
                }
            } catch (err) {
                console.error("Lỗi tải chi tiết đơn hàng:", err);
                if (!cancelled) {
                    setSelectedConversion(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDetail();

        return () => {
            cancelled = true;
        };
    }, [conversionId]);

    const conversion = selectedConversion || {};
    const productParts = Array.isArray(conversion?.conversion_parts)
        ? conversion.conversion_parts
        : [];
    const campaignName =
        getTextValue(conversion?.click_detail?.campaign_name) ||
        getTextValue(conversion?.campaign_name) ||
        getTextValue(conversion?.cal_commission?.campaign_name) ||
        getTextValue(conversion?.order_name) ||
        getTextValue(conversion?.cal_commission?.campaign_code) ||
        EMPTY_VALUE;
    const affiliateLink = getDisplayLinkValue(
        conversion?.click_detail?.referer_uri,
        conversion?.click_detail?.click_uri,
        conversion?.click_detail?.target_uri
    );
    const referralCode =
        getTextValue(conversion?.ref_code) ||
        getTextValue(conversion?.pub_utm_param?.sub) ||
        EMPTY_VALUE;
    const devicePlatform =
        getTextValue(conversion?.click_detail?.client?.deviceType) ||
        getTextValue(conversion?.click_detail?.client?.deviceOs) ||
        EMPTY_VALUE;
    const browserName =
        getTextValue(conversion?.click_detail?.client?.deviceBrowserName) ||
        getTextValue(conversion?.user_agent) ||
        EMPTY_VALUE;
    const statusText =
        statusMap[String(conversion?.status)] ||
        getTextValue(conversion?.status) ||
        EMPTY_VALUE;
    const commissionAmountColor =
        conversion?.status === "approved"
            ? "#039855"
            : conversion?.status === "pre_approved"
              ? "#b05c0d"
              : conversion?.status === "rejected"
                ? "#d92d20"
                : conversion?.status === "pending"
                  ? "#006ce6"
                  : "#374151";
    const productCount = productParts.length;
    const utmEntries = [
        ["utm_campaign", getTextValue(conversion?.pub_utm_param?.utm_campaign)],
        ["utm_content", getTextValue(conversion?.pub_utm_param?.utm_content)],
        ["utm_medium", getTextValue(conversion?.pub_utm_param?.utm_medium)],
        ["utm_source", getTextValue(conversion?.pub_utm_param?.utm_source)],
        ["utm_term", getTextValue(conversion?.pub_utm_param?.utm_term)],
    ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;
    const subEntries = [
        ["sub", getTextValue(conversion?.pub_utm_param?.sub)],
        ["sub1", getTextValue(conversion?.pub_utm_param?.sub1)],
        ["sub2", getTextValue(conversion?.pub_utm_param?.sub2)],
        ["sub3", getTextValue(conversion?.pub_utm_param?.sub3)],
        ["sub4", getTextValue(conversion?.pub_utm_param?.sub4)],
    ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

    return (
        <BodyPortal>
            <Sheet
                visible={!!conversionId}
                onClose={() => {
                    onClose();
                    setSelectedConversion(null);
                    setExpandedUtm(false);
                    setExpandedSub(false);
                }}
                autoHeight
                zIndex={BODY_OVERLAY_Z_INDEX}
            >
                {loading ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                        Đang tải chi tiết...
                    </div>
                ) : selectedConversion ? (
                    <>
                        <div className="conv-detail-sheet-header">
                            <button
                                type="button"
                                className="conv-detail-sheet-header__close"
                                onClick={() => {
                                    onClose();
                                    setSelectedConversion(null);
                                    setExpandedUtm(false);
                                    setExpandedSub(false);
                                }}
                                aria-label="Đóng chi tiết đơn hàng"
                            >
                                <Icon icon="zi-close" size={20} />
                            </button>
                            <Text.Title style={{ fontSize: 18, marginBottom: 4 }}>
                                Chi tiết đơn hàng
                            </Text.Title>
                            <Text
                                size="small"
                                bold
                                style={{ color: "#111827", display: "block", marginBottom: 2 }}
                            >
                                {conversion?.order_id || EMPTY_VALUE}
                            </Text>
                            <Text size="small" style={{ color: "#667085" }}>
                                {campaignName}
                            </Text>
                        </div>
                        <Box
                            className="conv-detail-sheet-body"
                            p={4}
                            pb={6}
                            style={{
                                maxHeight: "80vh",
                                overflowY: "auto",
                                overflowX: "hidden",
                                background: "#f4f5f6",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                    marginBottom: 12,
                                }}
                            >
                                <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
                                    <Text size="small" style={{ color: "#667085", marginBottom: 4 }}>
                                        Hoa hồng
                                    </Text>
                                    <Text size="large" bold style={{ color: commissionAmountColor }}>
                                        {formatNumber(getPublisherCommissionAmount(conversion))} đ
                                    </Text>
                                    {(() => {
                                        const pct = getCommissionPercentLabel(
                                            conversion,
                                            getPublisherCommissionAmount(conversion)
                                        );
                                        return pct ? (
                                            <Text
                                                size="xSmall"
                                                style={{ color: "#667085", marginTop: 4 }}
                                            >
                                                {pct}
                                            </Text>
                                        ) : null;
                                    })()}
                                </div>
                                <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
                                    <Text size="small" style={{ color: "#667085", marginBottom: 4 }}>
                                        Giá trị đơn hàng
                                    </Text>
                                    <Text size="large" bold style={{ color: "#374151" }}>
                                        {formatNumber(getSaleAmount(conversion))} đ
                                    </Text>
                                </div>
                            </div>

                            <div className="conv-detail-section">
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Số lượng sản phẩm</span>
                                    <span className="conv-detail-row__value">{productCount}</span>
                                </div>
                                <div className="conv-detail-row" style={{ flexDirection: "column", gap: 8 }}>
                                    <span className="conv-detail-row__label">Link affiliate</span>
                                    <span
                                        className="conv-detail-row__value conv-detail-row__value--link"
                                        style={{
                                            fontSize: 13,
                                            textAlign: "left",
                                            fontWeight: 400,
                                        }}
                                    >
                                        {affiliateLink}
                                    </span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Mã giới thiệu</span>
                                    <span className="conv-detail-row__value">{referralCode}</span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Tên chiến dịch</span>
                                    <span className="conv-detail-row__value">{campaignName}</span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Nền tảng thiết bị</span>
                                    <span className="conv-detail-row__value">{devicePlatform}</span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Trình duyệt</span>
                                    <span className="conv-detail-row__value">{browserName}</span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Ngày phát sinh click</span>
                                    <span className="conv-detail-row__value">
                                        {formatDateTime(conversion?.click_detail?.click_time)}
                                    </span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Ngày đặt hàng</span>
                                    <span className="conv-detail-row__value">
                                        {formatDateTime(
                                            conversion?.created_time || conversion?.action_date_time
                                        )}
                                    </span>
                                </div>
                                <div
                                    className="conv-detail-row"
                                    style={{
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                        gap: 8,
                                        cursor: hasUtmDetail(conversion) ? "pointer" : "default",
                                    }}
                                    onClick={() =>
                                        hasUtmDetail(conversion) &&
                                        setExpandedUtm((prev) => !prev)
                                    }
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                            width: "100%",
                                        }}
                                    >
                                        <span className="conv-detail-row__label">utm</span>
                                        <span className="conv-detail-row__value">
                                            {hasUtmDetail(conversion)
                                                ? expandedUtm
                                                    ? "Thu gọn"
                                                    : "Xem chi tiết"
                                                : EMPTY_VALUE}
                                        </span>
                                    </div>
                                    {expandedUtm &&
                                        utmEntries.map(([label, value]) => (
                                            <div
                                                key={label}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    gap: 12,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: "#667085",
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {label}
                                                </span>
                                                <span
                                                    style={{
                                                        color: "#111827",
                                                        fontSize: 13,
                                                        textAlign: "right",
                                                        flex: 1,
                                                    }}
                                                >
                                                    {value}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                                <div
                                    className="conv-detail-row"
                                    style={{
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                        gap: 8,
                                        cursor: hasSubDetail(conversion) ? "pointer" : "default",
                                    }}
                                    onClick={() =>
                                        hasSubDetail(conversion) &&
                                        setExpandedSub((prev) => !prev)
                                    }
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                            width: "100%",
                                        }}
                                    >
                                        <span className="conv-detail-row__label">sub</span>
                                        <span className="conv-detail-row__value">
                                            {hasSubDetail(conversion)
                                                ? expandedSub
                                                    ? "Thu gọn"
                                                    : "Xem chi tiết"
                                                : EMPTY_VALUE}
                                        </span>
                                    </div>
                                    {expandedSub &&
                                        subEntries.map(([label, value]) => (
                                            <div
                                                key={label}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    gap: 12,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: "#667085",
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {label}
                                                </span>
                                                <span
                                                    style={{
                                                        color: "#111827",
                                                        fontSize: 13,
                                                        textAlign: "right",
                                                        flex: 1,
                                                    }}
                                                >
                                                    {value}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Trạng thái</span>
                                    <span
                                        className="conv-detail-row__value"
                                        style={{
                                            color:
                                                conversion?.status === "approved"
                                                    ? "#039855"
                                                    : conversion?.status === "pre_approved"
                                                      ? "#b05c0d"
                                                      : conversion?.status === "rejected"
                                                        ? "#d92d20"
                                                        : "#006ce6",
                                        }}
                                    >
                                        {statusText}
                                    </span>
                                </div>
                                <div className="conv-detail-row">
                                    <span className="conv-detail-row__label">Lý do</span>
                                    <span
                                        className="conv-detail-row__value"
                                        style={{ fontWeight: 400 }}
                                    >
                                        {getConversionReasonText(conversion) || EMPTY_VALUE}
                                    </span>
                                </div>
                            </div>

                            <div className="conv-detail-section">
                                <Text
                                    size="normal"
                                    bold
                                    style={{
                                        marginBottom: 12,
                                        display: "block",
                                        color: "#111827",
                                    }}
                                >
                                    Danh sách sản phẩm
                                </Text>
                                {productParts.length > 0 ? (
                                    <div
                                        className="report-table-wrapper"
                                        style={{
                                            margin: "0 -16px",
                                            overflowX: "auto",
                                            borderTop: "1px solid #edf0f2",
                                            borderBottom: "none",
                                        }}
                                    >
                                        <div
                                            className="report-table"
                                            style={{
                                                minWidth: 800,
                                                display: "flex",
                                                flexDirection: "column",
                                            }}
                                        >
                                            <div
                                                className="report-table__header"
                                                style={{
                                                    display: "flex",
                                                    background: "#f9fafb",
                                                    padding: "12px 16px",
                                                    fontSize: 13,
                                                    color: "#6b7280",
                                                    fontWeight: 600,
                                                    alignItems: "center",
                                                }}
                                            >
                                                <div style={{ width: 40, flexShrink: 0 }}>ID</div>
                                                <div style={{ width: 80, flexShrink: 0 }}>SKU</div>
                                                <div style={{ flex: 1, minWidth: 150 }}>
                                                    Tên sản phẩm
                                                </div>
                                                <div
                                                    style={{
                                                        width: 80,
                                                        textAlign: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    Số lượng
                                                </div>
                                                <div style={{ width: 140, flexShrink: 0 }}>
                                                    Nhóm hàng
                                                </div>
                                                <div
                                                    style={{
                                                        width: 110,
                                                        textAlign: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    Trạng thái
                                                </div>
                                                <div
                                                    style={{
                                                        width: 110,
                                                        textAlign: "right",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    Giá trị đơn hàng
                                                </div>
                                            </div>
                                            {productParts.map((p: any, i: number) => {
                                                const pStatus = p.status || conversion?.status;
                                                const partStatusText =
                                                    statusMap[String(pStatus)] ||
                                                    pStatus ||
                                                    EMPTY_VALUE;

                                                let statusColor = "#006ce6";
                                                let statusBg = "#e6f0ff";
                                                let statusBorder = "#b3d4ff";

                                                if (pStatus === "approved") {
                                                    statusColor = "#039855";
                                                    statusBg = "#ecfdf3";
                                                    statusBorder = "#a6f4c5";
                                                } else if (
                                                    pStatus === "pre_approved" ||
                                                    pStatus === "pending"
                                                ) {
                                                    statusColor = "#b05c0d";
                                                    statusBg = "#fef0c7";
                                                    statusBorder = "#fec84b";
                                                } else if (pStatus === "rejected") {
                                                    statusColor = "#d92d20";
                                                    statusBg = "#fef3f2";
                                                    statusBorder = "#fec3e6";
                                                }

                                                return (
                                                    <div
                                                        key={i}
                                                        className="report-table__row"
                                                        style={{
                                                            display: "flex",
                                                            padding: "16px",
                                                            borderBottom: "1px solid #f3f4f6",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 40,
                                                                flexShrink: 0,
                                                                fontSize: 13,
                                                                color: "#111827",
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {i + 1}
                                                        </div>
                                                        <div
                                                            style={{
                                                                width: 80,
                                                                flexShrink: 0,
                                                                fontSize: 13,
                                                                color: "#6b7280",
                                                            }}
                                                        >
                                                            {p.sku || p.product_sku || "—"}
                                                        </div>
                                                        <div
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 150,
                                                                fontSize: 13,
                                                                color: "#006ce6",
                                                                fontWeight: 500,
                                                                paddingRight: 16,
                                                            }}
                                                        >
                                                            {p.name || p.product_name || "—"}
                                                        </div>
                                                        <div
                                                            style={{
                                                                width: 80,
                                                                flexShrink: 0,
                                                                textAlign: "center",
                                                                fontSize: 13,
                                                                color: "#111827",
                                                            }}
                                                        >
                                                            {p.quantity ?? p.qty ?? 1}
                                                        </div>
                                                        <div
                                                            style={{
                                                                width: 140,
                                                                flexShrink: 0,
                                                                fontSize: 13,
                                                                color: "#6b7280",
                                                                paddingRight: 16,
                                                            }}
                                                        >
                                                            {p.category || p.category_name || "—"}
                                                        </div>
                                                        <div
                                                            style={{
                                                                width: 110,
                                                                flexShrink: 0,
                                                                textAlign: "center",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display: "inline-block",
                                                                    padding: "4px 10px",
                                                                    borderRadius: 16,
                                                                    border: `1px solid ${statusBorder}`,
                                                                    background: statusBg,
                                                                    color: statusColor,
                                                                    fontSize: 11,
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                {partStatusText}
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                width: 110,
                                                                flexShrink: 0,
                                                                textAlign: "right",
                                                                fontSize: 13,
                                                                color: "#111827",
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {formatNumber(getPartLineAmount(p))} đ
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            padding: "24px 16px",
                                            textAlign: "center",
                                            color: "#667085",
                                            background: "#fff",
                                            borderRadius: 12,
                                        }}
                                    >
                                        {EMPTY_VALUE}
                                    </div>
                                )}
                            </div>
                        </Box>
                    </>
                ) : null}
            </Sheet>
        </BodyPortal>
    );
};
