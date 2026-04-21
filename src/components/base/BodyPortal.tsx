import React from "react";
import { createPortal } from "react-dom";

/** Cao hơn bottom nav (~999) và overlay consent (~2000). */
export const BODY_OVERLAY_Z_INDEX = 10000;

/**
 * Gắn vào `document.body` khi đang mở overlay chọn khoảng ngày (Báo cáo / Thanh toán).
 * CSS kèm theo nâng Sheet DatePicker (~1001) lên trên overlay app (BODY_OVERLAY_Z_INDEX),
 * nếu không sheet chọn ngày nằm dưới overlay → không đóng được / tưởng hai modal chồng nhau.
 */
export const CUSTOM_DATE_RANGE_BODY_CLASS = "zmp-custom-date-range-open";

/**
 * Render children vào `document.body` để thoát stacking context của route animation / Page,
 * tránh thanh điều hướng dưới đè lên bottom sheet / overlay trên mobile.
 */
const BodyPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
};

export default BodyPortal;
