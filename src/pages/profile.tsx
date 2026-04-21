import React, { useState, useEffect, useCallback } from "react";
import { useSetAtom } from "jotai";
import { Page, Box, Text, Avatar, Icon, useNavigate, Sheet, Input, Button, DatePicker, useSnackbar, Modal } from "zmp-ui";
import { useAuth } from "@/hooks/useAuth";
import { adSpaceCodeAtom } from "@/state/job";
import { chooseImage } from "zmp-sdk/apis";
import {
    fetchReportOverview,
    fetchConversions,
    fetchPublisherProfile,
    saveEkycContract,
} from "@/services/api";
import { formatNumber, getCurrentMonthRangeYmd, getCurrentMonthCaptionVi } from "@/utils/format";
import type { PublisherProfile } from "@/types/auth";

const DEFAULT_AVATAR = "https://picsum.photos/seed/avatar/200/200";

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const setAdSpaceCode = useSetAtom(adSpaceCodeAtom);
    const { user, isAuthenticated, logout } = useAuth();
    const snackbar = useSnackbar();
    const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
    const [loading, setLoading] = useState(true);
    const [publisherProfile, setPublisherProfile] = useState<PublisherProfile | null>(null);
    const [incomeTotal, setIncomeTotal] = useState<number>(0);

    // eKYC Form State
    const [ekycVisible, setEkycVisible] = useState(false);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [ekycForm, setEkycForm] = useState({
        full_name: "",
        id_number: "",
        id_issue_date: new Date(),
        bank_name: "",
        account_number: "",
    });
    const [ekycLoading, setEkycLoading] = useState(false);

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

    const handleEkycSubmit = async () => {
        if (!ekycForm.full_name || !ekycForm.id_number || !ekycForm.bank_name || !ekycForm.account_number) {
            snackbar.openSnackbar({
                type: 'error',
                text: 'Vui lòng điền đầy đủ thông tin',
                duration: 3000
            });
            return;
        }
        
        setEkycLoading(true);
        try {
            const formatD = (d: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            };
            
            const response = await saveEkycContract({
                full_name: ekycForm.full_name,
                id_number: ekycForm.id_number,
                id_issue_date: formatD(ekycForm.id_issue_date),
                bank_name: ekycForm.bank_name,
                account_number: ekycForm.account_number
            });

            if (response.status === 'success') {
                snackbar.openSnackbar({
                    type: 'success',
                    text: 'Cập nhật hợp đồng điện tử thành công',
                    duration: 3000
                });
                setEkycVisible(false);
            } else {
                throw new Error("Lỗi cập nhật");
            }
        } catch (error: any) {
            snackbar.openSnackbar({
                type: 'error',
                text: error.message || 'Lưu thông tin thất bại',
                duration: 3000
            });
        } finally {
            setEkycLoading(false);
        }
    };

    return (
        <Page className="profile-page" hideScrollbar>
            <div className="profile-header">
                <div style={{ position: "relative", cursor: "pointer" }} onClick={handleChangeAvatar}>
                    <Avatar size={48} src={avatarUrl} style={{ border: '2px solid white' }} />
                </div>
                <div className="profile-header__info">
                    <Text.Title className="profile-header__name">
                        {displayName}
                    </Text.Title>
                </div>
            </div>

            <div className="profile-balance-card">
                <span className="profile-balance-card__label">Bạn có</span>
                {!loading && (
                    <span className="profile-balance-card__period">{getCurrentMonthCaptionVi()}</span>
                )}
                {loading ? (
                    <div className="shimmer" style={{ height: 32, width: '60%', borderRadius: 4 }} />
                ) : (
                    <span className="profile-balance-card__value">
                        {formatNumber(incomeTotal)}đ
                    </span>
                )}
            </div>

            <div className="profile-menu-group">
                <div className="profile-menu-item" onClick={() => navigate('/profile-update')}>
                    <div className="profile-menu-item__left">
                        <Icon icon="zi-setting" className="profile-menu-item__icon" />
                        <span className="profile-menu-item__text">Thiết lập tài khoản</span>
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

            {/* eKYC / e-Contract Bottom Sheet */}
            <Sheet visible={ekycVisible} onClose={() => setEkycVisible(false)} autoHeight>
                <div className="filter-sheet-header">
                    <Text.Title className="filter-sheet-header__title">Hợp đồng điện tử</Text.Title>
                    <div onClick={() => setEkycVisible(false)}><Icon icon="zi-close" /></div>
                </div>
                <Box className="filter-sheet-content" p={4} pb={6}>
                    <Box mb={4}>
                        <Text size="small" bold style={{ marginBottom: 8 }}>Họ và tên (trên CCCD) <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            placeholder="Nhập họ và tên..."
                            value={ekycForm.full_name}
                            onChange={(e) => setEkycForm({ ...ekycForm, full_name: e.target.value })}
                            clearable
                        />
                    </Box>
                    <Box mb={4}>
                        <Text size="small" bold style={{ marginBottom: 8 }}>Số CCCD <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            placeholder="Nhập số CCCD..."
                            type="text"
                            value={ekycForm.id_number}
                            onChange={(e) => setEkycForm({ ...ekycForm, id_number: e.target.value })}
                            clearable
                        />
                    </Box>
                    <Box mb={4}>
                        <Text size="small" bold style={{ marginBottom: 8 }}>Ngày cấp <span style={{ color: 'red' }}>*</span></Text>
                        <DatePicker
                            mask
                            maskClosable
                            dateFormat="dd/mm/yyyy"
                            title="Ngày cấp"
                            value={ekycForm.id_issue_date}
                            onChange={(val: any) => setEkycForm({ ...ekycForm, id_issue_date: val as Date })}
                            action={{ text: "Xong", close: true }}
                        />
                    </Box>
                    <Box mb={4}>
                        <Text size="small" bold style={{ marginBottom: 8 }}>Tên ngân hàng <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            placeholder="Ví dụ: Vietcombank"
                            value={ekycForm.bank_name}
                            onChange={(e) => setEkycForm({ ...ekycForm, bank_name: e.target.value })}
                            clearable
                        />
                    </Box>
                    <Box mb={4}>
                        <Text size="small" bold style={{ marginBottom: 8 }}>Số tài khoản <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            placeholder="Nhập số tài khoản..."
                            type="text"
                            value={ekycForm.account_number}
                            onChange={(e) => setEkycForm({ ...ekycForm, account_number: e.target.value })}
                            clearable
                        />
                    </Box>
                    <Button 
                        fullWidth 
                        onClick={handleEkycSubmit} 
                        loading={ekycLoading}
                        style={{ marginTop: 16 }}
                    >
                        Lưu thông tin
                    </Button>
                </Box>
            </Sheet>
            {/* Logout Confirm Modal */}
            <Modal
                visible={logoutModalVisible}
                title=""
                onClose={() => setLogoutModalVisible(false)}
                className="logout-confirm-modal"
            >
                <div style={{ textAlign: 'center', padding: '16px 0 0' }}>
                    {/* Illustration Icon */}
                    <div style={{ display: 'inline-block', position: 'relative', marginBottom: 24 }}>
                        {/* Cloud body */}
                        <div style={{ 
                            width: 100, height: 60, 
                            background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)', 
                            borderRadius: '30px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}>
                            {/* Dead eyes */}
                            <div style={{ position: 'relative', top: -2, display: 'flex', gap: 12 }}>
                                <span style={{ color: '#8892a0', fontWeight: 'bold', fontSize: 16, lineHeight: 1 }}>x</span>
                                <span style={{ color: '#8892a0', fontWeight: 'bold', fontSize: 16, lineHeight: 1 }}>x</span>
                            </div>
                            {/* Mouth */}
                            <div style={{
                                position: 'absolute',
                                width: 16, height: 3, background: '#8892a0', bottom: 16, left: '50%', transform: 'translateX(-50%)', borderRadius: 2
                            }}></div>
                        </div>
                        {/* Red exclamation mark */}
                        <div style={{
                            position: 'absolute', top: -6, right: -4,
                            width: 24, height: 24, borderRadius: '50%', background: '#dc3545',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 'bold', fontSize: 14, border: '2px solid white'
                        }}>
                            !
                        </div>
                        {/* Burst lines */}
                        <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: 'absolute', top: -16, left: -8, zIndex: -1 }}>
                            <line x1="8" y1="20" x2="12" y2="20" stroke="#a8b1bd" strokeWidth="2" strokeLinecap="round" />
                            <line x1="12" y1="12" x2="16" y2="16" stroke="#a8b1bd" strokeWidth="2" strokeLinecap="round" />
                            <line x1="20" y1="8" x2="20" y2="12" stroke="#a8b1bd" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <Text.Title size="normal" style={{ marginBottom: 24, lineHeight: '24px', whiteSpace: 'pre-wrap' }}>
                        {"Bạn có chắc chắn muốn thoát khỏi\nứng dụng?"}
                    </Text.Title>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Button 
                            variant="secondary" 
                            onClick={() => setLogoutModalVisible(false)}
                            style={{ 
                                flex: 1,
                                background: 'white', 
                                border: '1px solid #E0E0E0', 
                                color: '#333', 
                                fontWeight: 500,
                            }}
                        >
                            Quay lại
                        </Button>
                        <Button 
                            onClick={() => {
                                setLogoutModalVisible(false);
                                logout();
                            }}
                            style={{ 
                                flex: 1,
                                background: '#dc3545', 
                                color: 'white', 
                                fontWeight: 500,
                                border: 'none',
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
