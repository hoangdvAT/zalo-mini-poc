# Kế hoạch Flow: Đăng nhập → Đăng ký → Lấy link chia sẻ ngay

> Flow: Vào Zalo Mini App → Login Zalo (nếu chưa) → Đăng ký tài khoản (nếu mới) → Đăng ký campaign tự động + Lấy link chia sẻ luôn.

---

## 1. Tổng quan Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER VÀO ZALO MINI APP                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHECK AUTH: Đã login backend chưa? (có token hợp lệ)                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │ YES                                              │ NO
         ▼                                                  ▼
┌─────────────────────┐                    ┌──────────────────────────────────┐
│  ĐÃ LOGIN            │                    │  CHƯA LOGIN                        │
│  → Vào Trang chủ     │                    │  → Gọi login() Zalo SDK           │
│  (hoặc redirect      │                    │  → Lấy accessToken                 │
│   theo intent)       │                    │  → Gửi lên backend                  │
└─────────────────────┘                    └──────────────────────────────────┘
                                                          │
                                                          ▼
                                            ┌──────────────────────────────────┐
                                            │  BACKEND: User đã tồn tại?         │
                                            └──────────────────────────────────┘
                                                   │ YES          │ NO
                                                   ▼             ▼
                                         ┌─────────────┐  ┌─────────────────────┐
                                         │ Return JWT  │  │  ĐĂNG KÝ TÀI KHOẢN   │
                                         │ → Vào app   │  │  (register by Zalo)  │
                                         └─────────────┘  └─────────────────────┘
                                                                   │
                                                                   ▼
                                                         ┌──────────────────────┐
                                                         │  Form đăng ký (nếu   │
                                                         │  cần thêm thông tin) │
                                                         │  hoặc auto từ Zalo   │
                                                         └──────────────────────┘
                                                                   │
                                                                   ▼
                                                         ┌──────────────────────┐
                                                         │  Đăng ký xong        │
                                                         │  → Vào Trang chủ     │
                                                         └──────────────────────┘
```

---

## 2. Flow "Đăng ký campaign + Lấy link ngay"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER CHỌN CHIẾN DỊCH (từ Trang chủ hoặc Chi tiết)                           │
│  → Bấm "Chia sẻ nhận hoa hồng" / "Lấy link ngay"                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND: 1 lần gọi (hoặc pipeline):                                         │
│  - Đăng ký campaign (nếu chưa đăng ký)                                         │
│  - Tạo tracking link                                                         │
│  → Trả về: { link, short_url, campaign_name, ... }                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  HIỂN THỊ NGAY: Share Sheet / Get Link Page                                  │
│  - Copy link                                                                 │
│  - Chia sẻ Zalo, FB, TikTok, …                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Các màn hình / tính năng cần triển khai

### 3.1 Auth & Onboarding

| # | Màn hình / Tính năng | Mô tả | Component / API |
|---|----------------------|-------|------------------|
| 1 | **Auth Gate (Middleware)** | Check token khi vào app. Chưa có → redirect Login | `useAuth`, route guard |
| 2 | **Màn Login** | "Đăng nhập bằng Zalo" – gọi `login()` từ zmp-sdk | `login` từ `zmp-sdk/apis` |
| 3 | **Backend: Login bằng Zalo** | Nhận accessToken Zalo → verify user → trả JWT | API `/auth/zalo` |
| 4 | **Màn Đăng ký (nếu user mới)** | Form hoặc bước đăng ký affiliate/publisher | FormCard, TextInput, Button |
| 5 | **Backend: Đăng ký** | Tạo publisher/affiliate account từ thông tin Zalo | API `/auth/register` |

### 3.2 Campaign & Share

| # | Màn hình / Tính năng | Mô tả | Component / API |
|---|----------------------|-------|------------------|
| 6 | **Đăng ký campaign + Tạo link (1 bước)** | API gộp: register campaign (nếu cần) + create link | API `/publisher/affiliate/campaign-register-and-link` |
| 7 | **Share Sheet (Bottom Sheet)** | Hiển thị ngay sau khi có link: Copy, chia sẻ Zalo/FB/… | ShareBottomSheet, ShareContentCard |
| 8 | **Deep link / Entry point** | Mở app từ link chiến dịch → đi thẳng tới "Lấy link" | Route `/campaign/:id/get-link` |

### 3.3 Entry Routes

| # | Route | Khi nào dùng |
|---|-------|--------------|
| 1 | `/` | Trang chủ (sau khi login) |
| 2 | `/login` | Chưa login → redirect |
| 3 | `/register` | User mới (sau login Zalo, backend báo chưa có tài khoản) |
| 4 | `/campaign/:id` | Chi tiết chiến dịch |
| 5 | `/campaign/:id/get-link` | Lấy link ngay (có thể mở trực tiếp từ deep link) |

---

## 4. Chi tiết từng phần

### 4.1 Zalo Login (Frontend)

```ts
// zmp-sdk/apis
import { login, getAccessToken } from "zmp-sdk/apis";

// Option 1: login() – popup Zalo auth
login({
  success: async (data) => {
    // data có accessToken hoặc code tùy phiên bản
    const token = data.accessToken || data; // cần verify với docs
    await backendLoginWithZalo(token);
  },
  fail: (err) => {
    // User hủy hoặc lỗi
  },
});

// Option 2 (2024): getAccessToken trước, gửi lên backend
// Xem: https://stc-zmp.zadn.vn/zmp-docs/v2.4.4/intro/authen-user/
```

**Lưu ý:** Từ 2024, Zalo yêu cầu dùng `getAccessToken` và backend gọi `https://graph.zalo.me/v2.0/me` với access_token + appsecret_proof.

### 4.2 Backend API (Cần triển khai / mở rộng)

| Endpoint | Method | Mô tả |
|---------|--------|-------|
| `POST /auth/zalo` | POST | Nhận `{ accessToken }` Zalo → verify → trả `{ token, user, isNewUser }` |
| `POST /auth/register` | POST | Đăng ký publisher (dùng cho user mới, có thể gộp vào `/auth/zalo`) |
| `POST /publisher/affiliate/campaign-register-and-link` | POST | Đăng ký campaign + tạo link trong 1 request. Body: `{ campaign_id, default_url? }` |

**Response mẫu `campaign-register-and-link`:**

```json
{
  "registered": true,
  "link": {
    "id": "xxx",
    "url": "https://...",
    "short_url": "https://shorten.asia/xxx",
    "campaign_name": "...",
    "created_at": "..."
  }
}
```

### 4.3 State & Auth

| Atom / Hook | Mục đích |
|-------------|----------|
| `authTokenAtom` | JWT từ backend (đã có) |
| `userAtom` | Thông tin user: `{ id, name, avatar, phone?, isRegistered }` |
| `useAuth()` | Hook: check token, redirect login, logout |
| `useRequireAuth()` | Guard: redirect `/login` nếu chưa login |

### 4.4 Giao diện cần có / cần bổ sung

| Màn hình | Trạng thái hiện tại | Hành động |
|----------|---------------------|-----------|
| **Login** | Profile có nút "Đăng nhập (Thử nghiệm)" dummy | Tạo `/login` riêng, gọi Zalo `login` thật |
| **Register** | Chưa có | Tạo `/register` – form hoặc wizard (SĐT, email, … nếu backend yêu cầu) |
| **Auth Gate** | Chưa có | Thêm route guard: check token trước khi vào app |
| **Share Sheet** | Get-link page có form tạo link | Thêm ShareBottomSheet; sau khi có link → mở sheet với Copy + Share |
| **Entry từ campaign** | Có `/get-link/:id` | Giữ; thêm route `/campaign/:id/get-link` nếu cần deep link |

---

## 5. Roadmap triển khai

### Phase 1: Auth cơ bản (1–2 tuần) ✅ ĐÃ TRIỂN KHAI (Mock)

| Task | Mô tả | Trạng thái |
|------|-------|------------|
| 1.1 | Tích hợp Zalo `getAccessToken` (fallback mock khi SDK fail) | ✅ |
| 1.2 | Tạo màn `/login` – nút "Đăng nhập bằng Zalo" | ✅ |
| 1.3 | Mock API `loginWithZalo()` – `services/auth.ts` | ✅ |
| 1.4 | Lưu JWT vào `authTokenAtom`, set vào axios, persist localStorage | ✅ |
| 1.5 | AuthGuard: chưa token → redirect `/login` | ✅ |
| 1.6 | Logout: xóa token + storage, redirect `/login` | ✅ |

### Phase 2: Đăng ký user mới (1 tuần)

| Task | Mô tả |
|------|-------|
| 2.1 | Backend: `/auth/zalo` trả thêm `isNewUser: true` nếu chưa có tài khoản |
| 2.2 | Tạo màn `/register` – form đăng ký (hoặc auto từ Zalo nếu backend hỗ trợ) |
| 2.3 | Sau đăng ký thành công → redirect Trang chủ |
| 2.4 | (Tùy chọn) Ký hợp đồng điện tử – dùng Form components đã plan |

### Phase 3: Đăng ký campaign + Lấy link 1 bước (1–2 tuần)

| Task | Mô tả |
|------|-------|
| 3.1 | Backend: API `campaign-register-and-link` – đăng ký campaign + tạo link |
| 3.2 | Job Detail: CTA "Chia sẻ nhận hoa hồng" gọi API mới (1 lần) |
| 3.3 | Sau khi có link → mở ShareBottomSheet ngay (copy + share) |
| 3.4 | Tối ưu: Loading state, error handling, retry |
| 3.5 | (Tùy chọn) Deep link: mở app với `campaign_id` → đi thẳng tới Get Link |

### Phase 4: Polish & QA

| Task | Mô tả |
|------|-------|
| 4.1 | UX: Thông báo lỗi rõ ràng (đăng nhập fail, đăng ký fail, tạo link fail) |
| 4.2 | Persist token (localStorage / zmp storage) – tránh mất khi reload |
| 4.3 | Refresh token (nếu backend hỗ trợ) |
| 4.4 | Test flow đầy đủ: Login → Register (nếu mới) → Chọn campaign → Lấy link → Share |

---

## 6. Component cần bổ sung (theo COMPONENT-BASE-PLAN)

| Component | Dùng cho |
|-----------|----------|
| **ShareBottomSheet** | Mở ngay sau khi có link; Copy, Share Zalo/FB |
| **AuthGuard** | Wrapper route – check token, redirect login |
| **LoginPage** | Màn login riêng với Zalo |
| **RegisterPage** | Form đăng ký (nếu cần) |

---

## 7. Câu hỏi cần làm rõ với Backend

1. **API Login Zalo:** Backend đã có endpoint nhận `accessToken` Zalo và trả JWT chưa?
2. **Đăng ký user:** Tạo publisher/affiliate chỉ từ thông tin Zalo hay cần form bổ sung (SĐT, email, MST)?
3. **Đăng ký campaign:** Hiện có API riêng cho "register campaign" không? Có thể gộp với "create link" thành 1 API không?
4. **Token persist:** Lưu JWT ở đâu (localStorage, zmp storage)? Có cơ chế refresh token không?

---

## 8. Tài liệu tham khảo

- [Zalo Mini App - Login / Authen User](https://stc-zmp.zadn.vn/zmp-docs/v2.4.4/intro/authen-user/)
- [Zalo Mini App - getOauthV1Code / getAccessToken](https://docs.zalopay.vn/docs/miniapp/user/get-auth-code)
- [COMPONENT-BASE-PLAN.md](./COMPONENT-BASE-PLAN.md) – Component Share, Form đã đề xuất
