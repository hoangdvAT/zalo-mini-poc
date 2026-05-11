import React, { useCallback, useState } from "react";
import { Text, useNavigate, useSnackbar, Modal, Button } from "zmp-ui";
import { LinkChainIcon } from "@/components/icons/LinkChainIcon";
import { fetchJoinCampaign } from "@/services/api";
import { applyJoinCampaignResponse } from "@/utils/joinCampaignFlow";
import iconShare from "@/static/icons/share-06.svg";

export type CampaignCardCtaMode = "join" | "pending" | "create-link" | "rejected";

const ClockWaitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export interface CampaignCardProps {
  id: string;
  imageUrl: string;
  title: string;
  /** Badge góc ảnh (CPL / CPO / …) */
  typeBadge: string;
  /** Phần hiển thị sau "Hoa hồng" — ví dụ 1.230.009 đ hoặc 12% */
  commissionDisplay: string;
  variant?: "default" | "home";
  isGuest?: boolean;
  dateRange?: string;
  /** Khi đã đăng nhập: join / chờ duyệt / tạo link */
  ctaMode: CampaignCardCtaMode;
  /** Khi đã tham gia & đang gọi API contract */
  contractsLoading?: boolean;
  onCardClick?: () => void;
  /** Sau join thành công — reload list (giống `getCampaigns` trên portal web). */
  onJoinSuccess?: () => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  id,
  imageUrl,
  title,
  typeBadge,
  commissionDisplay,
  variant = "default",
  isGuest,
  dateRange,
  ctaMode,
  contractsLoading,
  onCardClick,
  onJoinSuccess,
}) => {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [adSpaceModal, setAdSpaceModal] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onCardClick?.();
    },
    [onCardClick]
  );

  const handleCta = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (contractsLoading || joinSubmitting) return;
      if (isGuest) {
        navigate(`/login?redirect=/job/${id}`);
        return;
      }
      if (ctaMode === "join") {
        setJoinSubmitting(true);
        try {
          const res = await fetchJoinCampaign({ campaign_id: id });
          await applyJoinCampaignResponse(res, {
            openSnackbar: ({ type, text, duration }) =>
              openSnackbar({ type, text, duration: duration ?? 3500 }),
            navigate,
            onSuccess: onJoinSuccess,
            onNeedAdSpace: (message) => setAdSpaceModal({ open: true, message }),
          });
        } catch {
          openSnackbar({
            type: "error",
            text: "Có lỗi xảy ra. Vui lòng thử lại.",
            duration: 3500,
          });
        } finally {
          setJoinSubmitting(false);
        }
        return;
      }
      if (ctaMode === "create-link") {
        navigate(`/get-link/${id}`);
      }
    },
    [
      contractsLoading,
      joinSubmitting,
      id,
      isGuest,
      ctaMode,
      navigate,
      openSnackbar,
      onJoinSuccess,
    ]
  );

  const ctaBusy = Boolean(contractsLoading || joinSubmitting);
  const useHomeShareCta = variant === "home" && (isGuest || ctaMode === "create-link");

  return (
    <>
    <div
      className={["campaign-card", variant === "home" ? "campaign-card--home" : ""].filter(Boolean).join(" ")}
      onClick={onCardClick ? handleCardClick : undefined}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick();
              }
            }
          : undefined
      }
    >
      <div className="campaign-card__image-wrapper">
        <img src={imageUrl} alt={title} className="campaign-card__image" loading="lazy" />
        {typeBadge && variant !== "home" ? (
          <div className="campaign-card__type-badge">
            <span>{typeBadge}</span>
          </div>
        ) : null}
      </div>
      <div className="campaign-card__info">
        <Text size="normal" className="campaign-card__name">
          {title}
        </Text>
        {dateRange ? (
          <div className="campaign-card__date-row">
            <span className="campaign-card__date-icon" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="campaign-card__date-text">{dateRange}</span>
          </div>
        ) : null}
        {commissionDisplay ? (
          variant === "home" ? (
            <div className="campaign-card__commission-home">
              <span className="campaign-card__commission-home-label">Hoa hồng tối đa</span>
              <span className="campaign-card__commission-home-value">{commissionDisplay}</span>
            </div>
          ) : (
            <div className="campaign-card__hoa-hong-row">
              <span className="campaign-card__hoa-hong-label">Hoa hồng</span>
              <span className="campaign-card__hoa-hong-value">{commissionDisplay}</span>
            </div>
          )
        ) : null}
        {/* Web: rejected — không render CTA trên card list; chi tiết xem `job-detail`. */}
        {useHomeShareCta ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--home" onClick={handleCta}>
            <img src={iconShare} alt="" width={18} height={18} />
            <span>{`Chia sẻ nhận ${commissionDisplay}`}</span>
          </button>
        ) : isGuest ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--outline" onClick={handleCta}>
            <PlusIcon />
            <span>Tham gia</span>
          </button>
        ) : ctaBusy ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--loading" disabled>
            <span className="campaign-card__btn-cta-spinner" />
            <span>{joinSubmitting ? "Đang xử lý..." : "Đang tải..."}</span>
          </button>
        ) : ctaMode === "pending" ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--pending" disabled>
            <ClockWaitIcon />
            <span>Chờ phản hồi</span>
          </button>
        ) : ctaMode === "rejected" ? null : ctaMode === "create-link" ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--primary-blue" onClick={handleCta}>
            <LinkChainIcon />
            <span>Tạo link</span>
          </button>
        ) : (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--outline" onClick={handleCta}>
            <PlusIcon />
            <span>Tham gia</span>
          </button>
        )}
      </div>
    </div>
    <Modal
      visible={adSpaceModal.open}
      title="Thông báo"
      onClose={() => setAdSpaceModal({ open: false, message: "" })}
    >
      <div style={{ padding: "8px 0 16px" }}>
        <Text size="normal" style={{ marginBottom: 20, lineHeight: 1.5 }}>
          {adSpaceModal.message}
        </Text>
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setAdSpaceModal({ open: false, message: "" })}
          >
            Đóng
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setAdSpaceModal({ open: false, message: "" });
              navigate("/profile");
            }}
          >
            Đến Hồ sơ
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default React.memo(CampaignCard);
