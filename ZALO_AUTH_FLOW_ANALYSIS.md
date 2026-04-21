# Phân tích Zalo Authentication Flow

## Flow chuẩn theo Zalo Documentation

```
1. Frontend: getAccessToken() 
   ↓
2. Gửi accessToken lên Backend (POST /auth/zalo)
   ↓
3. Backend: Gọi Zalo Open API (graph.zalo.me) với accessToken
   ↓
4. Backend: Nhận Zalo Profile (id, name, avatar, phone)
   ↓
5. Backend: Tìm/tao user trong database
   ↓
6. Backend: Tạo JWT token của hệ thống bạn
   ↓
7. Backend: Trả về { token, user, isNewUser }
   ↓
8. Frontend: Lưu token và chuyển hướng
```

---

## ❌ Vấn đề trong code hiện tại

### 1. **Frontend gọi thừa getUserInfo() và getPhoneNumber()**

**Vị trí:** [`src/pages/login.tsx`](src/pages/login.tsx:33-123) - hàm `performZaloAuth()`

**Code hiện tại (Sai):**
```typescript
// Step 1: Get user info (name + avatar) from Zalo
const userInfo = await getUserInfo({});  // ❌ KHÔNG CẦN

// Step 2: Get phone number token from Zalo
const phoneResult = await getPhoneNumber({});  // ❌ KHÔNG CẦN

// Step 3: Get Zalo access token
const zaloToken = await getAccessToken();

// Step 4: Login with backend
const res = await loginWithZalo({ accessToken: zaloToken });
```

**Vấn đề:**
- `getUserInfo()` và `getPhoneNumber()` là Zalo SDK APIs **chỉ dùng cho frontend**
- Nhưng theo flow chuẩn, **Backend mới là nơi verify** với Zalo Open API
- Frontend chỉ cần `getAccessToken()` rồi gửi lên backend

### 2. **Backend chưa thực sự verify với Zalo**

**Vị trí:** [`src/services/auth.ts`](src/services/auth.ts:49-68) - hàm `loginWithZalo()`

**Code hiện tại (Mock):**
```typescript
export async function loginWithZalo(
  params: LoginWithZaloParams
): Promise<LoginWithZaloResponse> {
  await delay(600); // Simulate network

  if (!params.accessToken) {
    throw new Error("Access token không hợp lệ");
  }

  // Mock: luôn trả user đã đăng ký
  const isNew = params.accessToken.includes("new");
  const user = isNew ? MOCK_NEW_USER : MOCK_USER;

  return {
    token: MOCK_JWT,
    user: { ...user, isNewUser: isNew },
    isNewUser: isNew,
  };
}
```

**Vấn đề:**
- Không gọi Zalo Open API để verify access token
- Không lấy được thông tin thực từ Zalo
- Chỉ trả về mock data

---

## ✅ **Giải pháp sửa lỗi**

### **Sửa 1: Frontend - Chỉ gọi getAccessToken()**

File: [`src/pages/login.tsx`](src/pages/login.tsx)

```typescript
const performZaloAuth = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    // ✅ CHỈ lấy access token
    let zaloToken: string;
    try {
      zaloToken = await getAccessToken();
      if (!zaloToken) {
        throw new Error("Không nhận được access token từ Zalo");
      }
      console.log("[Auth] Zalo access token:", zaloToken);
    } catch (sdkErr: any) {
      console.warn("[Auth] getAccessToken failed:", sdkErr);
      // Dev mode fallback
      if (sdkErr?.code === -1401) {
        console.log("[Auth] Dev Mode detected, using mock token");
        zaloToken = "dev_mock_token_" + Date.now();
      } else {
        throw sdkErr;
      }
    }

    // Gửi access token lên backend (real API)
    const res = await loginWithZalo({
      accessToken: zaloToken,
    });

    // Backend đã verify và trả về user info đầy đủ
    setAuth(res.token, res.user);

    if (res.isNewUser) {
      navigate("/register", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  } catch (err) {
    console.error("[Auth] Login flow error:", err);
    setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    setStep("manual");
  } finally {
    setLoading(false);
  }
}, [setAuth, navigate]);
```

**Thay đổi:**
- ✅ Xóa `getUserInfo()` và `getPhoneNumber()`
- ✅ Chỉ giữ `getAccessToken()`
- ✅ Backend sẽ trả về `user` với đầy đủ `name`, `avatar`, `phone`

---

### **Sửa 2: Backend - Verify với Zalo Open API**

File: [`src/services/auth.ts`](src/services/auth.ts)

**Cần thay đổi từ mock sang real API call:**

```typescript
import axios from "axios";

// Zalo Open API endpoint
const ZALO_GRAPH_API = "https://graph.zalo.me/v2.0/me";

export async function loginWithZalo(
  params: LoginWithZaloParams
): Promise<LoginWithZaloResponse> {
  if (!params.accessToken) {
    throw new Error("Access token không hợp lệ");
  }

  try {
    // 1. Gọi Zalo Open API để verify token và lấy profile
    const response = await axios.get(ZALO_GRAPH_API, {
      params: {
        access_token: params.accessToken,
        fields: "id,name,picture,phone"  // Request fields bạn cần
      }
    });

    const zaloProfile = response.data;

    if (!zaloProfile || !zaloProfile.id) {
      throw new Error("Invalid Zalo profile");
    }

    // 2. Tìm user trong database theo zalo_id
    // TODO: Thay bằng actual DB query
    const existingUser = await findUserByZaloId(zaloProfile.id);

    if (existingUser) {
      // User đã tồn tại → Login
      const user: AuthUser = {
        id: existingUser.id,
        name: existingUser.name || zaloProfile.name,
        avatar: existingUser.avatar || zaloProfile.picture?.data?.url,
        phone: existingUser.phone || zaloProfile.phone,
        isNewUser: false,
      };

      // Tạo JWT token của hệ thống bạn
      const token = await generateJwtToken(user);

      return {
        token,
        user,
        isNewUser: false,
      };
    } else {
      // User mới → Tạo account mới
      const newUser = await createUserFromZalo(zaloProfile);

      const user: AuthUser = {
        id: newUser.id,
        name: newUser.name,
        avatar: newUser.avatar,
        phone: newUser.phone,
        isNewUser: true,
      };

      const token = await generateJwtToken(user);

      return {
        token,
        user,
        isNewUser: true,
      };
    }
  } catch (error: any) {
    console.error("[Auth] Zalo verification failed:", error);

    if (error.response?.status === 401) {
      throw new Error("Access token không hợp lệ hoặc đã hết hạn");
    }

    throw error;
  }
}

// TODO: Implement these functions
async function findUserByZaloId(zaloId: string): Promise<any> {
  // Query database: SELECT * FROM users WHERE zalo_id = ?
  return null; // Placeholder
}

async function createUserFromZalo(profile: any): Promise<any> {
  // Insert new user: INSERT INTO users (zalo_id, name, avatar, phone) VALUES (?, ?, ?, ?)
  return { id: "new_user_id", ...profile }; // Placeholder
}

async function generateJwtToken(user: AuthUser): Promise<string> {
  // TODO: Use your JWT library (jsonwebtoken, jose, etc.)
  // return jwt.sign({ userId: user.id, ... }, SECRET_KEY, { expiresIn: '7d' });
  return "your_jwt_token_here"; // Placeholder
}
```

**Lưu ý quan trọng:**
1. **Không lưu Zalo access token** vào database (không cần thiết, chỉ dùng 1 lần để verify)
2. **Lưu Zalo user ID** (zalo_id) để mapping với user trong DB
3. **Tạo JWT token riêng** của hệ thống bạn (không dùng Zalo token)
4. **Xử lý errors**:
   - 401: Token invalid/expired
   - 403: User denied permissions
   - 500: Zalo API error

---

## 📋 **Checklist Implementation**

### Frontend (`src/pages/login.tsx`)
- [x] Loại bỏ `getUserInfo()` và `getPhoneNumber()`
- [x] Chỉ giữ `getAccessToken()`
- [x] Gửi accessToken lên backend
- [x] Backend trả về user info → hiển thị tên/avatar

### Backend (Cần implement)
- [ ] Tạo endpoint `POST /auth/zalo`
- [ ] Verify access token với Zalo Graph API: `GET https://graph.zalo.me/v2.0/me`
- [ ] Request fields: `id,name,picture,phone`
- [ ] Tìm user theo `zalo_id` trong DB
- [ ] Nếu chưa có → tạo user mới
- [ ] Tạo JWT token của hệ thống
- [ ] Trả về `{ token, user, isNewUser }`
- [ ] Xử lý errors (401, 403, 500)

### Database
- [ ] Table `users` có column: `zalo_id` (unique), `name`, `avatar`, `phone`
- [ ] Index trên `zalo_id` cho query nhanh

---

## 🔍 **Testing**

### Test flow trong Zalo Mini App DevTools:

1. **Dev Mode** (code -1401):
   - Frontend sẽ dùng mock token
   - Backend cần xử lý mock token trong dev (có thể skip verify)

2. **Production Mode**:
   - Zalo SDK trả về real access token
   - Backend verify với Zalo Graph API
   - Lấy được thông tin thực

### Kiểm tra backend API:
```bash
# Test với real access token từ Zalo
curl -X POST https://your-api.com/auth/zalo \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "REAL_ZALO_ACCESS_TOKEN"}'

# Expected response:
{
  "token": "your_jwt_token",
  "user": {
    "id": "user_123",
    "name": "Nguyễn Văn A",
    "avatar": "https://...",
    "phone": "090xxxxxx"
  },
  "isNewUser": false
}
```

---

## 📚 **References**

- [Zalo Open API - Get Profile](https://miniapp.zaloplatforms.com/documents/intro/authen-user/)
- [Zalo SDK - getAccessToken()](https://miniapp.zaloplatforms.com/documents/api/authen/)
- [Zalo Graph API v2.0](https://graph.zalo.me/v2.0/me)

---

## ⚠️ **Lưu ý quan trọng**

1. **Không tin cậy access token từ frontend** - Backend luôn verify với Zalo
2. **Không dùng Zalo access token làm JWT** - Tạo JWT riêng của hệ thống
3. **Xử lý user từ chối permissions** - Nếu user từ chối, `getAccessToken()` sẽ fail → chuyển sang manual login
4. **Dev mode** - Cần có cách bypass verify (như đang làm với mock token)
5. **Phone number** - Chỉ có nếu user cấp quyền `getPhoneNumber()` (nhưng backend verify từ Zalo API sẽ có số nếu user cho phép)

---

**Kết luận:** Ứng dụng hiện tại chưa đúng flow chuẩn. Cần sửa cả frontend và backend như hướng dẫn trên.
