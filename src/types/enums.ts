/**
 * Xưởng Data Capture – Tất cả Enums
 * Không thay đổi giá trị enum đã được ghi vào database.
 */

// ─── Trạng thái phiếu ───────────────────────────────────────────────────────
export const TransactionStatus = {
  DRAFT: 'DRAFT',
  IMAGE_UPLOADED: 'IMAGE_UPLOADED',
  AI_PROCESSING: 'AI_PROCESSING',
  AI_EXTRACTED: 'AI_EXTRACTED',
  USER_CONFIRMED: 'USER_CONFIRMED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  NEEDS_REVISION: 'NEEDS_REVISION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  POSTED: 'POSTED',
  EXPORT_READY: 'EXPORT_READY',
  EXPORTED: 'EXPORTED',
  CANCELLED: 'CANCELLED',
} as const

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus]

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  DRAFT: 'Nháp',
  IMAGE_UPLOADED: 'Đã tải ảnh',
  AI_PROCESSING: 'AI đang xử lý',
  AI_EXTRACTED: 'AI đã trích xuất',
  USER_CONFIRMED: 'Đã xác nhận',
  PENDING_REVIEW: 'Chờ kế toán duyệt',
  NEEDS_REVISION: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  POSTED: 'Đã ghi sổ',
  EXPORT_READY: 'Sẵn sàng xuất',
  EXPORTED: 'Đã xuất',
  CANCELLED: 'Đã hủy',
}

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  DRAFT: 'gray',
  IMAGE_UPLOADED: 'blue',
  AI_PROCESSING: 'purple',
  AI_EXTRACTED: 'indigo',
  USER_CONFIRMED: 'cyan',
  PENDING_REVIEW: 'amber',
  NEEDS_REVISION: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  POSTED: 'emerald',
  EXPORT_READY: 'teal',
  EXPORTED: 'slate',
  CANCELLED: 'zinc',
}

// ─── Loại giao dịch ─────────────────────────────────────────────────────────
export const TransactionType = {
  OPENING_BALANCE: 'OPENING_BALANCE',
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  OTHER_RECEIPT: 'OTHER_RECEIPT',
  PRODUCTION_RECEIPT: 'PRODUCTION_RECEIPT',
  MATERIAL_ISSUE: 'MATERIAL_ISSUE',
  SALES_ISSUE: 'SALES_ISSUE',
  OTHER_ISSUE: 'OTHER_ISSUE',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  STOCKTAKE: 'STOCKTAKE',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
} as const

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  OPENING_BALANCE: 'Số dư đầu kỳ',
  PURCHASE_RECEIPT: 'Nhập mua',
  OTHER_RECEIPT: 'Nhập khác',
  PRODUCTION_RECEIPT: 'Nhập sản xuất',
  MATERIAL_ISSUE: 'Xuất nguyên vật liệu',
  SALES_ISSUE: 'Xuất bán',
  OTHER_ISSUE: 'Xuất khác',
  TRANSFER_OUT: 'Chuyển kho (xuất)',
  TRANSFER_IN: 'Chuyển kho (nhập)',
  STOCKTAKE: 'Kiểm kê',
  ADJUSTMENT_IN: 'Điều chỉnh tăng',
  ADJUSTMENT_OUT: 'Điều chỉnh giảm',
}

export const RECEIPT_TYPES: TransactionType[] = [
  'OPENING_BALANCE',
  'PURCHASE_RECEIPT',
  'OTHER_RECEIPT',
  'PRODUCTION_RECEIPT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
]

export const ISSUE_TYPES: TransactionType[] = [
  'MATERIAL_ISSUE',
  'SALES_ISSUE',
  'OTHER_ISSUE',
  'TRANSFER_OUT',
  'ADJUSTMENT_OUT',
]

// ─── Vai trò người dùng ──────────────────────────────────────────────────────
export const UserRole = {
  WORKSHOP_STAFF: 'WORKSHOP_STAFF',
  WORKSHOP_MANAGER: 'WORKSHOP_MANAGER',
  WAREHOUSE_ACCOUNTANT: 'WAREHOUSE_ACCOUNTANT',
  ACCOUNTING_MANAGER: 'ACCOUNTING_MANAGER',
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  WORKSHOP_STAFF: 'Nhân viên xưởng',
  WORKSHOP_MANAGER: 'Xưởng trưởng',
  WAREHOUSE_ACCOUNTANT: 'Kế toán kho',
  ACCOUNTING_MANAGER: 'Kế toán tổng hợp',
  ADMIN: 'Quản trị hệ thống',
  VIEWER: 'Ban lãnh đạo',
}

// ─── Trạng thái dòng phiếu ───────────────────────────────────────────────────
export const LineStatus = {
  OK: 'OK',
  NEEDS_MAPPING: 'NEEDS_MAPPING',
  UNIT_MISMATCH: 'UNIT_MISMATCH',
  QUANTITY_INVALID: 'QUANTITY_INVALID',
  QUANTITY_ABNORMAL: 'QUANTITY_ABNORMAL',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  MANUAL_OVERRIDE: 'MANUAL_OVERRIDE',
} as const

export type LineStatus = (typeof LineStatus)[keyof typeof LineStatus]

export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  OK: 'Hợp lệ',
  NEEDS_MAPPING: 'Chưa xác định mã hàng',
  UNIT_MISMATCH: 'Sai đơn vị',
  QUANTITY_INVALID: 'Số lượng không hợp lệ',
  QUANTITY_ABNORMAL: 'Số lượng bất thường',
  LOW_CONFIDENCE: 'Cần kiểm tra',
  MANUAL_OVERRIDE: 'Đã điều chỉnh thủ công',
}

// ─── Loại kho ────────────────────────────────────────────────────────────────
export const WarehouseType = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  SEMI_FINISHED: 'SEMI_FINISHED',
  FINISHED_GOODS: 'FINISHED_GOODS',
  TOOLS: 'TOOLS',
  GENERAL: 'GENERAL',
} as const

export type WarehouseType = (typeof WarehouseType)[keyof typeof WarehouseType]

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  RAW_MATERIAL: 'Nguyên vật liệu',
  SEMI_FINISHED: 'Bán thành phẩm',
  FINISHED_GOODS: 'Thành phẩm',
  TOOLS: 'Công cụ dụng cụ',
  GENERAL: 'Kho chung',
}

// ─── Trạng thái kiểm kê ──────────────────────────────────────────────────────
export const StocktakeStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  ADJUSTED: 'ADJUSTED',
  CANCELLED: 'CANCELLED',
} as const

export type StocktakeStatus = (typeof StocktakeStatus)[keyof typeof StocktakeStatus]

export const STOCKTAKE_STATUS_LABELS: Record<StocktakeStatus, string> = {
  DRAFT: 'Nháp',
  IN_PROGRESS: 'Đang kiểm kê',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  ADJUSTED: 'Đã điều chỉnh',
  CANCELLED: 'Đã hủy',
}

// ─── Trạng thái dòng kiểm kê ─────────────────────────────────────────────────
export const StocktakeLineStatus = {
  MATCH: 'MATCH',
  SURPLUS: 'SURPLUS',
  SHORTAGE: 'SHORTAGE',
  UNIDENTIFIED: 'UNIDENTIFIED',
  EXPLAINED: 'EXPLAINED',
} as const

export type StocktakeLineStatus = (typeof StocktakeLineStatus)[keyof typeof StocktakeLineStatus]

export const STOCKTAKE_LINE_STATUS_LABELS: Record<StocktakeLineStatus, string> = {
  MATCH: 'Khớp',
  SURPLUS: 'Thừa',
  SHORTAGE: 'Thiếu',
  UNIDENTIFIED: 'Chưa ánh xạ',
  EXPLAINED: 'Đã giải trình',
}

export const STOCKTAKE_LINE_STATUS_COLORS: Record<StocktakeLineStatus, string> = {
  MATCH: 'emerald',
  SURPLUS: 'blue',
  SHORTAGE: 'red',
  UNIDENTIFIED: 'amber',
  EXPLAINED: 'purple',
}

// ─── Loại hành động audit ────────────────────────────────────────────────────
export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RETURN: 'RETURN',
  POST: 'POST',
} as const

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]

// ─── Mã cảnh báo nghiệp vụ ───────────────────────────────────────────────────
export const WarningCode = {
  DUP_01: 'DUP-01',
  DUP_02: 'DUP-02',
  ITEM_01: 'ITEM-01',
  UNIT_01: 'UNIT-01',
  QTY_01: 'QTY-01',
  QTY_02: 'QTY-02',
  STOCK_01: 'STOCK-01',
  WH_01: 'WH-01',
  DATE_01: 'DATE-01',
  DATE_02: 'DATE-02',
  IMAGE_01: 'IMAGE-01',
} as const

export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode]

export const WARNING_CODE_LABELS: Record<WarningCode, string> = {
  'DUP-01': 'Phiếu có thể trùng (cùng số, ngày, loại)',
  'DUP-02': 'Ảnh đã được dùng trong giao dịch khác',
  'ITEM-01': 'Không tìm thấy mã hàng phù hợp',
  'UNIT-01': 'Đơn vị không khớp với danh mục',
  'QTY-01': 'Số lượng không hợp lệ',
  'QTY-02': 'Số lượng bất thường so với lịch sử',
  'STOCK-01': 'Giao dịch có thể gây âm kho',
  'WH-01': 'Kho nguồn hoặc kho đích không hợp lệ',
  'DATE-01': 'Ngày giao dịch ở tương lai',
  'DATE-02': 'Kỳ dữ liệu đã khóa',
  'IMAGE-01': 'Chất lượng ảnh không đảm bảo',
}

// ─── Nhóm hàng hóa ───────────────────────────────────────────────────────────
export const ItemGroup = {
  CEMENT: 'CEMENT',
  SAND: 'SAND',
  STONE: 'STONE',
  STEEL: 'STEEL',
  ADDITIVE: 'ADDITIVE',
  FINISHED: 'FINISHED',
  OTHER: 'OTHER',
} as const

export type ItemGroup = (typeof ItemGroup)[keyof typeof ItemGroup]

export const ITEM_GROUP_LABELS: Record<ItemGroup, string> = {
  CEMENT: 'Xi măng',
  SAND: 'Cát',
  STONE: 'Đá',
  STEEL: 'Thép',
  ADDITIVE: 'Phụ gia',
  FINISHED: 'Thành phẩm',
  OTHER: 'Khác',
}

export const DocumentType = {
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  TRANSFER: 'TRANSFER',
  STOCKTAKE: 'STOCKTAKE',
  UNKNOWN: 'UNKNOWN',
} as const

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]

export const AIProvider = {
  GEMINI: 'GEMINI',
  MOCK: 'MOCK',
} as const

export type AIProvider = (typeof AIProvider)[keyof typeof AIProvider]

export const StorageProvider = {
  SUPABASE: 'SUPABASE',
  LOCAL: 'LOCAL',
} as const

export type StorageProvider = (typeof StorageProvider)[keyof typeof StorageProvider]

export const SnapshotSource = {
  SCHEDULED: 'SCHEDULED',
  MANUAL: 'MANUAL',
  PERIOD_CLOSE: 'PERIOD_CLOSE',
} as const

export type SnapshotSource = (typeof SnapshotSource)[keyof typeof SnapshotSource]
