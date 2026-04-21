# Kế hoạch Component Base Common - Zalo Mini App

> Phân tích UI/UX từ các màn hình đối tác Masan + đề xuất kiến trúc component linh hoạt cho đa đối tác.

---

## 1. Tổng quan phân tích UI/UX

### 1.1 Các màn hình đã phân tích (từ Figma & screenshots)

| Màn hình | Mô tả ngắn | Đối tác |
|----------|------------|---------|
| **Trang chủ** | Header logos, Balance card, Commission steps, Chiến dịch hot, Bottom nav | Masan |
| **Chi tiết chiến dịch** | Hero banner đỏ, Campaign info, Workflow steps, Metrics, Accordion sections, Sticky CTA | Masan |
| **Share Sheet** | Bottom sheet chia sẻ, Copy content, Social icons (Zalo, FB, TikTok, IG), Copy link | Masan |
| **Hợp đồng điện tử** | Breadcrumb, form Mã số thuế, link tra cứu, nút Liên kết ngay | Masan |
| **Form Ký hợp đồng** | StepIndicator (5 bước), TextInput (SĐT, Email), Thêm tài khoản NH, InfoMessage bảo mật, Tiếp tục | Masan |
| **Modal Thông tin tài khoản** | Form: Tên NH (dropdown), Số TK, Chủ TK + Lưu thông tin | Masan |
| **Modal Tài khoản không trùng khớp** | Alert với icon cảnh báo, nút Đăng nhập ACCESSTRADE, nút Trợ giúp | Masan |

### 1.2 Đánh giá UX để làm component base

| Tiêu chí | Đánh giá |
|----------|----------|
| **Tính nhất quán** | Màu cam/đỏ chủ đạo, typography rõ ràng, spacing đồng nhất → phù hợp design tokens |
| **Tính mô-đun** | Các khối được tách rõ (header, card, banner, step flow, share sheet) → dễ đóng gói |
| **Khả năng tùy biến** | Hầu hết nội dung động (tên, số tiền, ngày, logo) → props-based architecture |
| **Đa đối tác** | Logo, màu, copy có thể thay đổi theo từng đối tác → cần Theme/Config layer |

---

## 2. Kiến trúc đề xuất

### 2.1 Cấu trúc thư mục

```
src/
├── components/
│   ├── base/                    # Base components - tái sử dụng cao
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Text.tsx (Typography variants)
│   │   ├── IconButton.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Accordion.tsx
│   │   └── SectionHeader.tsx
│   │
│   ├── layout/                  # Layout & Navigation
│   │   ├── AppHeader.tsx
│   │   ├── PartnerHeader.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Breadcrumb.tsx
│   │   └── ScreenContainer.tsx
│   │
│   ├── display/                 # Hiển thị dữ liệu
│   │   ├── DataCard.tsx
│   │   ├── BalanceCard.tsx
│   │   ├── ValueDisplay.tsx
│   │   ├── MetricsDisplay.tsx
│   │   └── AttributeList.tsx
│   │
│   ├── campaign/                # Chiến dịch (campaign-specific)
│   │   ├── PromoBanner.tsx
│   │   ├── CampaignCard.tsx
│   │   ├── CampaignInfoCard.tsx
│   │   ├── WorkflowStepper.tsx
│   │   └── StickyActionButton.tsx
│   │
│   ├── share/                   # Share flow
│   │   ├── ShareBottomSheet.tsx
│   │   ├── ShareContentCard.tsx
│   │   └── ShareOptionGrid.tsx
│   │
│   ├── form/                    # Form & Modal (Hợp đồng, Thông tin TK, v.v.)
│   │   ├── TextInput.tsx
│   │   ├── Select.tsx
│   │   ├── FormCard.tsx
│   │   ├── InfoMessage.tsx
│   │   ├── Link.tsx
│   │   ├── Modal.tsx
│   │   ├── AlertModal.tsx
│   │   └── StepIndicator.tsx
│   │
├── themes/                      # Multi-partner theming
│   ├── index.ts
│   ├── tokens.ts
│   └── partners/
│       ├── masan.ts
│       └── default.ts
│
└── config/
    └── partner.ts               # Partner config (logos, copy, routes)
```

### 2.2 Design Tokens (cho đa đối tác)

```ts
// themes/tokens.ts
export const createTokens = (partner: PartnerTheme) => ({
  colors: {
    primary: partner.primaryColor,      // Masan: #e65100 / #f97316
    primaryLight: partner.primaryLight,
    accent: partner.accentColor,
    success: partner.successColor,
    // ...
  },
  radii: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  typography: {
    heading: { fontSize: 20, fontWeight: 700 },
    value: { fontSize: 24, fontWeight: 700 },
    body: { fontSize: 14 },
    caption: { fontSize: 12 },
  },
});
```

---

## 3. Chi tiết từng Component Base

### 3.1 Layout / Navigation

#### `PartnerHeader` (thay thế header cố định)
| Prop | Type | Mô tả |
|------|------|-------|
| `logos` | `{ src: string; alt?: string }[]` | 1–2 logo đối tác |
| `backgroundColor` | `string` | Màu nền (từ theme) |
| `leftAction` | `ReactNode` | Nút back / custom |
| `rightActions` | `ReactNode[]` | Menu, Close, v.v. |

**Linh hoạt đối tác:** Mỗi partner truyền logo + màu nền riêng.

---

#### `BottomNav` (đã có, cần mở rộng)
| Prop | Type | Mô tả |
|------|------|-------|
| `items` | `{ key: string; label: string; icon: string; activeIcon?: string }[]` | Động theo partner |
| `activeKey` | `string` | Tab hiện tại |
| `onChange` | `(key: string) => void` | Callback |

**Linh hoạt:** Partner config quy định số tab (3–5), label, icon.

---

#### `Breadcrumb`
Dùng cho: "Trang chủ > Hợp đồng điện tử" – đường dẫn điều hướng.

| Prop | Type | Mô tả |
|------|------|-------|
| `items` | `{ label: string; url?: string; isActive?: boolean }[]` | Các mục breadcrumb |
| `separator` | `string` | Mặc định " > " |

**Linh hoạt:** Mỗi màn hình truyền cấu trúc breadcrumb riêng.

---

### 3.2 Display Components

#### `DataCard` (Card hiển thị thông tin chung)
Dùng cho: "Bạn có 300.200.000đ", Balance, Info tổng quan.

| Prop | Type | Mô tả |
|------|------|-------|
| `title` | `string` | "Bạn có", "Số dư", v.v. |
| `value` | `string` | "300.200.000₫", "0 đ" |
| `description` | `string?` | "Thanh toán vào ngày 05 & 20..." |
| `onPress` | `() => void?` | Click vào card (mũi tên >) |
| `statusButtons` | `{ label: string; active: boolean; onClick: () => void }[]?` | "Đã duyệt", "Chờ duyệt" |
| `variant` | `'balance' \| 'info' \| 'default'` | Style khác nhau |

---

#### `MetricsDisplay`
Dùng cho: "Dữ liệu 3 tháng gần nhất" – CVR 50%, EPC 900K, Tỷ lệ duyệt 80%.

| Prop | Type | Mô tả |
|------|------|-------|
| `title` | `string` | "Dữ liệu 3 tháng gần nhất" |
| `metrics` | `{ label: string; value: string; infoText?: string }[]` | Các chỉ số |
| `columns` | `2 \| 3 \| 4` | Số cột |

---

#### `AttributeList`
Dùng cho: "Giới thiệu chung" – Color: Red, Major Material: ..., Item ID: ...

| Prop | Type | Mô tả |
|------|------|-------|
| `data` | `{ label: string; value: string }[]` | Cặp key-value |
| `variant` | `'compact' \| 'default'` | Mật độ hiển thị |

---

### 3.3 Campaign Components

#### `PromoBanner` / `CampaignHero`
Dùng cho: Banner đỏ "CHIẾN DỊCH MASAN ZALO", logo, ưu đãi, CTA.

| Prop | Type | Mô tả |
|------|------|-------|
| `backgroundImage` | `string?` | URL ảnh nền |
| `backgroundColor` | `string` | Fallback khi không có ảnh |
| `campaignTitle` | `string` | "CHIẾN DỊCH MASAN ZALO" |
| `partnerLogos` | `{ src: string }[]` | ACCESSTRADE, Masan Consumer |
| `offers` | `{ label: string; value: string }[]` | "ĐĂNG KÍ ZALO 1.400 VND", v.v. |
| `ctaText` | `string` | "Đăng ký ngay" |
| `onCtaClick` | `() => void` | Handler CTA |
| `productImages` | `string[]?` | Ảnh sản phẩm minh họa |

---

#### `CampaignInfoCard`
Dùng cho: Tên chiến dịch, hoa hồng, rating, thời hạn, danh mục.

| Prop | Type | Mô tả |
|------|------|-------|
| `campaignName` | `string` | "Masan Zalo OA" |
| `commissionText` | `string` | "Hoa hồng lên đến: 6.700đ/sp" |
| `rating` | `number?` | 4.5 |
| `reviewCount` | `number?` | 28 |
| `engagementCount` | `number?` | 77940 |
| `startDate` | `string` | "05/09/2021" |
| `endDate` | `string` | "15/10/2021" |
| `category` | `string?` | "Thương mại điện tử" |
| `brand` | `string?` | "Masan" |

---

#### `WorkflowStepper` / `ActionGuide`
Dùng cho: "Nhận hoa hồng chỉ với 1 Click" – Chọn chiến dịch → Chia sẻ link → Nhận hoa hồng.

| Prop | Type | Mô tả |
|------|------|-------|
| `title` | `string` | "Nhận hoa hồng chỉ với 1 Click" |
| `titleIcon` | `string?` | Icon (vd: 🔥) |
| `steps` | `{ icon: string \| ReactNode; label: string }[]` | Các bước |
| `primaryButton` | `{ text: string; value?: string; icon?: string; onClick: () => void }` | "Chia sẻ nhận 6.300/sp" |

---

#### `CampaignCard` (trong danh sách Chiến dịch hot)
| Prop | Type | Mô tả |
|------|------|-------|
| `banner` | `PromoBannerProps` | Tái dùng PromoBanner |
| `title` | `string` | "Masan Zalo OA" |
| `dateRange` | `string` | "15-25/01/2026" |
| `commissionText` | `string` | "Hoa hồng tối đa 6.300đ/sp" |
| `onShareClick` | `() => void` | CTA share |
| `shareButtonText` | `string` | "Chia sẻ nhận 6.300/sp" |

---

### 3.4 Share Components

#### `ShareBottomSheet`
| Prop | Type | Mô tả |
|------|------|-------|
| `open` | `boolean` | Hiển thị / ẩn |
| `onClose` | `() => void` | Đóng sheet |
| `title` | `string` | "Chia sẻ" |
| `content` | `ReactNode` | Phần nội dung chia sẻ |
| `shareApps` | `{ platform: string; icon: string; label: string; onClick: () => void }[]` | Zalo, FB, TikTok, IG |
| `additionalActions` | `{ icon: string; label: string; onClick: () => void }[]` | Sao chép link, Thêm |

---

#### `ShareContentCard`
| Prop | Type | Mô tả |
|------|------|-------|
| `title` | `string` | "Sao chép nội dung chia sẻ" |
| `content` | `string` | Đoạn text promo |
| `onCopy` | `() => void` | Copy nội dung |

---

### 3.5 Base Components (nền tảng)

| Component | Props chính | Ghi chú |
|-----------|-------------|---------|
| `Card` | `padding`, `radius`, `onClick`, `children` | Wrapper bo góc, nền trắng |
| `PrimaryButton` | `text`, `icon`, `onClick`, `variant`, `fullWidth` | Cam, có thể thêm value (6.300/sp) |
| `SecondaryButton` | Tương tự | Outline hoặc màu phụ |
| `IconButton` | `icon`, `onClick`, `ariaLabel` | Back, Share, Close, More |
| `SegmentedControl` | `options`, `value`, `onChange` | "Đã duyệt" / "Chờ duyệt" |
| `Accordion` | `sections: { title, content }[]`, `defaultExpanded` | Giới thiệu, Điều kiện, Điều khoản |
| `SectionHeader` | `title`, `icon?` | "Chiến dịch hot", "Dữ liệu 3 tháng" |
| `StickyActionButton` | Giống PrimaryButton | Fixed bottom, safe area |

---

### 3.6 Form & Modal Components (Hợp đồng điện tử, Thông tin TK)

#### `TextInput`
Dùng cho: Số điện thoại, Email, Mã số thuế, Số tài khoản, Chủ tài khoản.

| Prop | Type | Mô tả |
|------|------|-------|
| `label` | `string` | "Số điện thoại nhập OTP", "Email", v.v. |
| `placeholder` | `string` | Placeholder |
| `icon` | `string \| ReactNode?` | Icon trái (phone, email, v.v.) |
| `value` | `string` | Giá trị (controlled) |
| `onChange` | `(v: string) => void` | Handler |
| `keyboardType` | `'text' \| 'numeric' \| 'email'` | Loại bàn phím |
| `errorMessage` | `string?` | "*Dùng để xác nhận..." (màu đỏ) |
| `hintMessage` | `string?` | Gợi ý (màu xám) |
| `status` | `'default' \| 'error' \| 'success'` | Trạng thái viền/ màu |

---

#### `Select` / `Dropdown`
Dùng cho: "Chọn ngân hàng" – dropdown với mũi tên xổ xuống.

| Prop | Type | Mô tả |
|------|------|-------|
| `label` | `string` | "Tên ngân hàng" |
| `placeholder` | `string` | "Chọn ngân hàng" |
| `options` | `{ value: string; label: string }[]` | Danh sách lựa chọn |
| `value` | `string` | Giá trị đã chọn |
| `onChange` | `(v: string) => void` | Handler |
| `disabled` | `boolean?` | Disable |

---

#### `FormCard`
Dùng cho: Khối form "Ký hợp đồng điện tử" – nền trắng, bo góc, chứa SectionHeader + các field.

| Prop | Type | Mô tả |
|------|------|-------|
| `title` | `string` | "Ký hợp đồng điện tử" |
| `description` | `string?` | "Bạn cần ký hợp đồng điện tử để..." |
| `children` | `ReactNode` | Các field bên trong |

---

#### `StepIndicator` (Progress dots)
Dùng cho: 5 chấm tròn hiển thị bước hiện tại (bước 1 active, các bước sau inactive).

| Prop | Type | Mô tả |
|------|------|-------|
| `totalSteps` | `number` | Số bước (vd: 5) |
| `currentStep` | `number` | Bước hiện tại (1-based) |
| `activeColor` | `string?` | Màu bước active (từ theme) |
| `inactiveColor` | `string?` | Màu bước chưa tới |

**Khác với WorkflowStepper:** WorkflowStepper hiển thị label từng bước; StepIndicator chỉ là các chấm tiến độ.

---

#### `InfoMessage` / `Disclaimer`
Dùng cho: "Thông tin của bạn được hoàn toàn bảo mật..." với icon tick xanh.

| Prop | Type | Mô tả |
|------|------|-------|
| `message` | `string` | Nội dung thông báo |
| `icon` | `'check' \| 'info' \| 'warning' \| ReactNode?` | Icon (mặc định check) |
| `variant` | `'default' \| 'success' \| 'warning'` | Màu chữ/icon |

---

#### `Link`
Dùng cho: "Truy cập trang tra cứu... https://tracuunnt.gdt.gov.vn/..." – link mở browser.

| Prop | Type | Mô tả |
|------|------|-------|
| `href` | `string` | URL |
| `children` | `ReactNode` | Text hiển thị |
| `openExternal` | `boolean?` | Mở tab mới / Zalo browser |

---

#### `Modal` (generic)
Dùng cho: Modal "Thông tin tài khoản" – tiêu đề, nút đóng, nội dung tùy ý.

| Prop | Type | Mô tả |
|------|------|-------|
| `open` | `boolean` | Hiển thị / ẩn |
| `onClose` | `() => void` | Đóng |
| `title` | `string` | "Thông tin tài khoản" |
| `children` | `ReactNode` | Nội dung (form, v.v.) |
| `footer` | `ReactNode?` | Nút Lưu thông tin |

---

#### `AlertModal`
Dùng cho: "Tài khoản không trùng khớp" – icon cảnh báo, tiêu đề, mô tả, 2 nút Primary/Secondary.

| Prop | Type | Mô tả |
|------|------|-------|
| `open` | `boolean` | Hiển thị / ẩn |
| `onClose` | `() => void` | Đóng (X) |
| `variant` | `'warning' \| 'error' \| 'info'` | Icon + màu |
| `title` | `string` | "Tài khoản không trùng khớp" |
| `message` | `string` | "Thông tin tài khoản của bạn không trùng khớp..." |
| `primaryButton` | `{ text: string; onClick: () => void }` | "Đăng nhập ACCESSTRADE" |
| `secondaryButton` | `{ text: string; onClick: () => void }?` | "Trợ giúp" |

**Linh hoạt đối tác:** `primaryButton.text` có thể chèn tên đối tác ("Đăng nhập ACCESSTRADE", "Đăng nhập Partner B", v.v.).

---

## 4. Partner Config – Ví dụ

```ts
// config/partner.ts
export type PartnerId = 'masan' | 'partner_b' | 'default';

export const partnerConfig: Record<PartnerId, PartnerConfig> = {
  masan: {
    id: 'masan',
    name: 'Masan Zalo OA',
    theme: {
      primaryColor: '#e65100',
      primaryLight: '#fff3e0',
      accentColor: '#ff9800',
    },
    logos: [
      { src: '/logos/accesstrade.png', alt: 'ACCESSTRADE' },
      { src: '/logos/masan.png', alt: 'Masan Consumer' },
    ],
    bottomNav: [
      { key: 'home', label: 'Trang chủ', icon: 'zi-home' },
      { key: 'report', label: 'Báo cáo', icon: 'zi-poll' },
      { key: 'profile', label: 'Cá nhân', icon: 'zi-user' },
    ],
    copy: {
      balanceTitle: 'Bạn có',
      shareTitle: 'Chia sẻ',
      campaignHot: 'Chiến dịch hot',
    },
  },
  default: { /* fallback */ },
};
```

---

## 5. Roadmap thực hiện

### Phase 1: Foundation (1–2 tuần)
- [ ] Thiết lập `themes/tokens.ts` + `partnerConfig`
- [ ] `Card`, `PrimaryButton`, `SecondaryButton`, `IconButton`
- [ ] `SectionHeader`, `Text` variants (nếu chưa dùng ZaUI)
- [ ] `Accordion` (wrap ZaUI hoặc custom)

### Phase 2: Layout
- [ ] `PartnerHeader` (thay header hiện tại)
- [ ] Cập nhật `BottomNav` để nhận config từ partner
- [ ] `ScreenContainer` (wrapper + safe area)

### Phase 3: Display & Campaign
- [ ] `DataCard` / `BalanceCard`
- [ ] `PromoBanner` / `CampaignHero`
- [ ] `CampaignInfoCard`
- [ ] `WorkflowStepper`
- [ ] `CampaignCard` (list)
- [ ] `StickyActionButton`

### Phase 4: Share & Metrics
- [ ] `ShareBottomSheet` (dùng ZaUI Sheet)
- [ ] `ShareContentCard`, `ShareOptionGrid`
- [ ] `MetricsDisplay`
- [ ] `AttributeList`

### Phase 4b: Form & Modal (Hợp đồng điện tử)
- [ ] `Breadcrumb`
- [ ] `TextInput`, `Select` (wrap ZaUI Input/Select nếu có)
- [ ] `FormCard`, `StepIndicator`
- [ ] `InfoMessage`, `Link`
- [ ] `Modal` (wrap ZaUI Modal)
- [ ] `AlertModal` (variant cho error/warning)

### Phase 5: Integration & Refactor
- [ ] Ghép các màn hình Masan với component mới (Home, Campaign, Share, **Hợp đồng điện tử**)
- [ ] Test theme khi đổi partner
- [ ] Docs + Storybook (nếu cần)

---

## 6. Nguyên tắc khi implement

1. **Props trước, hardcode sau:** Tất cả text, số, URL đều qua props.
2. **Theme qua tokens:** Màu, font, spacing dùng design tokens.
3. **Composition:** `CampaignCard` = PromoBanner + CampaignInfoCard + PrimaryButton.
4. **Tương thích ZaUI:** Dùng `Sheet`, `Header`, `BottomNavigation` làm nền, custom khi cần.
5. **TypeScript:** Props, theme, config đều có type rõ ràng.

---

## 7. Phân tích component hiện có (codebase)

> Tiếp nối phân tích từ hội thoại trước: đối chiếu component đang dùng trong dự án với kiến trúc component base đề xuất.

### 7.1 Bảng ánh xạ component hiện có → kế hoạch

| Component hiện có | File | Ánh xạ / Ghi chú |
|-------------------|------|------------------|
| **JobCard** | `components/job-card.tsx` | Gần với **CampaignCard** (banner + badge hoa hồng + meta + CTA). Khác: JobCard nhận `Job`, CampaignCard nhận props tách rời. Nên tách thành **Card variant** dùng chung (image, badge, meta, comment). |
| **ProductCard** | `components/product-card.tsx` | Tương tự JobCard: image + discount badge + price + rating/sold. Có thể dùng chung **Card** base + **ValueDisplay**; đối tác Masan dùng CampaignCard, đối tác TMĐT dùng ProductCard. |
| **StatCard** | `components/stat-card.tsx` | Gần **DataCard** / **MetricsDisplay**: label, value, format, icon, color, change. Thiếu: `variant`, `onPress`, `description`. Có thể refactor StatCard thành DataCard với variant `metric` hoặc dùng trong MetricsDisplay. |
| **SearchBar** | `components/search-bar.tsx` | Gắn state Jotai (`searchQueryAtom`). Nên tách: **base Input** (hoặc dùng ZaUI Input) + **SearchBar** chỉ nhận `value`, `onChange`, `placeholder` qua props để tái dùng ở màn khác (không phụ thuộc job state). |
| **CategoryFilter** | `components/category-filter.tsx` | Tương đương **SegmentedControl** (horizontal tabs). Đang dùng `categoriesAtom`. Nên: component nhận `options`, `value`, `onChange`; page inject state. Dùng chung cho "Đã duyệt / Chờ duyệt" (Masan) và filter danh mục. |
| **Layout** | `components/layout.tsx` | Có **BottomNavigation** (ZaUI), routes, ẩn nav ở job-detail/get-link/ekyc. Chưa có **PartnerHeader**, **ScreenContainer**. BottomNav đang hardcode 3 tab (Việc làm, Báo cáo, Tôi) → cần chuyển sang config từ **partnerConfig**. |
| **JobGridSkeleton** / **ProductSkeleton** | `job-skeleton.tsx`, `product-skeleton.tsx` | Thuộc **base**: có thể đặt trong `base/Skeleton.tsx` với variant `grid-card` / `list`; dùng chung cho job và campaign. |
| **Logo**, **Clock** | `logo.tsx`, `clock.tsx` | **Logo** có thể nằm trong **PartnerHeader** (logos từ config). **Clock** là display nhỏ, có thể gom vào `display/` hoặc giữ nguyên. |

### 7.2 Trang (pages) và component còn thiếu

| Trang | Component đang dùng | Component kế hoạch còn thiếu |
|-------|----------------------|------------------------------|
| **index** (Trang chủ) | Page, Text, JobCard, SearchBar, CategoryFilter, JobGridSkeleton | PartnerHeader, BalanceCard (Masan), SectionHeader ("Chiến dịch hot"), BottomNav từ config |
| **job-detail** | Page, Text, Button, Swiper | PromoBanner/Hero, CampaignInfoCard, WorkflowStepper, Accordion, StickyActionButton, ShareBottomSheet |
| **get-link** | (cần đọc thêm) | ShareContentCard, ShareOptionGrid, Copy button |
| **report** | (cần đọc thêm) | DataCard, MetricsDisplay, SegmentedControl (Đã duyệt/Chờ duyệt) |
| **profile** | (cần đọc thêm) | DataCard (balance), Link, FormCard nếu có cài đặt |
| **ekyc** | (cần đọc thêm) | Form (TextInput, Select), StepIndicator, Modal, AlertModal, Breadcrumb |

### 7.3 Đề xuất hướng refactor / bổ sung

1. **Tách state khỏi UI:** SearchBar, CategoryFilter nhận props `value`/`onChange`; page hoặc layout inject atom. Dễ test và tái dùng cho partner khác.
2. **Chuẩn hóa Card:** Tạo `base/Card.tsx` + `display/DataCard.tsx`. JobCard và ProductCard dùng Card + các slot (image, badge, meta); CampaignCard (Masan) cũng dùng Card + PromoBanner.
3. **BottomNav từ config:** Đọc `partnerConfig[partnerId].bottomNav` trong Layout; render BottomNavigation.Item từ mảng. Ẩn nav vẫn theo route (có thể đưa vào config `hideNavPaths`).
4. **StatCard → DataCard:** Thêm props `variant`, `description`, `onPress` vào StatCard hoặc tạo DataCard mới và dùng StatCard như alias với variant mặc định.
5. **Form & Modal:** Các màn EKYC, Hợp đồng điện tử cần TextInput, Select, Modal, AlertModal, StepIndicator, Breadcrumb — ưu tiên sau khi Phase 1–2 ổn.

### 7.4 Thứ tự ưu tiên gợi ý (cập nhật)

| Ưu tiên | Hành động |
|---------|-----------|
| 1 | Theme + tokens + partnerConfig (Phase 1) |
| 2 | base/Card, Button, SectionHeader; refactor JobCard/ProductCard dùng Card |
| 3 | PartnerHeader, BottomNav từ config, ScreenContainer |
| 4 | DataCard (gộp StatCard), MetricsDisplay, SegmentedControl (gộp CategoryFilter) |
| 5 | Campaign: PromoBanner, CampaignInfoCard, WorkflowStepper, StickyActionButton |
| 6 | Share: ShareBottomSheet, ShareContentCard |
| 7 | Form & Modal: TextInput, Select, Modal, AlertModal, StepIndicator, Breadcrumb |

### 7.5 So sánh props chi tiết (để refactor)

#### JobCard (hiện tại) vs CampaignCard (kế hoạch)

| JobCard hiện tại | CampaignCard (kế hoạch) | Ghi chú |
|------------------|-------------------------|---------|
| `job: Job` (object từ API) | `banner`, `title`, `dateRange`, `commissionText`, `onShareClick`, `shareButtonText` | JobCard gắn 1 type API; CampaignCard props-based, đa đối tác. Refactor: JobCard map `Job` → props của CampaignCard (hoặc dùng chung 1 Card với slot). |
| — | `banner` (PromoBannerProps) | JobCard có `default_img_url` + badge; tách thành PromoBanner nhỏ trong card. |
| `onClick` | `onShareClick` | Cùng pattern: 1 CTA chính. |

#### StatCard (hiện tại) vs DataCard (kế hoạch)

| StatCard hiện tại | DataCard (kế hoạch) | Ghi chú |
|-------------------|---------------------|---------|
| `label`, `value`, `format`, `icon`, `color`, `change?` | `title`, `value`, `description?`, `onPress?`, `statusButtons?`, `variant` | DataCard rộng hơn: có description, onPress, segmented buttons. StatCard có `change` (↑↓) — có thể thêm vào DataCard như `subValue` hoặc `change`. |
| — | `variant: 'balance' \| 'info' \| 'default'` | StatCard chưa có variant; thêm sẽ thành DataCard variant `metric`. |

---

## 8. Liên kết tham khảo

- [Figma - Trang chủ](https://www.figma.com/design/pwXgUX1dEYNgVutwPWZudj/Untitled?node-id=1349-60239)
- [Figma - Chi tiết chiến dịch](https://www.figma.com/design/pwXgUX1dEYNgVutwPWZudj/Untitled?node-id=1349-60236)
- [Figma - Share Sheet](https://www.figma.com/design/pwXgUX1dEYNgVutwPWZudj/Untitled?node-id=1349-60224)
