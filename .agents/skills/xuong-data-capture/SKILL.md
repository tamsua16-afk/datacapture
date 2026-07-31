---
name: xuong-data-capture
description: Thiết kế, phát triển, kiểm thử hoặc review các chức năng của ứng dụng Xưởng Data Capture, gồm phiếu kho, OCR AI, kiểm duyệt, sổ tồn kho, kiểm kê, đối chiếu, phân quyền và audit log.
---

# Xưởng Data Capture Skill

## Mục đích

Skill này quy định các nguyên tắc nghiệp vụ và kỹ thuật bắt buộc khi sửa đổi ứng dụng Xưởng Data Capture.

## Nguyên tắc không được vi phạm

1. AI không được tự động duyệt chứng từ.
2. AI không được tự tạo mã hàng.
3. AI không được tự suy đoán tỷ lệ quy đổi đơn vị.
4. Dữ liệu không rõ phải trả null hoặc chuyển sang kiểm tra thủ công.
5. Chỉ giao dịch APPROVED mới được ghi vào sổ tồn kho.
6. Việc ghi sổ phải chạy trong database transaction.
7. Không xóa giao dịch nghiệp vụ.
8. Không sửa trực tiếp giao dịch đã POSTED.
9. Mọi thay đổi quan trọng phải có audit log.
10. Nhân viên xưởng chỉ được truy cập dữ liệu của xưởng mình.
11. Ảnh gốc phải được giữ lại và truy xuất được.
12. Không để API key hoặc secret trong source code.
13. Không tích hợp MISA nếu nhiệm vụ không yêu cầu rõ.
14. Không làm phát sinh tồn âm mà không có phê duyệt ngoại lệ.
15. Không hard-code tên model Gemini đã có nguy cơ deprecated.

## Quy trình chuẩn

Một phiếu phải đi qua các bước:

DRAFT
→ IMAGE_UPLOADED
→ AI_PROCESSING
→ AI_EXTRACTED
→ USER_CONFIRMED
→ PENDING_REVIEW
→ APPROVED
→ POSTED
→ EXPORT_READY.

Các nhánh ngoại lệ:

* PENDING_REVIEW → NEEDS_REVISION.
* PENDING_REVIEW → REJECTED.
* NEEDS_REVISION → USER_CONFIRMED.
* Phiếu hủy → CANCELLED nhưng không bị xóa.

Không cho phép nhảy trực tiếp từ AI_EXTRACTED sang POSTED.

## Kiểm tra khi xây chức năng AI

Khi xây hoặc review AI extraction:

* Sử dụng JSON Schema rõ ràng.
* Validate bằng Zod ở server.
* Lưu raw response.
* Lưu parsed response.
* Lưu model và prompt version.
* Lưu thời gian xử lý.
* Có timeout.
* Có retry với giới hạn.
* Có mock mode.
* Không log API key.
* Trường không xác định trả null.
* Confidence nằm từ 0 đến 1.
* Highlight trường confidence thấp.
* Không tin kết quả AI nếu vi phạm rule nghiệp vụ.

## Kiểm tra khi xây chức năng kho

Khi xây hoặc review inventory:

* Kiểm tra quyền.
* Kiểm tra trạng thái phiếu.
* Kiểm tra kỳ khóa.
* Kiểm tra tồn hiện tại.
* Kiểm tra kho nguồn và kho đích.
* Sử dụng database transaction.
* Khóa hoặc bảo vệ dữ liệu khỏi race condition.
* Tạo ledger bất biến.
* Không sửa running balance bằng client.
* Có test cho rollback.
* Có test cho concurrent posting.
* Có test cho âm kho.

## Kiểm tra khi xây phân quyền

* Không chỉ ẩn nút trên giao diện.
* Server phải kiểm tra quyền.
* Database phải có Row Level Security khi phù hợp.
* Người dùng xưởng không được truyền workshop_id tùy ý để xem dữ liệu khác.
* Kế toán được xem theo phạm vi được cấp.
* Viewer chỉ có quyền đọc.
* Mutation quản trị chỉ dành cho Admin.
* Mọi hành động duyệt phải ghi actor_user_id.

## Kiểm tra upload file

* Kiểm tra loại file.
* Kiểm tra dung lượng.
* Tính SHA-256.
* Chặn hoặc cảnh báo file trùng.
* Không sử dụng trực tiếp tên file người dùng.
* Sử dụng đường dẫn ngẫu nhiên.
* Không public bucket.
* Sử dụng signed URL.
* Không thực thi file upload.
* Xử lý đúng lỗi mất kết nối.

## Quy tắc giao diện

* Mobile-first cho nhân viên xưởng.
* Desktop-first cho màn hình kế toán.
* Giao diện tiếng Việt.
* Nút mobile tối thiểu 44px.
* Không chỉ dùng màu để diễn đạt trạng thái.
* Cảnh báo phải có mã và mô tả.
* Luôn hiển thị ảnh gốc khi kiểm duyệt.
* Form dài phải tự lưu nháp.
* Thao tác nguy hiểm phải xác nhận.
* Trạng thái loading, empty và error phải rõ ràng.

## Checklist trước khi hoàn thành task

1. Chạy type-check.
2. Chạy lint.
3. Chạy unit test liên quan.
4. Chạy integration test liên quan.
5. Kiểm tra quyền truy cập.
6. Kiểm tra audit log.
7. Kiểm tra error handling.
8. Kiểm tra responsive nếu có UI.
9. Cập nhật tài liệu.
10. Cung cấp hướng dẫn test thủ công.
11. Cung cấp screenshot hoặc browser recording.
12. Nêu rõ phần chưa hoàn thành.

## Khi review code

Ưu tiên phát hiện:

* Sai logic tồn kho.
* Bỏ qua database transaction.
* Race condition.
* IDOR.
* Thiếu kiểm tra vai trò.
* Tin trực tiếp dữ liệu từ client.
* Tin trực tiếp kết quả AI.
* Mất dữ liệu audit.
* Xóa cứng dữ liệu.
* Lộ API key.
* Public URL ảnh.
* SQL injection.
* Upload file không an toàn.
* Hard-code dữ liệu danh mục.
* Thiếu test cho ngoại lệ.
