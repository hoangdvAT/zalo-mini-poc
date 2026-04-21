/**
 * Design tokens - hỗ trợ đa đối tác (multi-partner theming)
 */

export interface PartnerTheme {
  primaryColor: string;
  primaryLight: string;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
}

export const defaultTheme: PartnerTheme = {
  primaryColor: "#EF4A22",
  primaryLight: "#FFF0ED",
  accentColor: "#FFAB00",
  successColor: "#10b981",
  warningColor: "#f59e0b",
};

export const createTokens = (partner: PartnerTheme = defaultTheme) => ({
  colors: {
    primary: partner.primaryColor,
    primaryLight: partner.primaryLight,
    accent: partner.accentColor ?? "#ff4757",
    success: partner.successColor ?? "#10b981",
    successLight: "#d1fae5",
    warning: partner.warningColor ?? "#f59e0b",
    warningLight: "#fef3c7",
    danger: "#ef4444",
    dangerLight: "#fee2e2",
    textPrimary: "#1a1a2e",
    textSecondary: "#6b7280",
    textMuted: "#9ca3af",
    bg: "#f4f5f7",
    bgCard: "#ffffff",
    border: "#e5e7eb",
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadows: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.06)",
    md: "0 4px 12px rgba(0, 0, 0, 0.08)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.12)",
  },
});

export const tokens = createTokens();
