import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Page, Text, Button, Input, Sheet, Box, Icon } from "zmp-ui";
import { useNavigate } from "zmp-ui";
import { useAtom } from "jotai";
import { useAtomValue } from "jotai";

import {
    fetchCampaignById,
    createTrackingLink,
    fetchContractsByCampaign,
    fetchAdSpacesByCampaignId,
    fetchPublisherProfile,
} from "@/services/api";
import { pickPrimaryContract, isContractApprovedForLink, isContractRejected } from "@/utils/campaignUi";
import { Campaign, Contract, DeepLinkResponse, AdSpaceItem } from "@/types/campaign";
import { selectedCampaignAtom, trackingLinksAtom, loadingLinkAtom, adSpaceCodeAtom } from "@/state/job";
import { authTokenAtom, isGuestAtom } from "@/state/auth";
import { shareSheetStateAtom } from "@/state/share";
import { ensureHttpUrl } from "@/utils/format";
import { openExternalUrl } from "@/utils/openExternalUrl";
import type { PublisherProfile } from "@/types/auth";
import { LinkChainIcon } from "@/components/icons/LinkChainIcon";
import { CopyIcon } from "@/components/icons/CopyIcon";
import { BodyPortal, BODY_OVERLAY_Z_INDEX } from "@/components/base";

/**
 * Chọn ad space giống portal deep-link-form: ưu tiên bản có contract khớp campaign_id.
 */
function getCommissionDisplay(camp: Campaign): string {
    const rate = parseFloat(camp.max_commission_rate) || 0;
    const value = parseFloat(camp.max_commission_value) || 0;
    return rate > 0 ? `${rate}%` : value > 0 ? `${value.toLocaleString("vi-VN")}đ` : "Liên hệ";
}

function pickAdSpaceCodeForCampaign(
    adSpaces: AdSpaceItem[], campaignId: number, fallbackProfileCode: string | null): string |
    null
     {
    for (const a of adSpaces) {
        const contracts = a.contracts;
        if (contracts?.some((c) => Number(c.campaign_id) === campaignId)) {
            return a.code || null;
        }
    }
    if (adSpaces[0]?.code) return adSpaces[0].code;
    const f = fallbackProfileCode?.trim();
    return f || null;
}

const GetLinkPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useAtom(selectedCampaignAtom);
    const [trackingLinks, setTrackingLinks] = useAtom(trackingLinksAtom);
    const [loadingLink, setLoadingLink] = useAtom(loadingLinkAtom);
    // const profileAdSpaceCode = useAtomValue(adSpaceCodeAtom);
    const [inputUrl, setInputUrl] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loadingCampaign, setLoadingCampaign] = useState(false);
    const [token] = useAtom(authTokenAtom);
    const isGuest = useAtomValue(isGuestAtom);
    const [, setShareState] = useAtom(shareSheetStateAtom);

    // const [contracts, setContracts] = useState<Contract[]>([]);
    const [adSpaces, setAdSpaces] = useState<AdSpaceItem[]>([]);
    const [domainDeeplink, setDomainDeeplink] = useState<string>("");
    // const [publisherProfile, setPublisherProfile] = useState<PublisherProfile | null>(null);
    const [loadingContext, setLoadingContext] = useState(false);
    // const [contractError, setContractError] = useState<string | null>(null);
    const [adSpaceError, setAdSpaceError] = useState<string | null>(null);
    const [adSpaceSheetVisible, setAdSpaceSheetVisible] = useState(false);
    const [draftAdSpaceCode, setDraftAdSpaceCode] = useState("");
    const [selectedAdSpaceCode, setSelectedAdSpaceCode] = useState("");
    const [isShortLink, setIsShortLink] = useState(false);
    const [isQrCode, setIsQrCode] = useState(false);
    const [utmSourceInput, setUtmSourceInput] = useState("");
    const [utmCampaignInput, setUtmCampaignInput] = useState("");
    const [utmContentInput, setUtmContentInput] = useState("");
    const [utmMediumInput, setUtmMediumInput] = useState("");
    const [utmTermInput, setUtmTermInput] = useState("");
    const [subInputs, setSubInputs] = useState<string[]>([""]);

    useEffect(() => {
        if (!campaign || String(campaign.id) !== String(id)) {
            if (!id) return;
            setLoadingCampaign(true);
            fetchCampaignById(id)
                .then((data) => {
                    setCampaign(data);
                    setLoadingCampaign(false);
                })
                .catch(() => {
                    setLoadingCampaign(false);
                });
        }
    }, [id, campaign, setCampaign]);

    useEffect(() => {
        if (!id || !token) return;

        setLoadingContext(true);
        // setContractError(null);
        setAdSpaceError(null);

        Promise.all([
            // fetchContractsByCampaign(id),
            fetchAdSpacesByCampaignId(id),
            // fetchPublisherProfile(),
        ])
            .then(([
                // contractRes,
                adRes,
                // pub
            ]) => {
                // setContracts(contractRes.contract || []);
                setDomainDeeplink(adRes.meta?.domain_deeplink || "");
                setAdSpaces(adRes.adSpaces || []);
                // setPublisherProfile(pub);
                // if (!contractRes.contract?.length) {
                //     setContractError("Bạn chưa tham gia chiến dịch này. Vui lòng đăng ký hợp đồng trước.");
                // }
                // const hasPubCode = !!pub?.ad_space_code?.trim();
                const hasAdSpaces = (adRes.adSpaces?.length ?? 0) > 0;
                if (
                    !hasAdSpaces
                    // && !hasPubCode
                ) {
                    setAdSpaceError("Không tìm thấy ad space cho chiến dịch. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.");
                } else {
                    setAdSpaceError(null);
                }
            })
            .catch((err) => {
                console.error("[GetLink] load context:", err);
                // setContractError("Không thể tải thông tin hợp đồng.");
            })
            .finally(() => setLoadingContext(false));
    }, [id, token]);

    useEffect(() => {
        if (campaign?.url && !inputUrl) {
            setInputUrl(campaign.url);
        }
    }, [campaign, inputUrl]);

    // const primaryContract = useMemo(() => pickPrimaryContract(contracts), [contracts]);

    const resolvedAdSpaceCode = useMemo(() => {
        if (!campaign) return null;
        // const fallback = publisherProfile?.ad_space_code?.trim() || profileAdSpaceCode?.trim() || null;
        return pickAdSpaceCodeForCampaign(
            adSpaces, Number(campaign.id),
            // fallback
            null
        );
    }, [
        campaign,
        adSpaces,
        // publisherProfile?.ad_space_code,
        // profileAdSpaceCode
    ]);

    useEffect(() => {
        if (!selectedAdSpaceCode && resolvedAdSpaceCode) {
            setSelectedAdSpaceCode(resolvedAdSpaceCode);
        }
    }, [selectedAdSpaceCode, resolvedAdSpaceCode]);

    useEffect(() => {
        if (!adSpaceSheetVisible) return;
        setDraftAdSpaceCode(selectedAdSpaceCode || resolvedAdSpaceCode || "");
    }, [adSpaceSheetVisible, selectedAdSpaceCode, resolvedAdSpaceCode]);

    const effectiveAdSpaceCode = selectedAdSpaceCode || resolvedAdSpaceCode || null;

    const canCreateLink = useMemo(() => {
        // if (!primaryContract || !isContractApprovedForLink(primaryContract)) return false;
        if (!effectiveAdSpaceCode) return false;
        return true;
    }, [
        // primaryContract,
        effectiveAdSpaceCode,
    ]);

    const handleCreateLink = useCallback(async () => {
        if (!id || loadingLink) return;

        const normalizedSubs = [...subInputs.slice(0, 5)];
        while (normalizedSubs.length < 5) normalizedSubs.push("");

        setLoadingLink(true);
        try {
            const result = await createTrackingLink(Number(id), {
                ad_space_code: effectiveAdSpaceCode || undefined,
                redirect_url: inputUrl.trim() || undefined,
                is_short_link: isShortLink,
                is_qr_code: isQrCode,
                utm_source: utmSourceInput.trim(),
                utm_campaign: utmCampaignInput.trim(),
                utm_content: utmContentInput.trim(),
                utm_medium: utmMediumInput.trim(),
                utm_term: utmTermInput.trim(),
                sub: normalizedSubs[0] || "",
                sub_1: normalizedSubs[1] || "",
                sub_2: normalizedSubs[2] || "",
                sub_3: normalizedSubs[3] || "",
                sub_4: normalizedSubs[4] || "",
            });
            setTrackingLinks((prev) => [result, ...prev]);
        } catch (err) {
            console.error("Lỗi tạo link:", err);
            alert("Tạo link thất bại. Vui lòng thử lại.");
        } finally {
            setLoadingLink(false);
        }
    }, [
        id,
        setLoadingLink,
        setTrackingLinks,
        effectiveAdSpaceCode,
        inputUrl,
        isShortLink,
        isQrCode,
        utmSourceInput,
        utmCampaignInput,
        utmContentInput,
        utmMediumInput,
        utmTermInput,
        subInputs,
    ]);

    const handleOpenLink = useCallback(
        async (link: DeepLinkResponse) => {
            const raw = link.short_link || link.deeplink || inputUrl;
            const urlToOpen = ensureHttpUrl(raw || "");
            if (!urlToOpen) return;
            await openExternalUrl(urlToOpen);
        },
        [inputUrl]
    );

    const handleShareLink = useCallback(
        (link: DeepLinkResponse) => {
            const raw = link.short_link || link.deeplink || inputUrl;
            const shareUrl = ensureHttpUrl(raw || "");
            const commission = campaign ? getCommissionDisplay(campaign) : "";
            const content = campaign
                ? `Tham gia ${campaign.name}${commission && commission !== "Liên hệ" ? ` — Hoa hồng ${commission}` : ""}`
                : "Chia sẻ link affiliate";
            setShareState({
                visible: true,
                campaignId: String(campaign?.id ?? id ?? ""),
                campaignName: campaign?.name,
                campaignLogo: campaign?.logo || "",
                campaignPath: id ? `/job/${id}` : "/",
                shareContent: content,
                shareUrl,
            });
        },
        [campaign, id, inputUrl, setShareState]
    );

    const handleCopy = useCallback(
        async (link: DeepLinkResponse) => {
            const textToCopy = link.short_link || link.deeplink || inputUrl;
            try {
                await navigator.clipboard.writeText(textToCopy);
                setCopiedId(link.short_link || link.deeplink);
                setTimeout(() => setCopiedId(null), 2000);
            } catch {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                setCopiedId(link.short_link || link.deeplink);
                setTimeout(() => setCopiedId(null), 2000);
            }
        },
        [inputUrl]
    );

    if (loadingCampaign) {
        return (
            <Page className="getlink-page">
                <div className="detail-skeleton">
                    <div className="detail-skeleton__content">
                        <div className="detail-skeleton__line detail-skeleton__line--title shimmer" />
                        <div className="detail-skeleton__line detail-skeleton__line--desc shimmer" />
                    </div>
                </div>
            </Page>
        );
    }

    /** Không `disabled` theo `loadingLink` — để nút vẫn hiện spinner khi đang tạo (tránh nút “chết” im lặng). */
    const btnDisabled =
        !inputUrl?.trim()
        || loadingContext
        || !canCreateLink
        // || !!contractError;

    return (
        <Page className="getlink-page" hideScrollbar>
            <div className="getlink-header">
                <div className="getlink-header__back" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </div>
                <Text.Title size="normal" className="getlink-header__title">
                    Lấy link kiếm tiền
                </Text.Title>
                <div style={{ width: 24 }} />
            </div>

            {isGuest ? (
                <div style={{ padding: "32px 16px", textAlign: "center", marginTop: 40 }}>
                    <Text size="normal" style={{ marginBottom: 16 }}>
                        Vui lòng đăng nhập để lấy link affiliate
                    </Text>
                    <Button onClick={() => navigate("/login")}>Đăng nhập ngay</Button>
                </div>
            ) : (
                <>
                    {campaign && (
                        <div className="getlink-job-info">
                            <img
                                src={campaign.logo || "https://via.placeholder.com/100?text=Campaign"}
                                alt={campaign.name}
                                className="getlink-job-info__image"
                            />
                            <div className="getlink-job-info__content">
                                <Text size="small" bold className="getlink-job-info__name">
                                    {campaign.name}
                                </Text>
                                <Text size="xSmall" className="getlink-job-info__commission">
                                    Hoa hồng: {getCommissionDisplay(campaign)}
                                </Text>
                            </div>
                        </div>
                    )}

                    <div className="getlink-form">
                        <Text.Title size="small" className="getlink-form__title">
                            Chọn không gian quảng cáo
                        </Text.Title>
                        <div className="getlink-form__input-group">
                            <button
                                type="button"
                                className="getlink-adspace-trigger"
                                style={{
                                    width: "100%",
                                    justifyContent: "space-between",
                                    minHeight: 44,
                                    borderRadius: 10,
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                }}
                                onClick={() => setAdSpaceSheetVisible(true)}
                            >
                                <span className="getlink-adspace-trigger__text" style={{ color: effectiveAdSpaceCode ? "#111827" : "#98a2b3" }}>
                                    {effectiveAdSpaceCode || "Chọn ad space"}
                                </span>
                                <Icon icon="zi-chevron-down" size={16} />
                            </button>
                        </div>
                        
                        <Text.Title size="small" className="getlink-form__title">
                            Nhập link sản phẩm
                        </Text.Title>
                        <Text size="xSmall" className="getlink-form__desc">
                            URL đích (redirect) — giống ô &quot;redirect_url&quot; trên web publisher portal.
                        </Text>
                        <div className="getlink-form__input-group">
                            <Input
                                type="text"
                                placeholder="https://..."
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                className="getlink-form__input"
                            />
                        </div>
                        <div className="getlink-form__input-group" style={{ display: "grid", gap: 8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#374151", fontSize: 14 }}>
                                <input
                                    type="checkbox"
                                    checked={isShortLink}
                                    onChange={(e) => setIsShortLink(e.target.checked)}
                                />
                                Tạo link rút gọn
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#374151", fontSize: 14 }}>
                                <input
                                    type="checkbox"
                                    checked={isQrCode}
                                    onChange={(e) => setIsQrCode(e.target.checked)}
                                />
                                Tạo link thành mã QR
                            </label>
                        </div>

                        <Text.Title size="small" className="getlink-form__title">Thông tin UTM</Text.Title>
                        <div className="getlink-form__input-group">
                            <Input placeholder="Utm Source" value={utmSourceInput} onChange={(e) => setUtmSourceInput(e.target.value)} />
                        </div>
                        <div className="getlink-form__input-group">
                            <Input placeholder="Utm Campaign" value={utmCampaignInput} onChange={(e) => setUtmCampaignInput(e.target.value)} />
                        </div>
                        <div className="getlink-form__input-group">
                            <Input placeholder="Utm Content" value={utmContentInput} onChange={(e) => setUtmContentInput(e.target.value)} />
                        </div>
                        <div className="getlink-form__input-group">
                            <Input placeholder="Utm Medium" value={utmMediumInput} onChange={(e) => setUtmMediumInput(e.target.value)} />
                        </div>
                        <div className="getlink-form__input-group">
                            <Input placeholder="Utm Term" value={utmTermInput} onChange={(e) => setUtmTermInput(e.target.value)} />
                        </div>

                        <Text.Title size="small" className="getlink-form__title">Sub tracking</Text.Title>
                        {subInputs.map((subValue, idx) => (
                            <div
                                key={`sub-input-${idx}`}
                                className="getlink-form__input-group"
                                style={{ display: "flex", alignItems: "center", gap: 8 }}
                            >
                                <Input
                                    placeholder={idx === 0 ? "Sub" : `Sub${idx}`}
                                    value={subValue}
                                    onChange={(e) => {
                                        const next = [...subInputs];
                                        next[idx] = e.target.value;
                                        setSubInputs(next);
                                    }}
                                />
                                {subInputs.length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = subInputs.filter((_, i) => i !== idx);
                                            setSubInputs(next.length ? next : [""]);
                                        }}
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            border: "1px solid #fecaca",
                                            background: "#fff1f2",
                                            color: "#be123c",
                                            fontSize: 20,
                                            lineHeight: 1,
                                        }}
                                        aria-label={`Xóa trường sub ${idx}`}
                                    >
                                        -
                                    </button>
                                ) : null}
                            </div>
                        ))}
                        {subInputs.length < 5 ? (
                            <div className="getlink-form__input-group">
                                <button
                                    type="button"
                                    onClick={() => setSubInputs((prev) => (prev.length >= 5 ? prev : [...prev, ""]))}
                                    style={{
                                        width: "100%",
                                        height: 38,
                                        borderRadius: 10,
                                        border: "1px dashed #93c5fd",
                                        background: "#eff6ff",
                                        color: "#1d4ed8",
                                        fontWeight: 600,
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        ) : null}

                        {domainDeeplink ? (
                            <Text size="xxSmall" style={{ color: "#667085", marginBottom: 8 }}>
                                Domain deeplink: {domainDeeplink}
                            </Text>
                        ) : null}

                        <Button
                            className="getlink-form__button getlink-form__button--with-icon"
                            variant="primary"
                            size="large"
                            fullWidth
                            loading={loadingContext || loadingLink}
                            disabled={btnDisabled}
                            onClick={handleCreateLink}
                        >
                            {loadingContext ? (
                                "Đang tải ad space & hợp đồng..."
                            ) : loadingLink ? (
                                "Đang tạo link..."
                            ) : (
                                <span className="getlink-form__button-inner">
                                    <LinkChainIcon size={20} />
                                    <span>Tạo link affiliate</span>
                                </span>
                            )}
                        </Button>
                        {/* {contractError && (
                            <Text size="xSmall" style={{ color: "var(--danger)", marginTop: 8, textAlign: "center" }}>
                                {contractError}
                            </Text>
                        )} */}
                        {adSpaceError && (
                            <Text size="xSmall" style={{ color: "var(--danger)", marginTop: 8, textAlign: "center" }}>
                                {adSpaceError}
                            </Text>
                        )}
                        {/* {!loadingContext && contracts.length > 0 && primaryContract && isContractRejected(primaryContract) && (
                            <Text size="xSmall" style={{ color: "var(--danger)", marginTop: 8, textAlign: "center" }}>
                                Hợp đồng đã bị nhãn hàng từ chối — không thể tạo link.
                            </Text>
                        )}
                        {!loadingContext && contracts.length > 0 && primaryContract && !isContractApprovedForLink(primaryContract) && !isContractRejected(primaryContract) && (
                            <Text size="xSmall" style={{ color: "var(--danger)", marginTop: 8, textAlign: "center" }}>
                                Hợp đồng chưa đủ điều kiện tạo link (chờ duyệt / kích hoạt).
                            </Text>
                        )} */}
                    </div>

                    {trackingLinks.length > 0 && (
                        <div className="getlink-history">
                            <Text.Title size="small" className="getlink-history__title">
                                Link đã tạo ({trackingLinks.length})
                            </Text.Title>
                            <div className="getlink-history__list">
                                {trackingLinks.map((link, idx) => (
                                    <div key={link.short_link || `link-${idx}`} className="getlink-link-card">
                                        <div className="getlink-link-card__info">
                                            <Text size="xxSmall" className="getlink-link-card__campaign">
                                                {campaign?.name || "Chiến dịch"}
                                            </Text>
                                            <Text size="xSmall" bold className="getlink-link-card__url">
                                                {link.short_link || link.deeplink || "Không có link"}
                                            </Text>
                                            <Text size="xxSmall" className="getlink-link-card__date">
                                                {new Date().toLocaleString("vi-VN")}
                                            </Text>
                                        </div>
                                        <div className="getlink-link-card__actions">
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="secondary"
                                                onClick={() => void handleOpenLink(link)}
                                                style={{ height: "40px", padding: "0 12px" }}
                                            >
                                                Mở link
                                            </Button>
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="primary"
                                                onClick={() => handleShareLink(link)}
                                                style={{ height: "40px", padding: "0 12px" }}
                                            >
                                                Chia sẻ
                                            </Button>
                                            <button
                                                type="button"
                                                className={`getlink-link-card__copy ${
                                                    copiedId === (link.short_link || link.deeplink) ? "getlink-link-card__copy--copied" : ""
                                                }`}
                                                onClick={() => handleCopy(link)}
                                                aria-label="Sao chép link"
                                            >
                                                <CopyIcon
                                                    size={20}
                                                    copied={copiedId === (link.short_link || link.deeplink)}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
            <BodyPortal>
                <Sheet
                    visible={adSpaceSheetVisible}
                    onClose={() => setAdSpaceSheetVisible(false)}
                    autoHeight
                    zIndex={BODY_OVERLAY_Z_INDEX}
                >
                    <div className="filter-sheet-header">
                        <Text.Title className="filter-sheet-header__title">Chọn ad space</Text.Title>
                        <div onClick={() => setAdSpaceSheetVisible(false)}>
                            <Icon icon="zi-close" />
                        </div>
                    </div>
                    <Box className="filter-sheet-content" p={4} pb={6}>
                        {adSpaces.length === 0 ? (
                            <div className="filter-option">Không có ad space khả dụng</div>
                        ) : (
                            adSpaces.map((item) => (
                                <div
                                    key={item.id}
                                    className={`filter-option filter-option--pick ${draftAdSpaceCode === item.code ? "filter-option--active" : ""}`}
                                    onClick={() => setDraftAdSpaceCode(item.code)}
                                >
                                    <span>{item.code}</span>
                                    {draftAdSpaceCode === item.code ? (
                                        <Icon icon="zi-check" size={18} style={{ color: "var(--zaui-light-color-primary, #006af5)" }} />
                                    ) : null}
                                </div>
                            ))
                        )}
                        <Button
                            fullWidth
                            style={{ marginTop: 24 }}
                            onClick={() => {
                                setSelectedAdSpaceCode(draftAdSpaceCode);
                                setAdSpaceSheetVisible(false);
                            }}
                        >
                            Áp dụng
                        </Button>
                    </Box>
                </Sheet>
            </BodyPortal>
        </Page>
    );
};

export default GetLinkPage;
