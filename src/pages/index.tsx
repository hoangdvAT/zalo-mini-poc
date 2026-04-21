import React, { useEffect, useCallback, useState } from "react";
import { useAtom } from "jotai";
import { useAtomValue } from "jotai";
import { Page, Text } from "zmp-ui";
import { useNavigate } from "zmp-ui";

import {
  campaignsAtom,
  loadingAtom,
  loadingMoreAtom,
  noMoreAtom,
  currentPageAtom,
  searchQueryAtom,
  selectedCategoryIdAtom,
  categoriesAtom,
} from "@/state/job";
import { isGuestAtom } from "@/state/auth";
import { shareSheetStateAtom } from "@/state/share";
import {
  fetchCampaigns,
  fetchCampaignsWithContract,
  createTrackingLink,
  fetchReportOverview,
} from "@/services/api";
import { CampaignCard, type CampaignCardCtaMode } from "@/components/campaign";
import {
  getCampaignTypeBadge,
  getCampaignCommissionDisplay,
  resolveCtaModeFromCampaignListItem,
} from "@/utils/campaignUi";
import HomeHeader from "@/components/home/HomeHeader";
import OneClickSection from "@/components/home/OneClickSection";
import { CampaignListSkeleton } from "@/components/base";
import { formatDateRange, getCurrentMonthRangeYmd, getCurrentMonthCaptionVi } from "@/utils/format";
import type { Campaign } from "@/types/campaign";

/** Home "Đã tham gia": chỉ card Chờ phản hồi / Tạo link — ẩn trạng thái Tham gia (chưa có HĐ). */
function filterJoinedCampaignsForList(campaigns: Campaign[]): Campaign[] {
  return campaigns.filter((c) => {
    const mode = resolveCtaModeFromCampaignListItem(c);
    return mode === "pending" || mode === "create-link" || mode === "rejected";
  });
}

const FireIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 19 16 19 10C19 6.13 15.87 3 12 3C8.13 3 5 6.13 5 10C5 16 12 22 12 22Z" fill="#F24A13" />
    <path d="M12 18C12 18 15.5 14.5 15.5 11C15.5 8.79 13.93 7 12 7C10.07 7 8.5 8.79 8.5 11C8.5 14.5 12 18 12 18Z" fill="white" />
  </svg>
);

const HomePage: React.FC = () => {
  const [campaigns, setCampaigns] = useAtom(campaignsAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [loadingMore, setLoadingMore] = useAtom(loadingMoreAtom);
  const [noMore, setNoMore] = useAtom(noMoreAtom);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const [selectedCategoryId, setSelectedCategoryId] =
    useAtom(selectedCategoryIdAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const isGuest = useAtomValue(isGuestAtom);
  const [, setShareState] = useAtom(shareSheetStateAtom);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const navigate = useNavigate();

  const [incomeData, setIncomeData] = useState({
    balance: 0,
    approvedBalance: 0,
    pendingBalance: 0,
  });

  /** Flow web: lọc chiến dịch đã tham gia */
  const [showJoinedOnly, setShowJoinedOnly] = useState(false);

    useEffect(() => {
      if (isGuest) return;
      const loadIncome = async () => {
        try {
          const { from_date, to_date } = getCurrentMonthRangeYmd();

          const statsMonth = await fetchReportOverview({
            from_date,
            to_date,
          });

        if (statsMonth?.pub_commission) {
          setIncomeData({
            balance: statsMonth.pub_commission.total || 0,
            approvedBalance: statsMonth.pub_commission.approved || 0,
            pendingBalance: statsMonth.pub_commission.pending || 0,
          });
        }
      } catch (e) {
        console.error("Lỗi tải thu nhập ở Home:", e);
      }
    };
    loadIncome();
  }, [isGuest]);

  // Load categories on mount (from campaign categories)
  useEffect(() => {
    const categoryMap = new Map<number, { id: number; name: string }>();
    campaigns.forEach(c => {
      (c.categories || []).forEach(cat => {
        if (!categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, { id: cat.id, name: cat.name });
        }
      });
    });
    const uniqueCategories = Array.from(categoryMap.values());
    setCategories(uniqueCategories);
  }, [campaigns, setCategories]);

  const fetchCampaignPage = useCallback(
    async (page: number) => {
      if (showJoinedOnly) {
        return fetchCampaignsWithContract({
          page,
          name: searchQuery || undefined,
          category_ids: selectedCategoryId ? [selectedCategoryId] : undefined,
          sort: "label,0",
          myCampaignScope: true,
        });
      }
      return fetchCampaigns({
        page,
        search: searchQuery,
        category_ids: selectedCategoryId ? [selectedCategoryId] : undefined,
        sort: "label,0",
        invited: "",
      });
    },
    [searchQuery, selectedCategoryId, showJoinedOnly]
  );

  /** Trang 1 — thay toàn bộ list, reset phân trang & CTA cache */
  const reloadCampaigns = useCallback(async () => {
    setLoading(true);
    setLoadingMore(false);
    setCurrentPage(1);
    setNoMore(false);
    try {
      const result = await fetchCampaignPage(1);
      const raw = result.campaigns || [];
      const display = showJoinedOnly ? filterJoinedCampaignsForList(raw) : raw;
      setCampaigns(display);
      const meta = result.meta;
      const lastPage = Math.max(meta.last_page || 1, 1);
      const curPage = meta.current_page || 1;
      const perPage = meta.per_page || 20;
      setCurrentPage(curPage);
      const shortPage = raw.length < perPage;
      setNoMore(raw.length === 0 || curPage >= lastPage || shortPage);
    } catch (err) {
      console.error("Lỗi tải chiến dịch:", err);
      setCampaigns([]);
      setNoMore(true);
    } finally {
      setLoading(false);
    }
  }, [
    fetchCampaignPage,
    showJoinedOnly,
    setCampaigns,
    setCurrentPage,
    setLoading,
    setLoadingMore,
    setNoMore,
  ]);

  useEffect(() => {
    reloadCampaigns();
  }, [reloadCampaigns]);

  const loadMoreCampaigns = useCallback(async () => {
    if (noMore || loadingMore || loading) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const result = await fetchCampaignPage(nextPage);
      const rawList = result.campaigns || [];
      if (rawList.length === 0) {
        setNoMore(true);
        return;
      }
      const toAppend = showJoinedOnly
        ? filterJoinedCampaignsForList(rawList)
        : rawList;
      setCampaigns((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const c of toAppend) {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            merged.push(c);
          }
        }
        return merged;
      });
      const meta = result.meta;
      const lastPage = Math.max(meta.last_page || 1, 1);
      const curPage = meta.current_page || nextPage;
      const perPage = meta.per_page || 20;
      setCurrentPage(curPage);
      const shortPage = rawList.length < perPage;
      setNoMore(curPage >= lastPage || shortPage);
    } catch (err) {
      console.error("Lỗi load thêm chiến dịch:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    noMore,
    loadingMore,
    loading,
    currentPage,
    fetchCampaignPage,
    showJoinedOnly,
    setCampaigns,
    setCurrentPage,
    setLoadingMore,
    setNoMore,
  ]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.scrollHeight - target.scrollTop <= target.clientHeight + 120 &&
        !noMore &&
        !loadingMore &&
        !loading
      ) {
        loadMoreCampaigns();
      }
    },
    [noMore, loadingMore, loading, loadMoreCampaigns]
  );

  // ─── OneClick: login & share handlers ──────────────────────────
  const handleOneClickLogin = useCallback(() => {
    navigate("/login?redirect=/");
  }, [navigate]);

  const handleOneClickShare = useCallback(async () => {
    if (campaigns.length !== 1) return;
    const campaign = campaigns[0];
    const rate = parseFloat(campaign.max_commission_rate) || 0;
    const value = parseFloat(campaign.max_commission_value) || 0;
    const commissionDisplay = rate > 0 ? `${rate}%` : value > 0 ? `${value.toLocaleString('vi-VN')}đ` : "";
    const shareContent = `Tham gia chiến dịch ${campaign.name} nhận ngay ưu đãi ${commissionDisplay}`;

    setSharingInProgress(true);
    try {
      const result = await createTrackingLink(Number(campaign.id), {
        redirect_url: campaign.url?.trim() || undefined,
      });
      const shareLink = result.short_link || result.deeplink || campaign.url || "";
      setShareState({
        visible: true,
        campaignId: campaign.id.toString(),
        campaignName: campaign.name,
        campaignLogo: campaign.logo || "",
        campaignPath: `/job/${campaign.id}`,
        shareContent,
        shareUrl: shareLink,
      });
    } catch {
      setShareState({
        visible: true,
        campaignId: campaign.id.toString(),
        campaignName: campaign.name,
        campaignLogo: campaign.logo || "",
        campaignPath: `/job/${campaign.id}`,
        shareContent,
        shareUrl: campaign.url || "",
      });
    } finally {
      setSharingInProgress(false);
    }
  }, [campaigns, setShareState]);

  // Compute OneClick CTA commission text
  const oneClickCommission = campaigns.length === 1
    ? (() => {
      const c = campaigns[0];
      const rate = parseFloat(c.max_commission_rate) || 0;
      const value = parseFloat(c.max_commission_value) || 0;
      if (rate > 0) return `${rate}%/sp`;
      if (value > 0) return `${value.toLocaleString('vi-VN')}/sp`;
      return "Liên hệ";
    })()
    : "6.300/sp";

  /** CTA chỉ từ payload list `without-contract` — không gọi N API contracts/campaign (giống web). */
  const resolveCardCta = (campaign: Campaign): CampaignCardCtaMode => {
    if (isGuest) return "join";
    return resolveCtaModeFromCampaignListItem(campaign);
  };

  const mapCampaignToCard = (campaign: Campaign) => {
    const imageUrl = campaign.logo || "https://via.placeholder.com/300x200?text=No+Image";
    const dateRange = formatDateRange(campaign.started_at, campaign.ended_at || undefined);
    const ctaMode = resolveCardCta(campaign);

    return {
      id: campaign.id.toString(),
      imageUrl,
      title: campaign.name,
      typeBadge: getCampaignTypeBadge(campaign),
      commissionDisplay: getCampaignCommissionDisplay(campaign),
      isGuest,
      dateRange: dateRange || undefined,
      ctaMode,
      contractsLoading: false,
      onCardClick: () => navigate(`/job/${campaign.id}`),
    };
  };

  return (
    <Page className="home-page" hideScrollbar onScroll={handleScroll}>
        <HomeHeader
          balance={incomeData.balance}
          approvedBalance={incomeData.approvedBalance}
          pendingBalance={incomeData.pendingBalance}
          statsScopeHint={`Số liệu ${getCurrentMonthCaptionVi()}`}
          isGuest={isGuest}
        />

      <div className={`home-content${isGuest ? " home-content--guest" : ""}`}>
        <OneClickSection
          ctaCommission={oneClickCommission}
          isGuest={isGuest}
          campaignCount={campaigns.length}
          onLogin={handleOneClickLogin}
          onShare={handleOneClickShare}
        />
        <div className="home-campaigns-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FireIcon />
            <Text.Title size="large" style={{ fontWeight: 700, margin: 0, color: "#1A1A2E" }}>
              Chiến dịch hot
            </Text.Title>
          </div>
          <label className="home-joined-toggle">
            <input
              type="checkbox"
              checked={showJoinedOnly}
              onChange={(e) => setShowJoinedOnly(e.target.checked)}
            />
            <span className="home-joined-toggle__slider" />
            <span className="home-joined-toggle__label">Đã tham gia</span>
          </label>
        </div>

        {loading ? (
          <CampaignListSkeleton />
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <Text size="normal" className="empty-state__text">
              Không tìm thấy chiến dịch nào
            </Text>
          </div>
        ) : (
          <>
            <div className="campaign-list">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} {...mapCampaignToCard(campaign)} />
              ))}
            </div>
            {loadingMore && (
              <div className="home-load-more" aria-busy="true">
                <div className="shimmer" style={{ height: 20, width: 20, borderRadius: "50%", margin: "0 auto" }} />
                <Text size="small" style={{ textAlign: "center", marginTop: 8, color: "#6b7280" }}>
                  Đang tải thêm...
                </Text>
              </div>
            )}
            {noMore && campaigns.length > 0 && (
              <Text size="small" className="home-no-more">
                Đã hiển thị tất cả chiến dịch
              </Text>
            )}
          </>
        )}
      </div>
    </Page>
  );
};

export default HomePage;
