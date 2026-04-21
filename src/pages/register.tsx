import React, { useState } from "react";
import { Page, Box, Text, Input, Button, Icon, useSnackbar, Modal, Spinner } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { userAtom } from "@/state/auth";
import { registerUser } from "@/services/auth";

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { openSnackbar } = useSnackbar();
    
    const [user, setUser] = useAtom(userAtom);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: user?.name || "",
        phone: user?.phone || "",
        email: "",
    });

    const [errors, setErrors] = useState({
        name: "",
        phone: "",
        email: "",
    });

    const handleChange = (field: keyof typeof form) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setForm({ ...form, [field]: e.target.value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: "" });
        }
    };

    const validate = () => {
        let valid = true;
        const newErrors = { name: "", phone: "", email: "" };

        if (!form.name.trim()) {
            newErrors.name = "Vui lòng nhập họ và tên";
            valid = false;
        }
        if (!form.phone.trim() || form.phone.length < 9) {
            newErrors.phone = "Số điện thoại không hợp lệ";
            valid = false;
        }
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
            newErrors.email = "Email không hợp lệ";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        
        try {
            setLoading(true);
            const registeredUser = await registerUser(form);
            
            // Update global user state
            setUser(registeredUser);
            
            openSnackbar({
                type: "success",
                text: "Đăng ký tài khoản thành công!",
                duration: 3000,
            });

            // Redirect to home
            setTimeout(() => {
                navigate("/", { replace: true });
            }, 500);
            
        } catch (error) {
            openSnackbar({
                type: "error",
                text: "Có lỗi xảy ra, vui lòng thử lại.",
                duration: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Page className="page-with-safe-area" hideScrollbar>
            <Box p={4} style={{ backgroundColor: "var(--primary)", height: 160, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <Text.Title size="large" style={{ color: "white", marginBottom: 8 }}>
                    Hoàn tất hồ sơ
                </Text.Title>
                <Text size="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                    Xin vui lòng bổ sung thông tin để nhận hoa hồng
                </Text>
            </Box>

            <Box p={4} mt={-4} style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: "calc(100vh - 160px)" }}>
                <Box mb={5}>
                    <Text size="small" bold style={{ marginBottom: 4 }}>Họ và tên (*)</Text>
                    <Input
                        placeholder="Nhập họ và tên"
                        value={form.name}
                        onChange={handleChange("name")}
                        status={errors.name ? "error" : "default"}
                        errorText={errors.name}
                        prefix={<Icon icon="zi-user" />}
                        clearable
                    />
                </Box>

                <Box mb={5}>
                    <Text size="small" bold style={{ marginBottom: 4 }}>Số điện thoại (*)</Text>
                    <Input
                        placeholder="Nhập số điện thoại"
                        value={form.phone}
                        onChange={handleChange("phone")}
                        status={errors.phone ? "error" : "default"}
                        errorText={errors.phone}
                        prefix={<Icon icon="zi-call" />}
                        clearable
                    />
                </Box>

                <Box mb={8}>
                    <Text size="small" bold style={{ marginBottom: 4 }}>Email liên hệ (*)</Text>
                    <Input
                        placeholder="Nhập địa chỉ email"
                        value={form.email}
                        onChange={handleChange("email")}
                        status={errors.email ? "error" : "default"}
                        errorText={errors.email}
                        prefix={<Icon icon="zi-at" />}
                        clearable
                    />
                </Box>

                <Button 
                    fullWidth 
                    size="large" 
                    onClick={handleSubmit} 
                    loading={loading}
                    style={{ backgroundColor: "var(--primary)" }}
                >
                    Hoàn tất đăng ký
                </Button>
                
                <Box mt={4} flex justifyContent="center">
                    <Text size="xSmall" color="text.secondary" style={{ textAlign: "center" }}>
                        Bằng việc bấm đăng ký, bạn đồng ý với các<br/>
                        <span style={{ color: "var(--primary)", fontWeight: 600 }}>Điều khoản sử dụng</span> của hệ thống.
                    </Text>
                </Box>
            </Box>
            <Modal
                visible={loading}
                unmountOnClose
                maskClosable={false}
                verticalActions
            >
                <Box flex flexDirection="column" alignItems="center" p={4}>
                    <Spinner visible />
                    <Text size="normal" style={{ marginTop: 16 }}>Đang xử lý đăng ký...</Text>
                </Box>
            </Modal>
        </Page>
    );
};

export default RegisterPage;
