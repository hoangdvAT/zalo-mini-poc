import React, { useCallback } from "react";
import { Text, useNavigate } from "zmp-ui";
import { LinkChainIcon } from "@/components/icons/LinkChainIcon";

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
  isGuest?: boolean;
  dateRange?: string;
  /** Khi đã đăng nhập: join / chờ duyệt / tạo link */
  ctaMode: CampaignCardCtaMode;
  /** Khi đã tham gia & đang gọi API contract */
  contractsLoading?: boolean;
  onCardClick?: () => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  id,
  imageUrl,
  title,
  typeBadge,
  commissionDisplay,
  isGuest,
  dateRange,
  ctaMode,
  contractsLoading,
  onCardClick,
}) => {
  const navigate = useNavigate();

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onCardClick?.();
    },
    [onCardClick]
  );

  const handleCta = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (contractsLoading) return;
      if (isGuest) {
        navigate(`/login?redirect=/job/${id}`);
        return;
      }
      if (ctaMode === "join") {
        navigate(`/job/${id}`);
        return;
      }
      if (ctaMode === "create-link") {
        navigate(`/get-link/${id}`);
        return;
      }
    },
    [contractsLoading, id, isGuest, ctaMode, navigate]
  );

  return (
    <div
      className="campaign-card"
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
        {typeBadge ? (
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
            <span className="campaign-card__date-text">{dateRange}</span>
          </div>
        ) : null}
        <div className="campaign-card__hoa-hong-row">
          <span className="campaign-card__hoa-hong-label">Hoa hồng</span>
          <span className="campaign-card__hoa-hong-value">{commissionDisplay}</span>
        </div>
        {/* Web: rejected — không render CTA trên card list; chi tiết xem `job-detail`. */}
        {isGuest ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--outline" onClick={handleCta}>
            <PlusIcon />
            <span>Tham gia</span>
          </button>
        ) : contractsLoading ? (
          <button type="button" className="campaign-card__btn-cta campaign-card__btn-cta--loading" disabled>
            <span className="campaign-card__btn-cta-spinner" />
            <span>Đang tải...</span>
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
  );
};

export default React.memo(CampaignCard);
