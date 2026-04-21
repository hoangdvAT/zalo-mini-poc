import React, { useState, useEffect, useCallback } from "react";
import { Page, Box, Text, Input, Button, useSnackbar, Icon } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/utils/authErrors";
import { fetchPublisherProfile, updateUserProfile, uploadBase64Image } from "@/services/api";
import { chooseImage } from "zmp-sdk/apis";

const ProfileUpdatePage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser } = useAuth();
    const snackbar = useSnackbar();
    const [inlineError, setInlineError] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        address: "",
        date_of_birth: "",
        country: "Việt Nam",
        city: "",
        primary_category: 0,
        company_name: "",
        card_number: "",
        image_before_card: "",
        image_after_card: "",
        id: 0,
        account_type: "1",
        gender: 0,
    });

    const loadData = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const pub = await fetchPublisherProfile();
            if (pub?.raw) {
                const raw = pub.raw as Record<string, unknown>;
                const rawUser = (raw.user as Record<string, unknown>) || raw || {};
                const userProfile = (rawUser.profile as Record<string, unknown>) || {};
                const userEmail = String(rawUser.email || pub.user?.email || "");

                const phoneFromAuth = authUser?.phone?.trim() || "";
                const phoneFromServer =
                    (typeof rawUser.phone === "string" && rawUser.phone.trim()) ||
                    (typeof raw.phone === "string" && String(raw.phone).trim()) ||
                    (typeof userProfile.phone_number === "string" && userProfile.phone_number.trim()) ||
                    (typeof rawUser.phone_number === "string" && String(rawUser.phone_number).trim()) ||
                    pub.user?.phone?.trim() ||
                    "";

                /** Ưu tiên SĐT từ phiên đăng nhập (Zalo/backend token) để khớp tài khoản — BUG_6 */
                const phone_number = phoneFromAuth || phoneFromServer;

                setForm({
                    first_name: String(userProfile.first_name || rawUser.first_name || ""),
                    last_name: String(userProfile.last_name || rawUser.last_name || ""),
                    email: userEmail,
                    phone_number,
                    address: String(userProfile.address || rawUser.address || ""),
                    date_of_birth: String(userProfile.date_of_birth || rawUser.date_of_birth || "1990-01-01"),
                    country: String(userProfile.country || rawUser.country || "Việt Nam"),
                    city: String(userProfile.city || rawUser.city || "Hà Nội"),
                    primary_category: Number(userProfile.primary_category || rawUser.primary_category || 4),
                    company_name: String(userProfile.company_name || rawUser.company_name || "Cá nhân"),
                    card_number: String(userProfile.card_number || rawUser.card_number || "000000000000"),
                    image_before_card: String(userProfile.image_before_card || rawUser.image_before_card || ""),
                    image_after_card: String(userProfile.image_after_card || rawUser.image_after_card || ""),
                    id: Number(rawUser.id || 0),
                    account_type: String(userProfile.account_type || rawUser.account_type || "1"),
                    gender:
                        userProfile.gender !== undefined
                            ? Number(userProfile.gender)
                            : Number(rawUser.gender || 0),
                });
            }
        } catch (e) {
            console.error("Lỗi tải dữ liệu profile:", e);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, authUser?.phone]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const patchForm = useCallback((patch: Partial<typeof form>) => {
        setInlineError(null);
        setForm((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleImageUpload = async (field: 'image_before_card' | 'image_after_card') => {
        try {
            const { filePaths } = await chooseImage({
                sourceType: ["camera", "album"],
                count: 1,
            });
            if (filePaths && filePaths.length > 0) {
                const localUrl = filePaths[0];
                snackbar.openSnackbar({ type: 'info', text: 'Đang tải ảnh lên...', duration: 2000 });
                
                let urlToFetch = localUrl;
                if (urlToFetch.startsWith('blob://')) {
                    urlToFetch = urlToFetch.replace('blob://', 'blob:');
                }
                
                // Fetch the blob and convert to base64
                const response = await fetch(urlToFetch);
                const blob = await response.blob();
                const reader = new FileReader();
                
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    let base64data = reader.result as string;
                    try {
                        const url = await uploadBase64Image(base64data);
                        setForm(prev => ({ ...prev, [field]: url || base64data }));
                        snackbar.openSnackbar({ type: 'success', text: 'Tải ảnh thành công', duration: 2000 });
                    } catch (uploadError) {
                        console.error("Lỗi upload ảnh:", uploadError);
                        // Fallback to base64 if upload fails or if API returns the base64
                        setForm(prev => ({ ...prev, [field]: base64data }));
                        snackbar.openSnackbar({ type: 'error', text: 'Tải ảnh thất bại', duration: 2000 });
                    }
                };
            }
        } catch (error) {
            console.log("Lỗi chọn ảnh:", error);
        }
    };

    const handleSubmit = async () => {
        setInlineError(null);
        const last_name = form.last_name.trim();
        const first_name = form.first_name.trim();
        const phone_number = form.phone_number.trim();

        /** BUG_7: thông báo rõ khi thiếu họ/tên (không dùng snackbar chung ở đáy màn — BUG_9) */
        if (!last_name || !first_name || !phone_number) {
            setInlineError("Vui lòng điền đầy đủ họ, tên, ..");
            return;
        }
        if (!form.email?.trim()) {
            setInlineError("Tài khoản chưa có email. Vui lòng liên hệ hỗ trợ.");
            return;
        }

        setSaving(true);
        try {
            const payload = { ...form, last_name, first_name, phone_number };
            const response = await updateUserProfile(payload);
            if (response.status === 'success' || response.code === 200) {
                snackbar.openSnackbar({
                    type: 'success',
                    text: 'Cập nhật tài khoản thành công',
                    duration: 3000
                });
                navigate(-1);
            } else {
                throw new Error("Lỗi cập nhật");
            }
        } catch (error: unknown) {
            setInlineError(getApiErrorMessage(error, "Lưu thông tin thất bại"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Page className="detail-page" style={{ padding: 16 }}>
                <Text>Đang tải thông tin...</Text>
            </Page>
        );
    }

    return (
        <Page className="detail-page" hideScrollbar>
            <div className="jd-header">
                <div className="jd-header__back" onClick={() => navigate(-1)}>
                    <Icon icon="zi-arrow-left" size={24} />
                </div>
                <div className="jd-header__info">
                    <Text.Title size="normal" className="jd-header__name">
                        Cập nhật tài khoản
                    </Text.Title>
                </div>
            </div>

            <Box p={4} pb={10} className="jd-body">

                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Họ <span style={{ color: 'red' }}>*</span></Text>
                    <Input
                        placeholder="Nhập họ..."
                        value={form.last_name}
                        onChange={(e) => patchForm({ last_name: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Tên <span style={{ color: 'red' }}>*</span></Text>
                    <Input
                        placeholder="Nhập tên..."
                        value={form.first_name}
                        onChange={(e) => patchForm({ first_name: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Ngày sinh</Text>
                    <Input
                        placeholder="YYYY-MM-DD"
                        value={form.date_of_birth}
                        onChange={(e) => patchForm({ date_of_birth: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Số điện thoại <span style={{ color: 'red' }}>*</span></Text>
                    <Input
                        placeholder="Nhập số điện thoại..."
                        value={form.phone_number}
                        onChange={(e) => patchForm({ phone_number: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>
                        Email
                    </Text>
                    <Input
                        placeholder="Email"
                        value={form.email}
                        readOnly
                        disabled
                        style={{ opacity: 0.85 }}
                    />
                    <Text size="xSmall" style={{ marginTop: 6, color: "#667085" }}>
                        Email gắn với tài khoản, không thể chỉnh sửa tại đây.
                    </Text>
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Địa chỉ</Text>
                    <Input
                        placeholder="Nhập địa chỉ..."
                        value={form.address}
                        onChange={(e) => patchForm({ address: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Tỉnh/Thành phố</Text>
                    <Input
                        placeholder="Nhập tỉnh/thành phố..."
                        value={form.city}
                        onChange={(e) => patchForm({ city: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Tên công ty</Text>
                    <Input
                        placeholder="Nhập tên công ty..."
                        value={form.company_name}
                        onChange={(e) => patchForm({ company_name: e.target.value })}
                        clearable
                    />
                </Box>
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Số CCCD</Text>
                    <Input
                        placeholder="Nhập số CCCD..."
                        value={form.card_number}
                        onChange={(e) => patchForm({ card_number: e.target.value })}
                        clearable
                    />
                </Box>
                
                <Box mb={4}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Ảnh CCCD mặt trước</Text>
                    <div 
                        onClick={() => handleImageUpload('image_before_card')}
                        style={{ 
                            border: '1px dashed #ccc', 
                            borderRadius: 8, 
                            padding: 16, 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 120,
                            overflow: 'hidden'
                        }}
                    >
                        {form.image_before_card ? (
                            <img src={form.image_before_card} alt="Mặt trước" style={{ width: '100%', height: 'auto', maxHeight: 200, objectFit: 'contain' }} />
                        ) : (
                            <>
                                <Icon icon="zi-camera" style={{ fontSize: 32, color: '#888', marginBottom: 8 }} />
                                <Text size="small" style={{ color: '#888' }}>Nhấn để chụp/chọn ảnh</Text>
                            </>
                        )}
                    </div>
                </Box>

                <Box mb={6}>
                    <Text size="small" bold style={{ marginBottom: 8 }}>Ảnh CCCD mặt sau</Text>
                    <div 
                        onClick={() => handleImageUpload('image_after_card')}
                        style={{ 
                            border: '1px dashed #ccc', 
                            borderRadius: 8, 
                            padding: 16, 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 120,
                            overflow: 'hidden'
                        }}
                    >
                        {form.image_after_card ? (
                            <img src={form.image_after_card} alt="Mặt sau" style={{ width: '100%', height: 'auto', maxHeight: 200, objectFit: 'contain' }} />
                        ) : (
                            <>
                                <Icon icon="zi-camera" style={{ fontSize: 32, color: '#888', marginBottom: 8 }} />
                                <Text size="small" style={{ color: '#888' }}>Nhấn để chụp/chọn ảnh</Text>
                            </>
                        )}
                    </div>
                </Box>

                {inlineError ? (
                    <Box mb={3} role="alert">
                        <Text size="small" style={{ color: "#d92d20", lineHeight: 1.45 }}>
                            {inlineError}
                        </Text>
                    </Box>
                ) : null}

                <Button 
                    fullWidth 
                    onClick={handleSubmit} 
                    loading={saving}
                    size="large"
                >
                    Cập nhật
                </Button>
            </Box>
        </Page>
    );
};

export default ProfileUpdatePage;
