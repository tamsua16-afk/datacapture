# Xưởng Data Capture

> Hệ thống số hóa phiếu nhập–xuất–chuyển kho và kiểm kê tại các xưởng sản xuất  
> Sử dụng AI (Google Gemini) để trích xuất dữ liệu từ ảnh chứng từ

---

## Cài đặt nhanh (Demo Mode)

```bash
npm install
npm run dev
```

Truy cập **http://localhost:3000** → đăng nhập bằng tài khoản demo.

---

## Tài khoản Demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `staff@demo.local` | `demo1234` | Nhân viên xưởng |
| `manager@demo.local` | `demo1234` | Xưởng trưởng |
| `accountant@demo.local` | `demo1234` | Kế toán kho |
| `accounting.manager@demo.local` | `demo1234` | Kế toán tổng hợp |
| `admin@demo.local` | `demo1234` | Quản trị hệ thống |
| `viewer@demo.local` | `demo1234` | Ban lãnh đạo |

---

## Cấu hình

```bash
cp .env.example .env.local
# Sửa các giá trị trong .env.local theo môi trường của bạn
```

### Biến môi trường quan trọng

| Biến | Mô tả | Mặc định |
|------|-------|---------|
| `DEMO_MODE` | Dùng SQLite local, không cần Supabase | `true` |
| `MOCK_AI` | Giả lập kết quả AI | `true` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key Gemini (production) | - |
| `GEMINI_MODEL` | Model Gemini đang dùng | `gemini-3.5-flash` |
| `AI_CONFIDENCE_AUTO_CONFIRM` | Ngưỡng xác nhận tự động (0-1) | `0.92` |
| `AI_CONFIDENCE_MANUAL_REVIEW` | Ngưỡng kiểm tra thủ công (0-1) | `0.75` |

---

## Lệnh hữu ích

```bash
npm run dev           # Chạy dev server (Turbopack)
npm run build         # Build production
npm run type-check    # Kiểm tra TypeScript
npm run lint          # Kiểm tra ESLint
npm run test          # Chạy unit tests (Vitest)
npm run test:e2e      # Chạy E2E tests (Playwright)
npm run db:seed       # Tạo dữ liệu demo
npm run db:migrate    # Chạy database migration
npm run db:studio     # Mở Drizzle Studio
```

---

## Kiến trúc

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL (production) / SQLite (demo) |
| ORM | Drizzle ORM |
| Auth | JWT via jose |
| AI | Google Gemini `gemini-3.5-flash` |
| Validation | Zod |
| Testing | Vitest + Playwright |
| Styling | Tailwind CSS v4 |

---

## Milestones

| # | Tên | Trạng thái |
|---|-----|-----------|
| 0 | Khởi tạo & Kiến trúc | ✅ **Hoàn thành** |
| 1 | Authentication & Phân quyền | 🔜 Tiếp theo |
| 2 | Master Data | ⏳ |
| 3 | Mobile Capture | ⏳ |
| 4 | AI Extraction | ⏳ |
| 5 | Review Queue | ⏳ |
| 6 | Inventory Ledger | ⏳ |
| 7 | Stocktake & Reconciliation | ⏳ |
| 8 | Dashboard & Export | ⏳ |
| 9 | Hardening | ⏳ |

---

## Quy tắc nghiệp vụ (tóm tắt)

- **DUP-01**: Chặn phiếu trùng số/ngày/loại/xưởng
- **DUP-02**: Cảnh báo ảnh đã dùng (SHA-256 hash)
- **ITEM-01**: Chuyển ánh xạ nếu không tìm thấy mã hàng
- **STOCK-01**: Chặn ghi sổ nếu xuất > tồn
- **DATE-01/02**: Không cho phép ngày tương lai hoặc kỳ đã khóa

Xem chi tiết: [`docs/business-rules.md`](docs/business-rules.md)
