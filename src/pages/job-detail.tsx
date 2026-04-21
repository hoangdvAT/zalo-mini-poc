import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Page, Text, Button, Icon, useSnackbar } from "zmp-ui";
import { useNavigate } from "zmp-ui";
import { useAtom, useAtomValue } from "jotai";
import { Campaign } from "@/types/campaign";
import { fetchCampaignById, fetchContractsByCampaign } from "@/services/api";
import {
    resolveCtaModeFromCampaignListItem,
    campaignPayloadHasCtaHint,
    resolveContractCtaMode,
} from "@/utils/campaignUi";
import type { CampaignCardCtaMode } from "@/components/campaign/CampaignCard";
import { selectedCampaignAtom } from "@/state/job";
import { authTokenAtom, isGuestAtom } from "@/state/auth";
import { openExternalUrl } from "@/utils/openExternalUrl";
import iconStepChoose from "@/static/icons/step-choose.svg";
import iconStepShare from "@/static/icons/step-share.svg";
import iconStepEarn from "@/static/icons/step-earn.svg";
import iconCircleSparkle from "@/static/icons/circle-sparkle.svg";
import iconChevronRight from "@/static/icons/chevron-right-orange.svg";
import iconInternet from "@/static/icons/ic_internet.svg";
import iconTag from "@/static/icons/ic_tag.svg";
import iconCalendar from "@/static/icons/ic_calenda.svg";
import iconCashTime from "@/static/icons/ic_cash_time.svg";
import iconStatus from "@/static/icons/ic_status.svg";
import { LinkChainIcon } from "@/components/icons/LinkChainIcon";

/** Helper: device_type → label */
function getDeviceLabel(dt: number): string {
    switch (dt) {
        case 1: return "Máy tính";
        case 2: return "Điện thoại";
        case 3: return "Máy tính và điện thoại";
        default: return "Tất cả";
    }
}

/** Helper: status → label + color */
function getStatusBadge(s: number): { label: string; color: string; bg: string; border: string } {
    switch (s) {
        case 2: return { label: "Kích hoạt", color: "#027A48", bg: "#ECFDF3", border: "#A6F4C5" };
        case 1: return { label: "Chờ duyệt", color: "#B54708", bg: "#FFFAEB", border: "#FEDF89" };
        default: return { label: "Ngừng", color: "#B42318", bg: "#FEF3F2", border: "#FECDCA" };
    }
}

/** Helper: file extension → icon + label */
function getFileInfo(url: string): { icon: string; label: string; ext: string } {
    const name = url.split("/").pop() || url;
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["xlsx", "xls", "csv"].includes(ext)) return { icon: "📊", label: name, ext: ext.toUpperCase() };
    if (["html", "htm"].includes(ext)) return { icon: "🌐", label: "Landing Page", ext: "HTML" };
    if (["pdf"].includes(ext)) return { icon: "📄", label: name, ext: "PDF" };
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return { icon: "🖼️", label: name, ext: ext.toUpperCase() };
    return { icon: "📎", label: name, ext: ext.toUpperCase() };
}



const JobDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { openSnackbar } = useSnackbar();
    const [campaign, setCampaign] = useAtom(selectedCampaignAtom);
    const [loading, setLoading] = useState(true);
    const [token] = useAtom(authTokenAtom);
    const isGuest = useAtomValue(isGuestAtom);
    const [ctaMode, setCtaMode] = useState<CampaignCardCtaMode>("join");
    const [ctaLoading, setCtaLoading] = useState(false);
    const oneClickRef = useRef<HTMLDivElement>(null);
    const [showFooter, setShowFooter] = useState(false);

    useEffect(() => {
        const el = oneClickRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                /**
                 * Hiện thanh CTA cố định khi khối one-click **không** nằm trong viewport:
                 * - Đã cuộn xuống (khối lên trên) hoặc
                 * - Chưa cuộn tới (khối còn dưới màn hình — trước đây chỉ xử lý top < 0 nên mất cả nút).
                 */
                setShowFooter(!entry.isIntersecting);
            },
            { threshold: 0, rootMargin: "0px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [campaign]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetchCampaignById(id)
            .then((data) => { setCampaign(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id, setCampaign]);

    /** CTA giống list; nếu GET campaign/:id thiếu total/active/pending thì gọi 1 lần contracts/campaign. */
    useEffect(() => {
        if (!campaign || isGuest || !token) return;

        if (campaignPayloadHasCtaHint(campaign)) {
            setCtaMode(resolveCtaModeFromCampaignListItem(campaign));
            setCtaLoading(false);
            return;
        }

        setCtaLoading(true);
        fetchContractsByCampaign(campaign.id)
            .then((res) => {
                setCtaMode(resolveContractCtaMode(res.contract || []));
            })
            .catch(() => {
                setCtaMode(resolveCtaModeFromCampaignListItem(campaign));
            })
            .finally(() => setCtaLoading(false));
    }, [campaign, isGuest, token]);

    const handleMainAction = useCallback(() => {
        if (isGuest) {
            navigate(`/login?redirect=/job/${id}`);
            return;
        }
        if (ctaLoading || !campaign || !id) return;
        if (ctaMode === "pending" || ctaMode === "rejected") {
            if (ctaMode === "rejected") {
                openSnackbar({
                    type: "error",
                    text: "Hợp đồng đã bị nhãn hàng từ chối. Bạn không thể tạo link chiến dịch này.",
                    duration: 4000,
                });
            }
            return;
        }
        if (ctaMode === "join") {
            // TODO: Gọi api fetchJoinCampaign giống bên CampaignCard

            try {
                const raw = String((campaign as { url?: unknown }).url ?? "").trim();
                if (!raw) {
                    openSnackbar({
                        type: "warning",
                        text: "Không có liên kết tham gia. Bạn có thể chưa thuộc phân khúc publisher của chiến dịch — vui lòng liên hệ hỗ trợ.",
                        duration: 4500,
                    });
                    return;
                }
                openSnackbar({
                    type: "default",
                    text: "Đang mở trang tham gia chiến dịch…",
                    duration: 2000,
                });
                /** Tránh race snackbar + native bridge trong cùng một tick (một số máy crash). */
                window.setTimeout(() => {
                    void openExternalUrl(raw);
                }, 0);
            } catch (e) {
                console.error("[job-detail] Tham gia:", e);
                openSnackbar({
                    type: "error",
                    text: "Không thể mở liên kết. Vui lòng thử lại.",
                    duration: 3500,
                });
            }
            return;
        }
        if (ctaMode === "create-link") {
            navigate(`/get-link/${id}`);
        }
    }, [isGuest, navigate, id, ctaLoading, campaign, ctaMode, openSnackbar]);

    // ─── LOADING ─────────────────────────────────────
    if (loading) {
        return (
            <Page className="detail-page">
                <div className="detail-skeleton">
                    <div className="detail-skeleton__image shimmer" />
                    <div className="detail-skeleton__content">
                        <div className="detail-skeleton__line detail-skeleton__line--title shimmer" />
                        <div className="detail-skeleton__line detail-skeleton__line--desc shimmer" />
                        <div className="detail-skeleton__line detail-skeleton__line--desc shimmer" />
                    </div>
                </div>
            </Page>
        );
    }

    if (!campaign) {
        return (
            <Page className="detail-page">
                <div className="empty-state">
                    <div className="empty-state__icon">😔</div>
                    <Text size="normal" className="empty-state__text">Không tìm thấy chiến dịch</Text>
                    <Button size="medium" onClick={() => navigate("/")} style={{ marginTop: 16 }}>Quay lại trang chủ</Button>
                </div>
            </Page>
        );
    }

    // ─── DERIVED DATA ─────────────────────────────────
    const rate = parseFloat(campaign.max_commission_rate) || 0;
    const val = parseFloat(campaign.max_commission_value) || 0;
    const commissionDisplay = rate > 0 ? `${rate}%` : val > 0 ? `${val.toLocaleString('vi-VN')}đ` : "Liên hệ";
    const imageUrl = campaign.logo || "https://via.placeholder.com/375x200?text=No+Image";
    const statusBadge = getStatusBadge(campaign.status);
    const files = (campaign as any).files || [];

    // Tags
    const tags: { label: string; checked?: boolean }[] = [];
    if (campaign.type?.name) tags.push({ label: campaign.type.name });
    else if (campaign.type_name) tags.push({ label: campaign.type_name });
    if ((campaign as any).currencies?.length) tags.push({ label: (campaign as any).currencies[0].name });
    if ((campaign as any).areas?.length) tags.push({ label: (campaign as any).areas[0].name });
    if (campaign.categories?.length) {
        campaign.categories.forEach(cat => tags.push({ label: cat.name }));
    }
    if (campaign.has_deeplink === 1) tags.push({ label: "Deeplink", checked: true });
    if (campaign.reoccur === 1) tags.push({ label: "Reoccur", checked: true });
    if (campaign.click_type === 2) tags.push({ label: "Click cuối", checked: true });

    const ctaLabel = rate > 0 ? `${rate}%/sp` : val > 0 ? `${val.toLocaleString('vi-VN')}đ/sp` : "Liên hệ";

    /** Từ chối: vẫn hiện nút "Đã từ chối" (khác card list home — web ẩn CTA ở list). */
    const primaryCtaDisabled = !isGuest && (ctaLoading || ctaMode === "pending");
    const oneclickBtnClass =
        "jd-oneclick__btn" +
        (!isGuest && ctaMode === "pending" ? " jd-oneclick__btn--pending" : "") +
        (!isGuest && ctaMode === "rejected" ? " jd-oneclick__btn--rejected" : "") +
        (!isGuest && ctaMode === "join" ? " jd-oneclick__btn--outline" : "") +
        (!isGuest && ctaMode === "create-link" ? " jd-oneclick__btn--primary-blue" : "");
    const footerBtnClass =
        "detail-fixed-bottom__btn" +
        (!isGuest && ctaMode === "pending" ? " detail-fixed-bottom__btn--pending" : "") +
        (!isGuest && ctaMode === "rejected" ? " detail-fixed-bottom__btn--rejected" : "") +
        (!isGuest && ctaMode === "join" ? " detail-fixed-bottom__btn--outline" : "") +
        (!isGuest && ctaMode === "create-link" ? " detail-fixed-bottom__btn--primary-blue" : "");

    // ─── RENDER ───────────────────────────────────────
    return (
        <Page className="detail-page" hideScrollbar>
            {ctaLoading && (
                <div className="jd-loading-overlay">
                    <div className="jd-loading-spinner" />
                    <span>Đang tải trạng thái...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* ─── STICKY TITLE HEADER ─── */}
            <div className="jd-header">
                <div className="jd-header__back" onClick={() => navigate(-1)}>
                    <Icon icon="zi-arrow-left" size={24} />
                </div>
                <div className="jd-header__info">
                    <Text.Title size="normal" className="jd-header__name">
                        Chi tiết chiến dịch
                    </Text.Title>
                </div>
            </div>

            {/* ─── SCROLLABLE BODY ─── */}
            <div className="jd-body">

                {/* 1. Hero image */}
                <div className="jd-hero">
                    <img src={imageUrl} alt={campaign.name} className="jd-hero__img" />
                </div>

                {/* 2. Campaign name + commission */}
                <div className="jd-hero-info">
                    <p className="jd-hero-info__name">{campaign.name}</p>
                    <p className="jd-hero-info__commission">
                        Hoa hồng lên đến: <span>{commissionDisplay}/sp</span>
                    </p>
                </div>

                {/* 3. "Nhận hoa hồng chỉ với 1 Click" card */}
                <div className="jd-oneclick" ref={oneClickRef}>
                    <div className="jd-oneclick__header">
                        <img src={iconCircleSparkle} alt="" width={20} height={20} />
                        <span className="jd-oneclick__title">Nhận hoa hồng chỉ với 1 Click</span>
                    </div>
                    <div className="jd-oneclick__steps">
                        <div className="jd-oneclick__step">
                            <div className="jd-oneclick__step-icon"><img src={iconStepChoose} alt="" width={24} height={24} /></div>
                            <span className="jd-oneclick__step-label">Chọn chiến dịch</span>
                        </div>
                        <span className="jd-oneclick__arrow"><img src={iconChevronRight} alt="" width={16} height={16} /></span>
                        <div className="jd-oneclick__step">
                            <div className="jd-oneclick__step-icon"><img src={iconStepShare} alt="" width={24} height={24} /></div>
                            <span className="jd-oneclick__step-label">Chia sẻ link</span>
                        </div>
                        <span className="jd-oneclick__arrow"><img src={iconChevronRight} alt="" width={16} height={16} /></span>
                        <div className="jd-oneclick__step">
                            <div className="jd-oneclick__step-icon"><img src={iconStepEarn} alt="" width={24} height={24} /></div>
                            <span className="jd-oneclick__step-label">Nhận hoa hồng</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={oneclickBtnClass}
                        onClick={handleMainAction}
                        disabled={primaryCtaDisabled}
                    >
                        {isGuest ? (
                            "Đăng nhập để tạo link"
                        ) : ctaLoading ? (
                            "Đang tải..."
                        ) : ctaMode === "pending" ? (
                            "Chờ phản hồi"
                        ) : ctaMode === "rejected" ? (
                            "Đã từ chối"
                        ) : ctaMode === "join" ? (
                            "Tham gia"
                        ) : ctaMode === "create-link" ? (
                            <>
                                <LinkChainIcon size={18} />
                                <span>Tạo link ({ctaLabel})</span>
                            </>
                        ) : (
                            "Tham gia"
                        )}
                    </button>
                </div>

                {/* 4. Stats grid */}
                <div className="jd-stats-grid">
                    <div className="jd-stat-card">
                        <div className="jd-stat-card__label">EPC:</div>
                        <div className="jd-stat-card__value">{(campaign as any).epc30 || 0}</div>
                    </div>
                    <div className="jd-stat-card">
                        <div className="jd-stat-card__label">CVR:</div>
                        <div className="jd-stat-card__value">{(campaign as any).cvr30 || 0}%</div>
                    </div>
                    <div className="jd-stat-card">
                        <div className="jd-stat-card__label">Hoa hồng:</div>
                        <div className="jd-stat-card__value">{commissionDisplay}</div>
                    </div>
                    <div className="jd-stat-card">
                        <div className="jd-stat-card__label">Cookies:</div>
                        <div className="jd-stat-card__value">{(campaign as any).cookie_duration ? `${(campaign as any).cookie_duration} ngày` : "7 ngày"}</div>
                    </div>
                </div>

                {/* 5. Tags */}
                {tags.length > 0 && (
                    <div className="jd-tags">
                        {tags.map((t, i) => (
                            <span key={i} className={`jd-tag ${t.checked ? "jd-tag--checked" : ""}`}>
                                {t.checked && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 3 }}>
                                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                {t.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* 6. Description */}
                {campaign.description ? (
                    <div className="jd-description" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                ) : (
                    <div className="jd-description jd-description--placeholder">
                        <span>{"{Nội dung khác}"}</span>
                    </div>
                )}

                {/* 7. Meta rows */}
                <div className="jd-meta-list">
                    <div className="jd-meta-row">
                        <span className="jd-meta-row__icon"><img src={iconInternet} alt="" width={18} height={18} /></span>
                        <span className="jd-meta-row__label">Trang mạng:</span>
                        <a className="jd-meta-row__value jd-meta-row__value--link" href={campaign.url} target="_blank" rel="noreferrer">
                            {campaign.url}
                        </a>
                    </div>
                    <div className="jd-meta-row">
                        <span className="jd-meta-row__icon"><img src={iconTag} alt="" width={18} height={18} /></span>
                        <span className="jd-meta-row__label">Campaign code:</span>
                        <span className="jd-meta-row__value">{campaign.code}</span>
                    </div>
                    <div className="jd-meta-row">
                        <span className="jd-meta-row__icon"><img src={iconCalendar} alt="" width={18} height={18} /></span>
                        <span className="jd-meta-row__label">Ngày bắt đầu:</span>
                        <span className="jd-meta-row__value">
                            {campaign.started_at ? new Date(campaign.started_at).toLocaleDateString("vi-VN") : "—"}
                        </span>
                    </div>
                    <div className="jd-meta-row">
                        <span className="jd-meta-row__icon"><img src={iconCalendar} alt="" width={18} height={18} /></span>
                        <span className="jd-meta-row__label">Ngày kết thúc:</span>
                        <span className="jd-meta-row__value">
                            {campaign.ended_at ? new Date(campaign.ended_at).toLocaleDateString("vi-VN") : "—"}
                        </span>
                    </div>
                    <div className="jd-meta-row">
                        <span className="jd-meta-row__icon"><img src={iconCashTime} alt="" width={18} height={18} /></span>
                        <span className="jd-meta-row__label">Thanh toán trung bình:</span>
                        <span className="jd-meta-row__value">
                            {(campaign as any).payment_duration ? `${(campaign as any).payment_duration} ngày` : "—"}
                        </span>
                    </div>
                    <div className="jd-meta-row">
                        <span className="jd-meta-row__icon"><img src={iconStatus} alt="" width={18} height={18} /></span>
                        <span className="jd-meta-row__label">Trạng thái:</span>
                        <span className="jd-meta-row__value">
                            <span className="jd-status-pill" style={{ color: statusBadge.color, background: statusBadge.bg, borderColor: statusBadge.border }}>
                                <span className="jd-status-pill__dot" style={{ background: statusBadge.color }} />
                                {statusBadge.label}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Bottom spacer for fixed bar */}
                <div style={{ height: 80 }} />
            </div>

            {/* ─── BOTTOM FIXED BAR ─── */}
            <div className={`detail-fixed-bottom ${showFooter ? "is-visible" : ""}`}>
                <button
                    type="button"
                    className={footerBtnClass}
                    onClick={handleMainAction}
                    disabled={primaryCtaDisabled}
                >
                    {isGuest ? (
                        "Đăng nhập để tạo link"
                    ) : ctaLoading ? (
                        "Đang tải..."
                    ) : ctaMode === "pending" ? (
                        "Chờ phản hồi"
                    ) : ctaMode === "rejected" ? (
                        "Đã từ chối"
                    ) : ctaMode === "join" ? (
                        "Tham gia"
                    ) : ctaMode === "create-link" ? (
                        <>
                            <LinkChainIcon size={20} />
                            {`Tạo link (${ctaLabel})`}
                        </>
                    ) : (
                        "Tham gia"
                    )}
                </button>
            </div>
        </Page>
    );
};

export default JobDetailPage;
