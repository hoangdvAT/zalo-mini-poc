# Backend Integration Guide

## Tổng quan

Ứng dụng Zalo Mini App đã được cập nhật để tích hợp với Scalef backend API thực. Dưới đây là các thay đổi và yêu cầu backend.

---

## 📋 Endpoints cần có trên Backend

### 1. Authentication

#### `POST /auth/zalo`
**Mục đích:** Xác thực Zalo access token và tạo JWT token của hệ thống.

**Request:**
```json
{
  "accessToken": "zalo_access_token_from_sdk"
}
```

**Response (Success 200):**
```json
{
  "token": "your_jwt_token_here",
  "user": {
    "id": "user_123",
    "name": "Nguyễn Văn A",
    "avatar": "https://...",
    "phone": "090xxxxxx",
    "isNewUser": false
  },
  "isNewUser": false
}
```

**Logic backend:**
1. Nhận `accessToken` từ frontend
2. Gọi Zalo Open API: `GET https://graph.zalo.me/v2.0/me?access_token={accessToken}&fields=id,name,picture,phone`
3. Verify response (nếu lỗi 401 → trả về 401)
4. Tìm user trong DB theo `zalo_id` (từ Zalo profile `id`)
5. Nếu chưa có → tạo user mới (`isNewUser: true`)
6. Tạo JWT token của hệ thống và trả về

**Lưu ý:**
- Không lưu Zalo access token (chỉ dùng 1 lần để verify)
- Lưu `zalo_id` để mapping user

---

### 2. Publisher/User Profile

#### `GET /api/v1/publishers/me`
**Mục đích:** Lấy thông tin publisher hiện tại, bao gồm `ad_space_code`.

**Request Headers:**
```
Authorization: Bearer {your_jwt_token}
```

**Response (Success 200):**
```json
{
  "data": {
    "ad_space_code": "ADS000000003",
    "user": {
      "id": 18,
      "name": "Publisher Name",
      "email": "...",
      // other fields
    }
  }
}
```

**Dùng để:**
- Lấy `ad_space_code` để tạo tracking links
- Hiển thị thông tin user

---

### 3. Campaigns (Hiện tại có sẵn)

#### `GET /api/v1/campaigns/without-contract`
**Mục đích:** Lấy danh sách campaigns (chưa có contract).

**Query Params:**
- `page` (optional)
- `filters[name]` (optional)
- `filters[category_ids]` (optional, comma-separated)
- `filters[type_ids]` (optional)
- `filters[area_ids]` (optional)
- `sort` (optional, e.g., "label,0")

**Response:**
```json
{
  "campaigns": [ ... ],
  "meta": {
    "total": 9,
    "per_page": 20,
    "current_page": 1,
    "last_page": 1
  }
}
```

#### `GET /api/v1/campaigns/{id}`
**Mục đích:** Lấy chi tiết campaign.

**Response:**
```json
{
  "campaign": { ... }
}
```

---

### 4. Tracking Links (Deep Links)

#### `POST /api/v1/ad-spaces/deep-link`
**Mục đích:** Tạo tracking link cho campaign.

**Request Headers:**
```
Authorization: Bearer {your_jwt_token}
```

**Request Body:**
```json
{
  "ad_space_code": "ADS000000003",
  "campaign_id": 21,
  "deep_link": "undefinedCON000000043/?source=deeplink_generator&url=https%3A%2F%2F...",
  "utm_source": "",
  "utm_campaign": "",
  "utm_content": "",
  "utm_medium": "",
  "utm_term": "",
  "sub": "",
  "sub_1": "",
  "sub_2": "",
  "sub_3": "",
  "sub_4": "",
  "contract": "CON000000043",
  "redirect_url": "https://sun-business.demo.scalef.com/campaigns/create",
  "is_short_link": false,
  "is_qr_code": false
}
```

**Response:**
```json
{
  "deepLink": {
    "ad_space_code": "ADS000000003",
    "deep_link": "https://ADS000000003.tracking-demo.scalef.com/c/v3/CON000000043/?...",
    "campaign_id": 21,
    "shortlink": null,
    "utm_source": "",
    "utm_campaign": "",
    // ...
  },
  "tracking_link": null,
  "shareLink": "https://shorten-demo.scalef.com/ZgDcN8s4",
  "shorten": null
}
```

**Lưu ý:**
- `contract` cần được lấy từ `GET /api/v1/contracts/campaign/{campaign_id}`
- `deep_link` và `redirect_url` cần được build đúng format

---

#### `GET /api/v1/ad-spaces/{ad_space_code}/campaign/{campaign_id}/deep-link`
**Mục đích:** Lấy danh sách tracking links đã tạo của một campaign.

**Response:**
```json
{
  "deepLink": [ ... ],
  "meta": {
    "total": 1,
    "per_page": 5,
    "current_page": 1,
    "last_page": 1
  }
}
```

---

### 5. Contracts

#### `GET /api/v1/contracts/campaign/{campaign_id}?status=1,2,3,4,5,6`
**Mục đích:** Lấy danh sách contracts của campaign.

**Response:**
```json
{
  "contract": [ ... ],
  "meta": {
    "domain_deeplink": "https://c.demo.scalef.com/c/v2/"
  }
}
```

**Dùng để:**
- Lấy `contract_code` để tạo tracking link
- Kiểm tra trạng thái contract

---

## 🔄 Flow tạo Tracking Link (Chi tiết)

```
1. User vào trang chi tiết campaign
   ↓
2. User nhấn "Lấy link" → navigate to /get-link/:id
   ↓
3. Frontend fetch campaign detail (GET /api/v1/campaigns/:id)
   ↓
4. Frontend fetch contracts của campaign (GET /api/v1/contracts/campaign/:id)
   ↓
5. User chọn/điền URL sản phẩm
   ↓
6. User nhấn "Tạo link affiliate"
   ↓
7. Frontend POST /api/v1/ad-spaces/deep-link với:
   - ad_space_code (từ user profile)
   - campaign_id
   - contract (lấy từ step 4)
   - redirect_url (URL sản phẩm)
   - UTM params (optional)
   ↓
8. Backend trả về deep_link và shareLink
   ↓
9. Frontend hiển thị link, user có thể:
   - Copy link
   - Mở link (openOutApp)
   - Chia sẻ
```

---

## ⚠️ Issues cần lưu ý

### 1. `ad_space_code` từ đâu?
- Khi user đăng nhập, backend cần lưu `ad_space_code` vào user profile
- Hoặc có endpoint riêng để publisher tạo/quản lý ad spaces
- Frontend cần fetch profile sau khi login để lấy `ad_space_code`

### 2. `contract` code
- Mỗi campaign có thể có nhiều contracts (cho不同 ad spaces)
- Cần chọn contract phù hợp với `ad_space_code` của publisher
- Hiện tại code lấy contract đầu tiên có status hợp lệ

### 3. `deep_link` format
- Từ curl example: `deep_link` có format: `https://{ad_space_code}.tracking-demo.scalef.com/c/v3/{contract}/?url={encoded_url}&...`
- Backend cần build đúng format này

### 4. Report APIs
- Hiện tại đang dùng endpoint cũ (`/gateway-service/...`)
- Cần update sang endpoint mới nếu backend có

---

## 🛠️ Cần implement thêm

### Backend:
- [ ] `/auth/zalo` - verify Zalo token
- [ ] `/api/v1/publishers/me` - get publisher profile với `ad_space_code`
- [ ] (Optional) `/api/v1/ad-spaces` - list ad spaces nếu cần
- [ ] (Optional) Report endpoints mới nếu có thay đổi

### Frontend (đã làm, cần test):
- [x] Cập nhật auth flow (chỉ dùng `getAccessToken`)
- [x] Cập nhật API endpoints sang `/api/v1/...`
- [x] Cập nhật types cho Campaign
- [x] Cập nhật HomePage, JobDetailPage
- [x] Cập nhật GetLinkPage với real API
- [ ] Fetch `ad_space_code` sau khi login
- [ ] Lấy `contract` code trước khi tạo link
- [ ] Update report page với API mới

---

## 🧪 Testing

### 1. Test Auth Flow
```bash
# Trong Zalo DevTools, click "Đăng nhập với Zalo"
# Kiểm tra:
# - getAccessToken() thành công
# - POST /auth/zalo với token
# - Nhận JWT token và user info
# - Chuyển đến /register nếu isNewUser
```

### 2. Test Campaign List
```bash
# Vào Home Page
# Kiểm tra:
# - GET /api/v1/campaigns/without-contract
# - Hiển thị danh sách campaigns
# - Click vào campaign → navigate to /job/:id
```

### 3. Test Create Tracking Link
```bash
# Vào trang chi tiết campaign
# Nhấn "Lấy link"
# Kiểm tra:
# - GET /api/v1/campaigns/:id
# - GET /api/v1/contracts/campaign/:id
# - POST /api/v1/ad-spaces/deep-link
# - Hiển thị shareLink/deep_link
# - Copy và mở link hoạt động
```

---

## 📞 Contact

Nếu có vấn đề với backend API, kiểm tra:
1. CORS headers (cho phép domain từ Zalo Mini App)
2. JWT token expiration
3. Rate limiting
4. Logs để debug request/response
