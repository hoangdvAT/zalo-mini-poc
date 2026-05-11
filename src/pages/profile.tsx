import React, { useState, useEffect, useCallback } from "react";
import { useSetAtom } from "jotai";
import { Page, Text, Avatar, Icon, useNavigate, Button, Modal } from "zmp-ui";
import { useAuth } from "@/hooks/useAuth";
import { adSpaceCodeAtom } from "@/state/job";
import { chooseImage } from "zmp-sdk/apis";
import {
    fetchReportOverview,
    fetchPublisherProfile,
} from "@/services/api";
import { formatNumber, getCurrentMonthRangeYmd } from "@/utils/format";
import type { PublisherProfile } from "@/types/auth";

const DEFAULT_AVATAR = "https://picsum.photos/seed/avatar/200/200";

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const setAdSpaceCode = useSetAtom(adSpaceCodeAtom);
    const { user, isAuthenticated, logout } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
    const [loading, setLoading] = useState(true);
    const [publisherProfile, setPublisherProfile] = useState<PublisherProfile | null>(null);
    const [incomeTotal, setIncomeTotal] = useState<number>(0);

    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    useEffect(() => {
        // Handled by AuthGuard
    }, [isAuthenticated, navigate]);

    const loadProfileData = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const { from_date, to_date } = getCurrentMonthRangeYmd();

            const [statsMonth, pub] = await Promise.all([
                fetchReportOverview({
                    from_date,
                    to_date,
                }),
                fetchPublisherProfile(),
            ]);

            setPublisherProfile(pub);
            const code = pub?.ad_space_code?.trim();
            setAdSpaceCode(code || null);
            setIncomeTotal(statsMonth?.pub_commission?.total ?? 0);
        } catch (e) {
            console.error("[Profile] Lỗi tải dữ liệu:", e);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, setAdSpaceCode]);

    useEffect(() => {
        if (isAuthenticated) {
            loadProfileData();
        }
    }, [isAuthenticated, loadProfileData]);

    useEffect(() => {
        setAvatarUrl(
            user?.avatar || publisherProfile?.user?.avatar || DEFAULT_AVATAR
        );
    }, [user?.avatar, publisherProfile?.user?.avatar]);

    const displayName =
        publisherProfile?.user?.name || user?.name || "Người dùng Zalo";

    const handleChangeAvatar = async () => {
        try {
            const { filePaths } = await chooseImage({
                sourceType: ["camera", "album"],
                cameraType: "front",
                count: 1,
            });
            if (filePaths && filePaths.length > 0) {
                setAvatarUrl(filePaths[0]);
            }
        } catch (error) {
            console.log("Error choosing image:", error);
        }
    };

    return (
        <Page className="profile-page" hideScrollbar>
            <div className="profile-header">
                <div className="profile-header__top">
                    <div className="profile-header__user" onClick={handleChangeAvatar}>
                        <Avatar size={44} src={avatarUrl} style={{ border: '2px solid white' }} />
                        <div className="profile-header__info">
                            <Text.Title className="profile-header__name">
                                {displayName}
                            </Text.Title>
                            {/* <Text size="small" className="profile-header__sub">
                                Descrip ....
                            </Text> */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="profile-balance-card">
                <span className="profile-balance-card__label">Bạn có</span>
                {loading ? (
                    <div className="shimmer" style={{ height: 32, width: '60%', borderRadius: 4 }} />
                ) : (
                    <span className="profile-balance-card__value">
                        {formatNumber(incomeTotal)}đ
                    </span>
                )}
            </div>

            <div className="profile-menu-group">
                <div className="profile-menu-item" onClick={() => navigate("/profile-update")}>
                    <div className="profile-menu-item__left">
                        <Icon icon="zi-setting" className="profile-menu-item__icon" />
                        <span className="profile-menu-item__text">Thiết lập tài khoản</span>
                    </div>
                    <Icon icon="zi-chevron-right" className="profile-menu-item__arrow" />
                </div>
                <div className="profile-menu-item" onClick={() => navigate("/e-contract")}>
                    <div className="profile-menu-item__left">
                        <Icon icon="zi-inbox" className="profile-menu-item__icon" />
                        <span className="profile-menu-item__text">Hợp đồng điện tử</span>
                    </div>
                    <Icon icon="zi-chevron-right" className="profile-menu-item__arrow" />
                </div>
                <div className="profile-menu-item">
                    <div className="profile-menu-item__left">
                        <Icon icon="zi-call" className="profile-menu-item__icon" />
                        <span className="profile-menu-item__text">Trợ giúp</span>
                    </div>
                    <Icon icon="zi-chevron-right" className="profile-menu-item__arrow" />
                </div>
            </div>

            <div className="profile-logout-group">
                <div className="profile-menu-item" onClick={() => setLogoutModalVisible(true)}>
                    <Icon icon="zi-leave" className="profile-menu-item__icon" />
                    <span className="profile-menu-item__text">Thoát tài khoản</span>
                </div>
            </div>

            <div className="profile-footer">
                Powered by ACCESSTRADE
            </div>

            {/* Logout Confirm Modal */}
            <Modal
                visible={logoutModalVisible}
                title=""
                onClose={() => setLogoutModalVisible(false)}
                className="logout-confirm-modal"
            >
                <div className="logout-modal">
                    <div className="logout-modal__close">
                        <Icon icon="zi-close" size={22} onClick={() => setLogoutModalVisible(false)} />
                    </div>
                    <div className="logout-modal__icon-wrap">
                        <div className="logout-modal__cloud">
                            <span style={{ fontSize: 14, fontWeight: 700, marginRight: 6 }}>x</span>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>x</span>
                        </div>
                        <div className="logout-modal__badge">!</div>
                    </div>
                    <Text.Title size="normal" className="logout-modal__text">
                        {"Bạn có chắc chắn muốn thoát khỏi\nứng dụng?"}
                    </Text.Title>
                    <div className="logout-modal__actions">
                        <Button
                            variant="secondary"
                            className="logout-modal__btn-back"
                            onClick={() => setLogoutModalVisible(false)}
                        >
                            Quay lại
                        </Button>
                        <Button
                            className="logout-modal__btn-logout"
                            onClick={() => {
                                setLogoutModalVisible(false);
                                logout();
                            }}
                        >
                            Thoát
                        </Button>
                    </div>
                </div>
            </Modal>
        </Page>
    );
};

export default ProfilePage;
