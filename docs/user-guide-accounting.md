# Hướng dẫn Sử dụng Dành cho Bộ phận Kế toán (Accounting User Guide)

Tài liệu hướng dẫn nghiệp vụ dành cho Kế toán kho (`WAREHOUSE_ACCOUNTANT`), Quản lý kế toán (`ACCOUNTING_MANAGER`) và Ban Giám đốc (Viewer).

---

## 1. Màn hình Hàng Đợi Kiểm Duyệt (Review Queue)

1. Truy cập tuyến đường `/accounting/queue`.
2. Hàng đợi hiển thị toàn bộ chứng từ kho do các xưởng gửi lên (`PENDING_REVIEW`).
3. Dữ liệu tự động sắp xếp theo **Mức độ Rủi ro (Risk Level Priority)** từ cao xuống thấp:
   - 🔴 **Âm kho (NEGATIVE_STOCK)** (Rủi ro ưu tiên 1): Xuất vượt quá tồn sổ sách.
   - 🟠 **Trùng phiếu (DUPLICATE)** (Rủi ro ưu tiên 2): Trùng SHA-256 ảnh hoặc số hóa đơn.
   - 🟡 **Chưa ánh xạ (UNMAPPED_ITEM)** (Rủi ro ưu tiên 3): AI không tìm thấy mã hàng.
   - 🔵 **Sai đơn vị (UNIT_MISMATCH)** (Rủi ro ưu tiên 4): Đơn vị tính khác danh mục gốc.
   - 🟣 **Confidence thấp (LOW_CONFIDENCE)** (Rủi ro ưu tiên 5): Độ tin cậy AI < 75%.
   - ⚪ **Chờ lâu (LONG_WAIT)** (Rủi ro ưu tiên 6): Chờ duyệt > 24 giờ.
   - 🟢 **Bình thường (NORMAL)** (Rủi ro ưu tiên 7).

---

## 2. Thao Tác Duyệt Phiếu & Phê Duyệt Ngoại Lệ (Approval Workflow)

Bấm vào một chứng từ để mở **Modal Kiểm Duyệt**:

### Xem Chi Tiết 2 Màn Hình (Split View):
- Bên trái: Ảnh gốc hóa đơn/phiếu kho (Có nút Phóng to / Thu nhỏ / Xoay ảnh).
- Bên phải: Dữ liệu chi tiết do AI trích xuất và Người dùng xưởng đã xác nhận.

### Thao tác Duyệt:
1. **Phê Duyệt (`APPROVE`)**: Chuyển trạng thái phiếu sang `APPROVED`. (Lưu ý: Phiếu `APPROVED` chưa lập tức biến đổi tồn kho cho đến khi thực hiện Ghi sổ).
2. **Yêu Cầu Chỉnh Sửa (`RETURN`)**: Trả phiếu về cho xưởng bổ sung thông tin kèm lý do.
3. **Từ Chối Phiếu (`REJECT`)**: Từ chối vĩnh viễn phiếu kho kèm lý do từ chối bắt buộc.

---

## 3. Quy trình Ghi Sổ Tồn Kho (Posting to Ledger)

1. Mở phiếu ở trạng thái `APPROVED`.
2. Bấm nút **Ghi Sổ Kho (POST)**.
3. Hệ thống kiểm tra:
   - Chống ghi sổ trùng (Double Posting).
   - Kiểm tra kỳ kế toán đã khóa.
   - Kiểm tra tồn kho hiện tại.
4. Sau khi ghi sổ thành công, trạng thái chuyển sang `POSTED`. Giao dịch kho được ghi vào `inventory_ledger` bất biến.

---

## 4. Quản lý Kiểm Kê & Tạo Đề Xuất Điều Chỉnh (Stocktake & Reconciliation)

1. Truy cập màn hình **Kiểm kê Kho** (`/accounting/stocktakes`).
2. Mở đợt kiểm kê do xưởng thực hiện.
3. Xem bảng chênh lệch giữa Tồn sổ sách (`book_quantity`) và Thực tế kiểm kê (`counted_quantity`).
4. Kiểm tra các dòng chưa ánh xạ mã hàng và thực hiện **Ánh xạ thủ công**.
5. Bấm **Xác Nhận Đợt Kiểm Kê** (chuyển trạng thái sang `CONFIRMED`).
6. Bấm **Tạo Đề Xuất Điều Chỉnh**: Hệ thống tự động tạo 2 phiếu điều chỉnh Nháp:
   - Phiếu `ADJUSTMENT_IN` (Điều chỉnh tăng cho các mặt hàng thừa).
   - Phiếu `ADJUSTMENT_OUT` (Điều chỉnh giảm cho các mặt hàng thiếu).
   - **QUY TẮC BẮT BUỘC**: Các phiếu điều chỉnh khởi tạo ở dạng `DRAFT`, Kế toán duyệt và ghi sổ thủ công sau khi có quyết định xử lý chênh lệch.

---

## 5. Báo Cáo Dashboard & Xuất Dữ Liệu CSV

- Trang **Dashboard** (`/dashboard`): Xem biểu đồ tổng quan tồn kho theo xưởng, tỷ lệ lỗi OCR, số phiếu trùng và chênh lệch kiểm kê.
- Chức năng **Xuất CSV**: Cho phép xuất dữ liệu giao dịch `POSTED` ra tệp CSV với chuẩn mã hóa UTF-8 BOM, hiển thị tiếng Việt hoàn hảo trên Microsoft Excel.
