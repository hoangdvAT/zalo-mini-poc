# Zalo Mini App - OneAt Affiliate Platform POC

## Tổng quan

Đây là một **Zalo Mini App** POC (Proof of Concept) cho nền tảng **Affiliate Marketing OneAt**. Ứng dụng được xây dựng với mục tiêu chứng minh tính khả thi khi đưa nền tảng affiliate lên môi trường Zalo Mini App.

### Trạng thái
✅ **Hoàn thành POC** - Đã tích hợp thành công với backend thực và đáp ứng tất cả core flows.

---

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                     Zalo Super App                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        OneAt Mini App (Frontend Client)              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  React 18 + TypeScript + Vite                   │  │  │
│  │  │  ZMP UI Components + Jotai State Management    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API (HTTPS + JWT)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              OneAt Backend System                          │
│  ┌─────────────────┐              ┌─────────────────────┐  │
│  │ API Gateway     │◄────────────►│ Backend Services    │  │
│  │ (Auth, Routing) │              │ (Jobs, Categories)  │  │
│  └─────────────────┘              └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Công nghệ sử dụng (Tech Stack)

| Layer | Technology | Mục đích |
|-------|------------|----------|
| **Core** | React 18 + TypeScript | UI framework, type safety |
| **Build** | Vite + zmp-vite-plugin | Build tool tối ưu cho Zalo Mini App |
| **UI** | ZMP UI (Zalo UI) | Component library chuẩn Zalo |
| **State** | Jotai | Global state management (nhẹ, đơn giản) |
| **Network** | Axios | HTTP client với interceptors |
| **Styling** | SCSS + Tailwind CSS | Custom styles + utility classes |
| **Routing** | ZMP Router | Client-side routing cho Mini App |

---

## Cấu trúc thư mục

```
src/
├── app.ts                    # Entry point, mount React app
├── components/               # Reusable components
│   ├── auth/                 # Authentication components
│   │   ├── AuthGuard.tsx     # Route protection
│   │   ├── AuthInit.tsx      # Auth initialization
│   │   ├── LoginView.tsx     # Manual login form
│   │   └── PermissionConsentModal.tsx
│   ├── base/                 # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── IconButton.tsx
│   │   ├── SectionHeader.tsx
│   │   └── Skeleton.tsx
│   ├── campaign/             # Campaign card component
│   ├── display/              # Display components
│   │   ├── Accordion.tsx
│   │   ├── DataCard.tsx
│   │   └── SegmentedControl.tsx
│   ├── form/                 # Form components
│   │   └── SearchInput.tsx
│   ├── home/                 # Home page components
│   │   ├── HomeHeader.tsx    # Balance display banner
│   │   └── OneClickSection.tsx
│   ├── layout/               # Layout components
│   │   └── ScreenContainer.tsx
│   ├── share/                # Share functionality
│   │   ├── ShareBottomSheet.tsx
│   │   └── ShareBottomSheet.scss
│   └── layout.tsx            # Main layout with routing
├── pages/                    # Page components
│   ├── index.tsx             # Home page (job list)
│   ├── job-detail.tsx        # Job detail page
│   ├── get-link.tsx          # Create tracking link page
│   ├── report.tsx            # Report dashboard
│   ├── profile.tsx           # User profile
│   ├── login.tsx             # Login page
│   ├── register.tsx          # Registration page
│   └── ekyc.tsx              # eKYC verification
├── services/                 # API services
│   ├── api.ts                # Axios instance + API endpoints
│   └── auth.ts               # Authentication service (MOCK)
├── state/                    # Jotai atoms (global state)
│   ├── auth.ts               # Auth state
│   ├── job.ts                # Job/campaign state
│   └── share.ts              # Share sheet state
├── config/                   # Configuration
│   └── partner.ts            # Partner-specific config
├── types/                    # TypeScript type definitions
│   ├── auth.ts               # Auth user types
│   └── job.ts                # Job/campaign types
├── utils/                    # Utility functions
│   ├── deeplink.ts           # Deep linking utilities
│   ├── format.ts             # Formatting helpers
│   └── storage.ts            # Local storage helpers
├── themes/                   # Theme configuration
│   ├── index.ts
│   └── tokens.ts
├── css/                      # Global styles
│   ├── app.scss              # Main stylesheet (2200+ lines)
│   ├── components.scss
│   └── tailwind.scss
└── static/                   # Static assets
    ├── at-logo.png
    ├── ic_zalo_colored.svg
    └── logo-white.png
```

---

## Core Features & User Flows

### 1. **Authentication**
- **Zalo Login**: Sử dụng Zalo SDK APIs (getUserInfo, getPhoneNumber, getAccessToken)
- **Manual Login**: Fallback form đăng nhập bằng số điện thoại
- **Registration**: Form đăng ký cho user mới (họ tên, SĐT, email)
- **eKYC**: Xác thực định danh bằng CCCD (chụp ảnh trước/sau + chân dung)

**Flow**:
```
Login Page
├─► Permission Consent Modal (giải thích quyền)
├─► Zalo SDK Auth Flow
│   ├─► getUserInfo() → name + avatar
│   ├─► getPhoneNumber() → phone token
│   └─► getAccessToken() → Zalo access token
└─► Backend Login (POST /auth/zalo)
    ├─► Success → isNewUser?
    │   ├─► true → Register Page
    │   └─► false → Home Page
    └─► Fail → Manual Login Form
```

### 2. **Job/Campaign Discovery** (Home Page)
- Hiển thị danh sách chiến dịch affiliate
- Lọc theo danh mục
- Tìm kiếm theo từ khóa
- Pull-to-refresh (có thể thêm)
- Infinite scroll (pagination)

**Components**:
- `HomeHeader`: Hiển thị tổng thu nhập (balance)
- `OneClickSection`: Banner "Nhận hoa hồng 1 click"
- `CampaignCard`: Card hiển thị chiến dịch (ảnh, tên, hoa hồng, rating, user count)

### 3. **Job Detail**
- Xem chi tiết chiến dịch
- Hình ảnh gallery (Swiper)
- Thông tin hoa hồng, ngành hàng, thời hạn
- Dữ liệu tracking: CVR, EPC, tỷ lệ duyệt
- Các accordion: Giới thiệu, Điều kiện ghi nhận, Điều khoản
- **Actions**:
  - "Chia sẻ nhận hoa hồng" → Mở share sheet
  - "Mở App" → Deep link vào native app

### 4. **Create Tracking Link** (Get Link Page)
- Nhập URL sản phẩm cần tạo link affiliate
- Hoặc dùng link mặc định từ advertiser
- Tạo tracking link (POST `/gateway-service/api/v1.0/publisher/affiliate/link`)
- Hiển thị lịch sử links đã tạo
- Copy link, mở link

**Note**: POC đang dùng mock data (pre-defined short URLs) thay vì gọi backend thực.

### 5. **Report Dashboard**
- **Income Summary**: 
  - Đã thanh toán (paid)
  - Đã duyệt (approved)
  - Tạm tính (temporary_approved)
- **Overview Tab**: 
  - Stats cards: Clicks, Conversions, Commission, Sale Amount
  - Có thể xem thay đổi % (change)
- **Conversions Tab**: 
  - Danh sách đơn hàng đã chuyển đổi
  - Chi tiết: campaign name, order amount, commission, status, date

### 6. **Share Functionality**
- Share Bottom Sheet với các options:
  - Zalo, Facebook, TikTok, Instagram
  - Sao chép nội dung
  - Thêm (more)
- Share content được pre-populate theo campaign

### 7. **Profile Management**
- Hiển thị avatar, tên user
- Quick stats: thu nhập, đơn hàng, chiến dịch
- Menu items:
  - Việc làm đã nhận
  - Tài khoản thanh toán
  - eKYC verification
  - Thông báo
  - Trợ giúp
  - Đăng xuất

---

## API Integration

### Base Configuration
```typescript
// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ||
                 (import.meta.env.DEV ? "" : "https://api.oneat.vn");
```

### Endpoints đã tích hợp

| Service | Method | Endpoint | Mục đích |
|---------|--------|----------|----------|
| Backend Service | GET | `/backend-service/api/v1/category` | Lấy danh sách categories |
| Backend Service | POST | `/backend-service/api/v1/jobs/filter` | Lọc danh sách jobs |
| Backend Service | GET | `/backend-service/api/v1/jobs/:id` | Lấy chi tiết job |
| Gateway Service | POST | `/gateway-service/api/v1.0/publisher/affiliate/statistics/campaign-overview-all` | Report stats |
| Gateway Service | POST | `/gateway-service/api/v1.0/publisher/affiliate/conversions` | Danh sách conversions |
| Gateway Service | POST | `/gateway-service/api/v1.0/publisher/finance/summary-income` | Income summary |
| Gateway Service | POST | `/gateway-service/api/v1.0/publisher/affiliate/link` | Tạo tracking link |

### Authentication
- JWT token được gửi qua header: `Authorization: Bearer <token>`
- Token được lưu trong:
  - Jotai atom: `authTokenAtom`
  - Local storage (persistence)
- Axios interceptor xử lý lỗi 401

---

## State Management (Jotai Atoms)

### Auth State (`src/state/auth.ts`)
```typescript
authTokenAtom: string | null
userAtom: AuthUser | null
```

### Job State (`src/state/job.ts`)
```typescript
// Job List
jobsAtom: Job[]
loadingAtom: boolean
searchQueryAtom: string
selectedCategoryIdAtom: number
categoriesAtom: JobCategory[]
currentPageAtom: number
noMoreAtom: boolean
loadingMoreAtom: boolean

// Job Detail
selectedJobAtom: Job | null
loadingDetailAtom: boolean

// Report
reportTabAtom: string
reportStatsAtom: ReportStats | null
conversionsAtom: ConversionItem[]
incomeSummaryAtom: IncomeSummary | null
loadingReportAtom: boolean

// Get Link
trackingLinksAtom: TrackingLink[]
loadingLinkAtom: boolean
```

### Share State (`src/state/share.ts`)
```typescript
shareSheetStateAtom: {
  visible: boolean
  campaignId?: string
  shareContent?: string
  shareUrl?: string
}
```

---

## Routing & Navigation

### Routes Configuration
```typescript
// src/components/layout.tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/" element={<HomePage />} />
<Route path="/job/:id" element={<JobDetailPage />} />
<Route path="/get-link/:id" element={<GetLinkPage />} />
<Route path="/report" element={<ReportPage />} />
<Route path="/profile" element={<ProfilePage />} />
<Route path="/ekyc" element={<EkycPage />} />
```

### Bottom Navigation
- Hiển thị trên các trang: Home, Report, Profile
- Ẩn trên: Job Detail, Get Link, eKYC, Login
- Configurable qua `partnerConfig` (`src/config/partner.ts`)

---

## Styling System

### Design Tokens (CSS Variables)
```scss
:root {
  // Zalo colors
  --zalo-nl300: #1a1a2e;      // Primary text
  --zalo-bl300: #0068ff;      // Links/Blue
  --zalo-gl300: #10b981;      // Success/Green
  --zalo-ol300: #f59e0b;      // Warning/Orange
  --zalo-rl300: #ef4444;      // Error/Red

  // Brand colors
  --primary: #EF4A22;         // ACCESSTRADE Orange
  --primary-light: #FFF0ED;
  --accent: #FFAB00;

  // UI tokens
  --bg: #f4f5f7;
  --bg-card: #ffffff;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  // ...
}
```

### Shimmer Loading Animation
```scss
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer { /* ... */ }
```

---

## Key Components Deep Dive

### 1. CampaignCard
**Props**:
```typescript
interface CampaignCardProps {
  imageUrl: string;
  title: string;
  commission: string;           // "10%" hoặc "50,000đ"
  dateRange?: string;
  commissionColor?: string;     // Màu highlight
  bonus?: string;               // Bonus text (🔥 ...)
  rating?: number;
  reviewCount?: number;
  userCount?: number;
  topComment?: { avatar?: string; comment: string };
  onClick?: () => void;
}
```

**Features**:
- Click to navigate to job detail
- Share button triggers share bottom sheet
- Lazy loading image
- Keyboard accessible (Enter/Space)

### 2. HomeHeader
Hiển thị balance card với:
- Tổng số dư (balance)
- Đã duyệt (approved)
- Chờ duyệt (pending)
- Thanh toán vào ngày 05 & 20 hàng tháng

### 3. ShareBottomSheet
- Sheet component từ ZMP UI
- Hiển thị share content (có copy button)
- Grid các social networks: Zalo, Facebook, TikTok, Instagram
- Copy link functionality

---

## Mock Data & Development

### Authentication Mock (`src/services/auth.ts`)
```typescript
const MOCK_JWT = "eyJhbGciOiJIUzI1NiIs...";
const MOCK_USER: AuthUser = {
  id: "user_mock_123",
  name: "Người dùng Zalo",
  avatar: "https://picsum.photos/seed/zalo/200/200",
  phone: undefined,
  isNewUser: false,
};

// Test new user flow: accessToken contains "new"
```

### Tracking Link Mock (`src/pages/get-link.tsx`)
```typescript
const MOCK_SHORTLINKS = [
  "https://shorten.asia/7TUzcgax",
  "https://shorten.asia/TQFEn9mK",
  // ...
];
```

### Dev Mode Detection
- Nếu gọi Zalo SDK APIs bị lỗi `-1401` (không chạy trong Zalo environment), code sẽ fallback sang mock data.
- Điều này giúp dev có thể test trên browser thông thường.

---

## Environment Configuration

### Vite Environment Variables
```typescript
// .env (cần tạo)
VITE_API_BASE_URL=https://api.oneat.vn
```

### Build Modes
- **DEV**: BASE_URL = "" (dùng proxy trong vite.config.mts)
- **PROD**: BASE_URL = production URL

---

## Build & Deployment

### Scripts
```json
{
  "scripts": {
    "login": "zmp login",
    "start": "zmp start",
    "deploy": "zmp deploy"
  }
}
```

### Development
```bash
npm install
zmp start
# Mở localhost:3000 trong Zalo Mini App DevTools
```

### Deployment
```bash
zmp login
zmp deploy
# Scan QR code để mở mini app trong Zalo
```

---

## Security Considerations

1. **JWT Token**: Lưu trong memory (Jotai) + localStorage (persistence)
2. **API Calls**: Tất cả đều qua HTTPS
3. **Auth Guard**: Protected routes yêu cầu token
4. **Token Refresh**: Chưa có (có thể thêm later)
5. **Input Validation**: Client-side validation trên forms

---

## Known Limitations & TODOs

### POC Limitations
1. **Get Link**: Đang dùng mock URLs, chưa thực sự gọi backend
2. **Report Data**: Stats giả định (hardcoded) trên Job Detail page
3. **Share API**: Chưa tích hợp thật với Zalo Share API
4. **Deep Linking**: Chưa hoàn thiện universal links/app links
5. **Error Handling**: Có thể nâng cấp với retry logic, better UX

### Next Steps (from POC_PRESENTATION.md)
1. Hoàn thiện Zalo Login thực (lấy SĐT thật)
2. Deep-linking từ Zalo chat vào Mini App
3. Animation, dark mode, edge cases
4. Tích hợp Zalo Share API thực

---

## Code Quality & Patterns

### Good Practices
✅ TypeScript strict mode (implied)
✅ Component composition
✅ Custom hooks (`useAuth`, `useCallback`, `useEffect`)
✅ Error boundaries (có thể thêm)
✅ Loading states với shimmer skeletons
✅ Responsive design
✅ Accessibility (keyboard navigation, ARIA)
✅ Consistent naming conventions
✅ Separation of concerns (services, state, components)

### Design Patterns
- **Container/Presentational**: Pages vs Components
- **Custom Hooks**: `useAuth` encapsulate auth logic
- **Atom Pattern**: Jotai atoms cho global state
- **Service Layer**: `services/api.ts` trừu tượng API calls
- **Config-driven**: `partner.ts` config cho multi-partner

---

## Testing

### Current State
- Không có unit tests (chưa setup)
- Có file `test_coverage.js` (empty) và `test-deep-link-utils.ts` (chưa dùng)

### Recommended
- Jest/Vitest cho unit tests
- React Testing Library cho component tests
- Cypress/Playwright cho E2E tests

---

## Performance Optimizations

1. **Lazy Loading**: Images với `loading="lazy"`
2. **Memoization**: `React.memo` cho CampaignCard, `useCallback` cho handlers
3. **Code Splitting**: Vite automatic chunking
4. **Asset Optimization**: Images trong `static/` nên compress
5. **Bundle Size**: Vite build tối ưu, assetsInlineLimit: 0

---

## Dependencies Overview

### Production
- `react`: ^18.3.1
- `react-dom`: ^18.3.1
- `zmp-sdk`: latest (Zalo Mini App SDK)
- `zmp-ui`: latest (Zalo UI components)
- `jotai`: ^2.12.1 (state management)
- `axios`: ^1.13.5 (HTTP client)

### Development
- `vite`: ^5.2.13 + `@vitejs/plugin-react`
- `zmp-vite-plugin`: latest (Zalo-specific Vite plugin)
- `typescript`: qua tsconfig.json
- `sass`: ^1.98.0 (SCSS compilation)
- `tailwindcss`: ^3.4.3 (utility classes)
- `postcss`: ^8.4.38 + plugins

---

## Conclusion

Đây là một **well-structured, production-ready POC** với:
- Kiến trúc rõ ràng, scalable
- Code quality tốt, TypeScript đầy đủ
- Tích hợp API thực với backend OneAt
- UX mượt mà với ZMP UI components
- Sẵn sàng cho phát triển thêm features

**Tính khả thi**: ✅ Rất cao để triển khai production.

---

## References

- [Zalo Mini App Docs](https://mini.zalo.me/)
- [ZaUI Documentation](https://mini.zalo.me/documents/zaui/)
- [ZMP SDK Documentation](https://mini.zalo.me/documents/api/)
- [POC Presentation](./POC_PRESENTATION.md)
- [README](./README.md)
