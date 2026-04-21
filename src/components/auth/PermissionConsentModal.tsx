import React, { useState } from "react";
import atLogo from "@/static/at-logo.png";

interface PermissionConsentModalProps {
  open: boolean;
  onAllow: () => void;
  onReject: () => void;
}

/**
 * Modal xin quyền lấy thông tin - Style mới (Tham khảo Be App)
 */
const PermissionConsentModal: React.FC<PermissionConsentModalProps> = ({
  open,
  onAllow,
  onReject, // Keep for prop compatibility, though the new design has 1 button. We can map "Đã hiểu" to onAllow.
}) => {
  if (!open) return null;

  return (
    <div className="zalo-consent-overlay">
      <div className="zalo-consent-modal new-style">

        {/* Top Illustration (Placeholder for ACCESSTRADE graphic) */}
        <div className="zalo-consent-hero">
          <img src={atLogo} alt="ACCESSTRADE" className="alert-bg__img" />
        </div>

        {/* Title */}
        <h2 className="zalo-consent__title centered">
          ACCESSTRADE cần thông tin của bạn
        </h2>

        {/* Permission List */}
        <div className="zalo-consent__list">

          {/* Permission 1: Profile */}
          <div className="zalo-consent__list-item">
            <div className="zalo-consent__list-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="zalo-consent__list-content">
              <div className="zalo-consent__list-title">Tên và ảnh đại diện</div>
              <div className="zalo-consent__list-desc">
                Được sử dụng để định danh và truy cập các tính năng từ Zalo (bắt buộc)
              </div>
            </div>
          </div>

          {/* Permission 2: Phone */}
          <div className="zalo-consent__list-item">
            <div className="zalo-consent__list-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="zalo-consent__list-content">
              <div className="zalo-consent__list-title">Số điện thoại</div>
              <div className="zalo-consent__list-desc">
                Được sử dụng để định danh và liên lạc với bạn bè, đối tác.
              </div>
            </div>
          </div>

        </div>

        {/* Action Button */}
        <button
          type="button"
          className="zalo-consent__btn-primary"
          onClick={onAllow}
        >
          Đã hiểu
        </button>

      </div>
    </div>
  );
};

export default PermissionConsentModal;
