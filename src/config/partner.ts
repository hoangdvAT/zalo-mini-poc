/**
 * Partner config - logos, copy, bottom nav, theme
 */

import { defaultTheme, PartnerTheme } from "@/themes";

export type PartnerId = "default" | "masan";

export interface BottomNavItem {
  key: string;
  label: string;
  icon: string;
  activeIcon?: string;
  path: string;
}

export interface PartnerConfig {
  id: PartnerId;
  name: string;
  theme: PartnerTheme;
  logos?: { src: string; alt?: string }[];
  bottomNav: BottomNavItem[];
  copy?: {
    balanceTitle?: string;
    shareTitle?: string;
    campaignHot?: string;
  };
}

const defaultBottomNav: BottomNavItem[] = [
  { key: "home", label: "Trang chủ", icon: "zi-home", activeIcon: "zi-home", path: "/" },
  { key: "report", label: "Báo cáo", icon: "zi-poll", activeIcon: "zi-poll", path: "/report" },
  { key: "payment", label: "Thanh toán", icon: "zi-clock-1", activeIcon: "zi-clock-1", path: "/payment" },
  { key: "profile", label: "Cá nhân", icon: "zi-user-circle", activeIcon: "zi-user-circle", path: "/profile" },
];

export const partnerConfig: Record<PartnerId, PartnerConfig> = {
  default: {
    id: "default",
    name: "Việc làm",
    theme: defaultTheme,
    bottomNav: defaultBottomNav,
    copy: {
      balanceTitle: "Bạn có",
      shareTitle: "Chia sẻ",
      campaignHot: "Chiến dịch hot",
    },
  },
  masan: {
    id: "masan",
    name: "Masan Zalo OA",
    theme: {
      primaryColor: "#e65100",
      primaryLight: "#fff3e0",
      accentColor: "#ff9800",
    },
    logos: [
      { src: "/logos/accesstrade.png", alt: "ACCESSTRADE" },
      { src: "/logos/masan.png", alt: "Masan Consumer" },
    ],
    bottomNav: defaultBottomNav,
    copy: {
      balanceTitle: "Bạn có",
      shareTitle: "Chia sẻ",
      campaignHot: "Chiến dịch hot",
    },
  },
};

/** Paths ẩn bottom nav */
export const hideNavPaths = ["/job/", "/get-link/", "/ekyc", "/login", "/profile-update"];
