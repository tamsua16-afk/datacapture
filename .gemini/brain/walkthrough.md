# Walkthrough - Milestone 7: Stocktake & Reconciliation (Kiểm kê & Đối chiếu)

Đã hoàn thành triển khai Milestone 7 cho ứng dụng Xưởng Data Capture theo đúng các yêu cầu nghiệp vụ kho và kiểm kê.

---

## 🎯 Các chức năng đã triển khai

### 1. Quản lý Đợt kiểm kê & Khóa phạm vi
- Khởi tạo đợt kiểm kê (`createStocktakeSession`) với mã sinh tự động dạng `ST-YYYYMMDD-XXX`.
- Khóa cố định Phạm vi **Xưởng**, **Kho** và **Ngày kiểm kê (`stocktakeDate`)**.

### 2. Số tồn sổ sách tại thời điểm quá khứ (Historical Book Quantity)
- Hàm `calculateHistoricalBookQuantity(warehouseId, itemId, stocktakeDate)` tính toán động chính xác số tồn sổ sách `quantity_in - quantity_out` tính đến mốc `transaction_date <= stocktakeDate`.
- Đảm bảo các giao dịch ghi sổ diễn ra sau `stocktakeDate` **không ảnh hưởng** đến số dư tồn sổ sách của đợt kiểm kê.

### 3. Trích xuất AI / Mock AI & Ánh xạ mã hàng
- Hỗ trợ trích xuất dữ liệu từ bảng kiểm kê qua AI/Mock AI (`processStocktakeExtraction`).
- Tự động ánh xạ `rawItemName` sang `itemId` qua `items.code`, `items.name` hoặc danh mục `item_aliases`.
- Nếu chưa có mã hàng -> Gán trạng thái `UNIDENTIFIED` (Chưa ánh xạ).
- Hỗ trợ giao diện chọn ánh xạ thủ công (`mapStocktakeLineItem`).

### 4. Tính chênh lệch & Phân loại dòng đối chiếu
- Tự động tính:
  - `differenceQuantity = countedQuantity - bookQuantity`
  - `differencePercentage = (differenceQuantity / bookQuantity) * 100` (hoặc 100% khi tồn sổ = 0 và thực tế > 0).
- Phân loại rõ ràng 5 trạng thái dòng:
  - `MATCH`: Số kiểm kê khớp với tồn sổ.
  - `SURPLUS`: Số kiểm kê THỪA so với sổ sách (+).
  - `SHORTAGE`: Số kiểm kê THIẾU so với sổ sách (-).
  - `UNIDENTIFIED`: Hàng hóa chưa ánh xạ mã.
  - `EXPLAINED`: Đã có giải trình nguyên nhân từ Xưởng trưởng.

### 5. Giải trình Xưởng trưởng & Kế toán xác nhận
- Cho phép Xưởng trưởng/Staff nhập lý do chênh lệch (`updateStocktakeLineExplanation`).
- Kế toán xác nhận đợt kiểm kê (`confirmStocktakeSession`), chuyển trạng thái sang `CONFIRMED` (bắt buộc tất cả các mặt hàng đã được ánh xạ).

### 6. Đề xuất điều chỉnh Nháp (DRAFT) - Không tự động ghi sổ
- Hàm `createAdjustmentProposals` tạo các phiếu kho điều chỉnh:
  - `ADJUSTMENT_IN` cho các dòng kiểm kê THỪA (`SURPLUS`).
  - `ADJUSTMENT_OUT` cho các dòng kiểm kê THIẾU (`SHORTAGE`).
- **Tất cả các phiếu tạo ra đều ở trạng thái `DRAFT`**.
- **KHÔNG tự động ghi sổ (POSTED) hay thay đổi `inventory_ledger`**. Việc ghi sổ tuân thủ đúng quy trình kiểm duyệt phiếu chuẩn.

### 7. Xuất CSV & In biên bản đối chiếu
- Xuất file CSV UTF-8 BOM (`exportStocktakeCSV`) tải trực tiếp từ giao diện.
- Component `StocktakePrintView` với giao diện chuyên nghiệp phục vụ in ấn biên bản chênh lệch kho.

---

## 🧪 Kết quả Kiểm thử & Xác minh

### Automated Tests (`tests/stocktake.test.ts`)
Tất cả 6 integration test cases đã vượt qua 100%:
1. `✓ Tính tồn kho tại thời điểm quá khứ (Historical Past Date Snapshot)`
2. `✓ Xử lý mã hàng chưa ánh xạ (UNIDENTIFIED status) và Ánh xạ thủ công`
3. `✓ Nhập counted quantity, tính chênh lệch & %, phân loại SURPLUS và SHORTAGE`
4. `✓ Nhập giải trình Xưởng trưởng và Kế toán xác nhận đợt kiểm kê`
5. `✓ Tạo Đề xuất điều chỉnh Nháp (DRAFT) - KHÔNG TỰ ĐỘNG GHI SỔ LEDGER`
6. `✓ Xuất biên bản chênh lệch kiểm kê ra CSV`

### Type Check
- `npx tsc --noEmit` hoàn thành với **0 lỗi**.
