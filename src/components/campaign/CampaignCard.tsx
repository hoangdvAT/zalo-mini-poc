import React, { useCallback } from "react";
import { Text, useNavigate } from "zmp-ui";
import { LinkChainIcon } from "@/components/icons/LinkChainIcon";
import { fetchJoinCampaign } from "@/services/api";

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
        // navigate(`/job/${id}`);
        // return;

        fetchJoinCampaign({ campaign_id: id })
        .then((res) => {
          if (res.status === 'fail') {
            const typeData = typeof res.data.check;
            if (typeData === 'object') {
              if (res.data.check.total > 0) {
                if (res.data.check.pending > 0) {
                  // TODO
                  // alert('info', "Hiện tại Adspace của bạn đang ở trạng thái chờ duyệt và sẽ xử lý trong vòng 24h");
                } else {
                  // TODO
                  // alert("infor", "Bạn chưa có AdSpaces. Vui lòng tạo AdSpaces để được tham gia chiến dịch");
                  // TODO
                  // Show alert với 2 btn "Tạo ad-space", "Đóng"
                  // Nhấn "Tạo ad-space" thì Chuyển tới màn ad-space
                }
              } else {
                // TODO
                // alert("infor", "Bạn chưa có AdSpaces. Vui lòng tạo AdSpaces để được tham gia chiến dịch");
                // TODO
                // Show alert với 2 btn "Tạo ad-space", "Đóng"
                // Nhấn "Tạo ad-space" thì Chuyển tới màn ad-space
              }
            } else if (typeData === 'undefined') {
              // TODO
              // alert('error', "Bạn không có quyền tham gia chiến dịch");
            }
          } else if (res.status === 'error') {
            if (res.errorCode && res.errorCode === 403) {
              // TODO
              // alert('error', res.message);
            } else {
              // TODO
              // alert('success', "Bạn đã tham gia chiến dịch thất bại.");
            }
          } else {
            // TODO
            // alert('success', "Bạn đã tham gia chiến dịch thành công.");
    
            // TODO: fetch lại list chiến dịch hoặc cập nhật lại hiển thị nút
          }
        })
        .catch(() => {
          // TODO Something
        })
      }
      if (ctaMode === "create-link") {
        navigate(`/get-link/${id}`);
        return;
      }
    },
    // TODO: Something
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
        {commissionDisplay ? (
          <div className="campaign-card__hoa-hong-row">
            <span className="campaign-card__hoa-hong-label">Hoa hồng</span>
            <span className="campaign-card__hoa-hong-value">{commissionDisplay}</span>
          </div>
        ): null}
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
