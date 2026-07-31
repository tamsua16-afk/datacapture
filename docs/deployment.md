# Hướng dẫn Triển khai (Deployment Guide) – Xưởng Data Capture

Tài liệu này hướng dẫn chi tiết quy trình đóng gói, chuẩn bị môi trường và triển khai ứng dụng **Xưởng Data Capture** lên môi trường Production (PostgreSQL / Supabase / Vercel / Docker) cũng như chạy ở chế độ Demo (SQLite local).

---

## 1. Yêu cầu Hệ thống (System Requirements)

- **Node.js**: v20.x trở lên (Khuyến nghị Node 20 LTS)
- **NPM**: v10.x trở lên
- **Cơ sở dữ liệu**:
  - **Demo Mode**: SQLite local (`file:data/xuong-data-capture.db`) – không cần cài đặt DB server.
  - **Production Mode**: PostgreSQL 15+ hoặc Supabase Cloud Service.
- **AI OCR Provider**: Google Gemini API key (`GEMINI_API_KEY` hoặc `GOOGLE_GENERATIVE_AI_API_KEY`).

---

## 2. Cấu hình Biến Môi trường (Environment Variables)

Tạo tệp `.env.local` hoặc cấu hình các biến môi trường trên Vercel/Docker:

```env
# App Config
NEXT_PUBLIC_APP_NAME=Xưởng Data Capture
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database Config (Chỉ dùng khi DEMO_MODE=false)
DATABASE_URL=postgresql://postgres:password@localhost:5432/xuong_data_capture
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session & Auth Security (Bắt buộc tối thiểu 32 ký tự ở Production)
SESSION_SECRET=openssl_rand_base64_32_chars_minimum_secret_key_here
JWT_SECRET=openssl_rand_base64_32_chars_minimum_jwt_key_here

# AI Engine (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Confidence & Thresholds
AI_CONFIDENCE_AUTO_CONFIRM=0.92
AI_CONFIDENCE_MANUAL_REVIEW=0.75

# Upload Config
MAX_UPLOAD_SIZE_MB=20
SIGNED_URL_EXPIRES_SECONDS=3600

# Mode Switches (Production phải đặt false)
DEMO_MODE=false
MOCK_AI=false
```

---

## 3. Các Bước Triển Khai Sản Xuất (Step-by-Step Production Setup)

### Bước 1: Cài đặt Dependencies
```bash
npm install --production=false
```

### Bước 2: Khởi tạo & Migration Cơ sở Dữ liệu
```bash
# Đẩy schema Drizzle ORM tới cơ sở dữ liệu PostgreSQL
npm run db:migrate

# Seed dữ liệu danh mục & tài khoản quản trị ban đầu
npm run db:seed
```

### Bước 3: Biên dịch Production Build
```bash
npm run type-check
npm run lint
npm run build
```

### Bước 4: Khởi chạy Server
```bash
npm run start
```

---

## 4. Kiểm tra Triển khai (Deployment Health Check)

Sau khi server khởi chạy, truy cập endpoint health check để kiểm tra trạng thái dịch vụ:

```bash
curl -I https://your-domain.com/api/health
```

kết quả mong đợi: `HTTP/1.1 200 OK`
