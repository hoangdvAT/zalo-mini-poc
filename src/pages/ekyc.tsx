import React, { useState } from "react";
import { Page, Header, Box, Text, Button, Icon, useNavigate, useSnackbar } from "zmp-ui";
import { chooseImage } from "zmp-sdk/apis";

const EkycPage: React.FC = () => {
    const navigate = useNavigate();
    const { openSnackbar } = useSnackbar();
    const [idFront, setIdFront] = useState<string | null>(null);
    const [idBack, setIdBack] = useState<string | null>(null);
    const [portrait, setPortrait] = useState<string | null>(null);

    const handleCaptureImage = async (type: "front" | "back" | "portrait") => {
        try {
            // Gọi API chooseImage của Zalo Mini App, ép dùng camera
            const result = await chooseImage({
                sourceType: ["camera"],
                cameraType: type === "portrait" ? "front" : "back",
            });

            if (result.filePaths && result.filePaths.length > 0) {
                const imagePath = result.filePaths[0];

                if (type === "front") setIdFront(imagePath);
                if (type === "back") setIdBack(imagePath);
                if (type === "portrait") setPortrait(imagePath);

                openSnackbar({
                    text: "Chụp ảnh thành công",
                    type: "success",
                    duration: 2000,
                });
            }
        } catch (error) {
            console.error("Camera error:", error);
            openSnackbar({
                text: "Không thể mở máy ảnh hoặc người dùng từ chối",
                type: "warning",
                duration: 3000,
            });
        }
    };

    const isFormValid = idFront && idBack && portrait;

    const handleSubmit = () => {
        if (!isFormValid) return;

        // Giả lập call API submit
        openSnackbar({
            text: "Đã gửi thông tin định danh thành công (POC)",
            type: "success",
            duration: 3000,
        });

        setTimeout(() => {
            navigate(-1);
        }, 1500);
    };

    return (
        <Page className="ekyc-page">
            <Header title="Xác thực định danh (eKYC)" showBackIcon={true} />

            <Box p={4} mt={14}>
                <Text size="normal" className="text-gray-600 mb-4">
                    Vui lòng chụp ảnh CCCD của bạn và ảnh khuôn mặt để hoàn tất hồ sơ nhận hoa hồng.
                </Text>

                {/* ID Front */}
                <Box mb={4}>
                    <Text size="normal" bold className="mb-2">1. Mặt trước CCCD</Text>
                    <div
                        onClick={() => handleCaptureImage("front")}
                        style={{
                            height: 160,
                            backgroundColor: "#F3F4F6",
                            borderRadius: 8,
                            border: "2px dashed #D1D5DB",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        {idFront ? (
                            <img src={idFront} alt="Mặt trước CCCD" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <>
                                <Icon icon="zi-camera" size={32} style={{ color: "#9CA3AF" }} />
                                <Text size="small" style={{ color: "#6B7280", marginTop: 8 }}>Chạm để chụp ảnh</Text>
                            </>
                        )}
                    </div>
                </Box>

                {/* ID Back */}
                <Box mb={4}>
                    <Text size="normal" bold className="mb-2">2. Mặt sau CCCD</Text>
                    <div
                        onClick={() => handleCaptureImage("back")}
                        style={{
                            height: 160,
                            backgroundColor: "#F3F4F6",
                            borderRadius: 8,
                            border: "2px dashed #D1D5DB",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        {idBack ? (
                            <img src={idBack} alt="Mặt sau CCCD" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <>
                                <Icon icon="zi-camera" size={32} style={{ color: "#9CA3AF" }} />
                                <Text size="small" style={{ color: "#6B7280", marginTop: 8 }}>Chạm để chụp ảnh</Text>
                            </>
                        )}
                    </div>
                </Box>

                {/* Portrait */}
                <Box mb={6}>
                    <Text size="normal" bold className="mb-2">3. Ảnh chân dung</Text>
                    <div
                        onClick={() => handleCaptureImage("portrait")}
                        style={{
                            height: 160,
                            backgroundColor: "#F3F4F6",
                            borderRadius: 8,
                            border: "2px dashed #D1D5DB",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        {portrait ? (
                            <img src={portrait} alt="Ảnh chân dung" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <>
                                <Icon icon="zi-user-circle" size={32} style={{ color: "#9CA3AF" }} />
                                <Text size="small" style={{ color: "#6B7280", marginTop: 8 }}>Chạm để chụp ảnh rõ mặt</Text>
                            </>
                        )}
                    </div>
                </Box>

                <Button
                    variant="primary"
                    fullWidth
                    size="large"
                    disabled={!isFormValid}
                    onClick={handleSubmit}
                    className="mb-8"
                >
                    Gửi thông tin xác thực
                </Button>
            </Box>
        </Page>
    );
};

export default EkycPage;
