# Hướng dẫn Sử dụng Dành cho Nhân viên & Quản lý Xưởng (Workshop User Guide)

Tài liệu hướng dẫn thao tác trên giao diện di động (Mobile App) cho Nhân viên xưởng và Xưởng trưởng.

---

## 1. Đăng nhập & Chọn Xưởng Làm Việc

1. Truy cập địa chỉ ứng dụng trên thiết bị di động (điện thoại/máy tính bảng).
2. Đăng nhập bằng tài khoản Nhân viên xưởng (`WORKSHOP_STAFF`) hoặc Quản lý xưởng (`WORKSHOP_MANAGER`).
3. Ứng dụng tự động giới hạn phạm vi dữ liệu theo **Xưởng** mà bạn được phân công.

---

## 2. Quy trình Tạo Phiếu Kho & Chụp Ảnh Chứng Từ (Capture Wizard)

### Bước 1: Tạo Phiếu Mới & Tải Ảnh
- Trên giao diện di động `/mobile`, bấm nút **+ Tạo Phiếu Mới** (hoặc icon Camera).
- Chọn loại phiếu:
  - **Nhập kho (RECEIPT)**: Nhập nguyên vật liệu từ nhà cung cấp / sản xuất.
  - **Xuất kho (ISSUE)**: Xuất vật tư cho công trình / phân xưởng.
  - **Chuyển kho (TRANSFER)**: Chuyển hàng giữa các kho.
  - **Kiểm kê (STOCKTAKE)**: Đợt kiểm kê vật tư.
- Bấm **Chụp Ảnh** hoặc chọn tệp hóa đơn/phiếu kho từ thiết bị (Hỗ trợ JPG, PNG, WEBP, PDF tối đa 20MB).

### Bước 2: AI Trích Xuất Dữ Liệu Tự Động
- Sau khi tải ảnh, bấm **Phân Tích AI**.
- Hệ thống gửi ảnh tới AI OCR để đọc: Số chứng từ, ngày giao dịch, kho nhập/xuất, danh sách mặt hàng, đơn vị tính và số lượng.
- Phiếu chuyển sang trạng thái `AI_EXTRACTED`.

### Bước 3: Kiểm Tra & Xác Nhận Dữ Liệu (User Confirm)
- Kiểm tra các trường thông tin. Các trường có điểm tin cậy thấp hoặc chưa ánh xạ được mã hàng sẽ được tô màu cảnh báo.
- Chỉnh sửa lại số lượng, đơn vị hoặc mã hàng nếu AI nhận diện chưa chính xác.
- Bấm **Xác Nhận & Gửi Kiểm Duyệt** (Trạng thái phiếu chuyển sang `PENDING_REVIEW`).

---

## 3. Quản lý Phiếu Nháp (Draft Preservation)

- Nếu đang nhập dở mà mất kết nối mạng hoặc thoát ứng dụng, phiếu tự động được lưu thành **Phiếu Nháp (DRAFT)**.
- Bạn có thể vào mục **Danh sách Phiếu di động** để mở lại phiếu nháp và tiếp tục chỉnh sửa bất kỳ lúc nào.

---

## 4. Tham Gia Đợt Kiểm Kê Xưởng (Stocktake Workflow)

1. Khi có đợt kiểm kê được mở, vào mục **Kiểm Kê Kho**.
2. Nhập số lượng đếm thực tế (`counted_quantity`) cho từng mặt hàng.
3. Đối với các mặt hàng có chênh lệch (Thừa/Thiếu), bấm vào dòng vật tư để nhập **Giải trình nguyên nhân chênh lệch** cho Kế toán xem xét.
