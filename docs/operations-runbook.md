# Quy trình Vận hành & Xử lý Sự cố (Operations Runbook) – Xưởng Data Capture

Tài liệu dành cho đội ngũ Quản trị hệ thống (DevOps / SysAdmin) và Bộ phận Hỗ trợ Kỹ thuật nhằm đảm bảo ứng dụng vận hành 24/7 ổn định.

---

## 1. Giám sát & Nhật ký Hệ thống (Monitoring & Logging)

### Xem Log Thời Gian Thực
- **Console Log / System Log**:
  Tất cả log ứng dụng được ghi với cấp độ `info`, `warn`, `error`.
- **Bảng Audit Log trong DB (`audit_logs`)**:
  Mọi thao tác quan trọng (tạo phiếu, duyệt, hủy phiếu, ghi sổ kho, xác nhận kiểm kê) đều được ghi nhận kèm ID người dùng (`user_id`), mốc thời gian ISO và dữ liệu `after_data`.

Query kiểm tra lịch sử thao tác kho:
```sql
SELECT a.created_at, u.full_name, u.role, a.action, a.entity_type, a.entity_id
FROM audit_logs a
JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 50;
```

---

## 2. Các Kịch bản Sự cố Thường gặp & Xử lý (Incident Response)

### Kịch bản 1: AI Gemini OCR Bị Lỗi Rate Limit hoặc Quá Tải
- **Triệu chứng**: Phiếu giữ lâu ở trạng thái `AI_PROCESSING` hoặc chuyển về lỗi trích xuất.
- **Nguyên nhân**: Vượt quá quota API Key Gemini hoặc sự cố mạng từ dịch vụ Google GenAI.
- **Xử lý**:
  1. Kiểm tra biến `GOOGLE_GENERATIVE_AI_API_KEY`.
  2. Chuyển tạm thời sang `MOCK_AI=true` trong môi trường nếu Gemini gặp sự cố kéo dài.
  3. Nhân viên xưởng vẫn có thể nhập/xác nhận thông tin thủ công mà không bị chặn workflow.

### Kịch bản 2: Cảnh báo Tồn Âm Kho Khi Kế toán Duyệt Phiếu Ghi Sổ
- **Triệu chứng**: API trả về lỗi HTTP 400: `Âm kho bị chặn...`.
- **Xử lý**:
  1. Kiểm tra tồn hiện tại của vật tư tại kho nguồn.
  2. Nếu thuộc trường hợp đặc biệt được lãnh đạo cho phép xuất âm, Kế toán trưởng (`ACCOUNTING_MANAGER`) hoặc `ADMIN` tích chọn "Duyệt ngoại lệ xuất âm" và **bắt buộc nhập lý do ngoại lệ**.

### Kịch bản 3: Bế Tắc Khóa Cơ Sở Dữ Liệu (SQLite Lock / DB Timeout)
- **Triệu chứng**: Gặp lỗi `SQLite_BUSY` hoặc `database is locked`.
- **Xử lý**:
  1. Đảm bảo chế độ WAL mode đã bật (`PRAGMA journal_mode = WAL;`).
  2. Kiểm tra các connection chưa đóng trong transaction dài.
  3. Khởi động lại dịch vụ Node.js process.

---

## 3. Quy trình Khóa Kỳ Kế Toán Định Kỳ (Closing Inventory Period)

Cuối tháng/kỳ kế toán, Quản lý Kế toán tiến hành khóa kỳ để ngăn chỉnh sửa dữ liệu kho quá khứ:

1. Truy cập màn hình **Quản lý Kỳ kế toán** (`/admin` hoặc `/accounting`).
2. Xác nhận không còn phiếu kho nào ở trạng thái `PENDING_REVIEW` hoặc `DRAFT`.
3. Bấm **Khóa Kỳ Kế Toán**.

---

## 4. Quy trình Backup & Restore Cơ Sở Dữ Liệu

### Sao lưu SQLite (Demo Mode):
```bash
cp data/xuong-data-capture.db data/backups/xuong-data-capture-$(date +%Y%m%d%H%M%S).db
```

### Sao lưu PostgreSQL (Production):
```bash
pg_dump -U postgres -d xuong_data_capture -F c -b -v -f backup_xuong_data_capture.dump
```
