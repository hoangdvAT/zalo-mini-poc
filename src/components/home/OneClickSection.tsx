import React from "react";
import iconShare from "@/static/icons/share-06.svg";
import iconSparkle from "@/static/icons/circle-sparkle.svg";
import iconStepChoose from "@/static/icons/step-choose.svg";
import iconStepShare from "@/static/icons/step-share.svg";
import iconStepEarn from "@/static/icons/step-earn.svg";
import iconChevronRight from "@/static/icons/chevron-right-orange.svg";

export interface OneClickSectionProps {
  ctaCommission?: string;
  isGuest?: boolean;
  campaignCount?: number;
  onLogin?: () => void;
  onShare?: () => void;
}

const OneClickSection: React.FC<OneClickSectionProps> = ({
  ctaCommission = "6.300/sp",
  isGuest = false,
  campaignCount = 0,
  onLogin,
  onShare,
}) => {
  // Show CTA button only if exactly 1 campaign
  const showCta = campaignCount === 1;

  const handleCtaClick = () => {
    if (isGuest) {
      onLogin?.();
    } else {
      onShare?.();
    }
  };

  return (
    <div className={`jd-oneclick ${!showCta ? "jd-oneclick--nobtn" : ""}`} style={{ margin: "0 0 20px 0" }}>
      <div className="jd-oneclick__header">
        <img src={iconSparkle} alt="" width={20} height={20} />
        <span className="jd-oneclick__title">Nhận hoa hồng chỉ với 1 Click</span>
      </div>

      <div className="jd-oneclick__steps">
        <div className="jd-oneclick__step">
          <div className="jd-oneclick__step-icon">
            <img src={iconStepChoose} alt="Chọn chiến dịch" width={24} height={24} />
          </div>
          <span className="jd-oneclick__step-label">Chọn chiến dịch</span>
        </div>

        <span className="jd-oneclick__arrow">
          <img src={iconChevronRight} alt="" width={16} height={16} />
        </span>

        <div className="jd-oneclick__step">
          <div className="jd-oneclick__step-icon">
            <img src={iconStepShare} alt="Chia sẻ link" width={24} height={24} />
          </div>
          <span className="jd-oneclick__step-label">Chia sẻ link</span>
        </div>

        <span className="jd-oneclick__arrow">
          <img src={iconChevronRight} alt="" width={16} height={16} />
        </span>

        <div className="jd-oneclick__step">
          <div className="jd-oneclick__step-icon">
            <img src={iconStepEarn} alt="Nhận hoa hồng" width={24} height={24} />
          </div>
          <span className="jd-oneclick__step-label">Nhận hoa hồng</span>
        </div>
      </div>

      {showCta && (
        <button className="jd-oneclick__btn" onClick={handleCtaClick}>
          {isGuest ? (
            "Đăng nhập để tạo link"
          ) : (
            <>
              <img src={iconShare} alt="" width={18} height={18} />
              <span>Chia sẻ nhận {ctaCommission}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default OneClickSection;
