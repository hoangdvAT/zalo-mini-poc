import React from "react";
import { getSystemInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  BottomNavigation,
  Icon,
  Route,
  SnackbarProvider,
  ZMPRouter,
  useNavigate,
  useLocation,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import { partnerConfig, hideNavPaths } from "@/config/partner";
import { AuthGuard, AuthInit } from "@/components/auth";
import HomePage from "@/pages/index";
import JobDetailPage from "@/pages/job-detail";
import GetLinkPage from "@/pages/get-link";
import ReportPage from "@/pages/report";
import PaymentPage from "@/pages/payment";
import ProfilePage from "@/pages/profile";
import ProfileUpdatePage from "@/pages/profile-update";
import EkycPage from "@/pages/ekyc";
import EContractPage from "@/pages/e-contract";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import { ShareBottomSheet } from "@/components/share";

const CURRENT_PARTNER = "default";

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = partnerConfig[CURRENT_PARTNER];

  const shouldHideNav = hideNavPaths.some((path) =>
    location.pathname.startsWith(path.replace(/\/$/, ""))
  );
  if (shouldHideNav) return null;

  const activeKey =
    config.bottomNav.find((item) => item.path === location.pathname)?.key ??
    (location.pathname === "/" ? "home" : "home");

  return (
    <BottomNavigation
      fixed
      activeKey={activeKey}
      onChange={(key) => {
        const item = config.bottomNav.find((i) => i.key === key);
        if (item) navigate(item.path);
      }}
    >
      {config.bottomNav.map((item) => (
        <BottomNavigation.Item
          key={item.key}
          label={item.label}
          icon={<Icon icon={item.icon as any} />}
          activeIcon={<Icon icon={(item.activeIcon || item.icon) as any} />}
        />
      ))}
    </BottomNavigation>
  );
};

const Layout: React.FC = () => {
  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      {/* @ts-ignore */}
      <SnackbarProvider>
        <AuthInit>
          <ZMPRouter>
            <AuthGuard>
            <AnimationRoutes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/job/:id" element={<JobDetailPage />} />
              <Route path="/get-link/:id" element={<GetLinkPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile-update" element={<ProfileUpdatePage />} />
              <Route path="/ekyc" element={<EkycPage />} />
              <Route path="/e-contract" element={<EContractPage />} />
            </AnimationRoutes>
              <Navigation />
              <ShareBottomSheet />
            </AuthGuard>
          </ZMPRouter>
        </AuthInit>
      </SnackbarProvider>
    </App>
  );
};

export default Layout;
