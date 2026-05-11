import React from "react";
import { Icon } from "zmp-ui";
import sungroupLogoFigma from "@/static/sungroup-logo-figma.svg";

export interface HomeHeaderProps {
  /** Tổng số dư hiển thị */
  balance: number;
  /** Đã duyệt (approved) */
  approvedBalance?: number;
  /** Chờ duyệt (pending) */
  pendingBalance?: number;
  /** Phạm vi thống kê (vd: theo tháng hiện tại) */
  statsScopeHint?: string;
  /** Liên kết đến trang đăng nhập */
  isGuest: boolean;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  isGuest = false,
  balance,
  approvedBalance = 0,
  pendingBalance = 0,
  statsScopeHint,
}) => {
  const formatAmount = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="home-header-banner">
      <div className="home-header-banner__top">
        <div className="home-header-banner__logos">
          <img src={sungroupLogoFigma} alt="Sun Group x AccessTrade" className="home-header-banner__logo-combined" />
        </div>
      </div>

      <div
        className={[
          "home-header-banner__balance-card",
          balance <= 0 && approvedBalance <= 0 && pendingBalance <= 0
            ? "home-header-banner__balance-card--empty"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="home-header-banner__balance-top">
          <span className="home-header-banner__balance-label">Bạn có:</span>
          <Icon icon="zi-chevron-right" size={16} className="home-header-banner__balance-arrow" />
        </div>
        <div className="home-header-banner__balance-amount">
          {formatAmount(balance)}
        </div>
        {balance > 0 || approvedBalance > 0 || pendingBalance > 0 ? (
          <>
            <p className="home-header-banner__balance-desc">
              Thanh toán vào ngày 05 & 20 hàng tháng
            </p>
            {statsScopeHint ? (
              <p className="home-header-banner__balance-scope">{statsScopeHint}</p>
            ) : null}
            <div className="home-header-banner__balance-sep" />
            <div className="home-header-banner__balance-sub">
              <div className="home-header-banner__balance-box">
                <span className="home-header-banner__balance-box-label">Đã duyệt</span>
                <span className="home-header-banner__balance-box-value">{formatAmount(approvedBalance)}</span>
              </div>
              <div className="home-header-banner__balance-box">
                <span className="home-header-banner__balance-box-label">Chờ duyệt</span>
                <span className="home-header-banner__balance-box-value">{formatAmount(pendingBalance)}</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default HomeHeader;
