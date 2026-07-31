/**
 * Xưởng Data Capture – TypeScript Models
 * Mirror cấu trúc bảng database, dùng trong toàn bộ ứng dụng.
 */

import type {
  TransactionStatus,
  TransactionType,
  UserRole,
  LineStatus,
  WarehouseType,
  StocktakeStatus,
  StocktakeLineStatus,
  AuditAction,
  StorageProvider,
  AIProvider,
  DocumentType,
  WarningCode,
  SnapshotSource,
  ItemGroup,
} from './enums'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  workshopId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Workshop {
  id: string
  code: string
  name: string
  address: string | null
  managerName: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Warehouse {
  id: string
  workshopId: string
  code: string
  name: string
  warehouseType: WarehouseType
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  workshop?: Workshop
}

export interface Item {
  id: string
  code: string
  name: string
  itemGroup: ItemGroup
  baseUnit: string
  minimumStock: number
  maximumStock: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ItemAlias {
  id: string
  itemId: string
  workshopId: string | null
  alias: string
  normalizedAlias: string
  confirmedCount: number
  lastConfirmedAt: Date | null
  createdAt: Date
  updatedAt: Date
  item?: Item
  workshop?: Workshop
}

export interface Unit {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UnitConversion {
  id: string
  itemId: string | null
  fromUnit: string
  toUnit: string
  conversionFactor: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  item?: Item
}

export interface Transaction {
  id: string
  transactionCode: string
  transactionType: TransactionType
  documentNumber: string | null
  transactionDate: Date
  workshopId: string
  sourceWarehouseId: string | null
  destinationWarehouseId: string | null
  senderUserId: string
  reviewerUserId: string | null
  status: TransactionStatus
  overallConfidence: number | null
  duplicateScore: number | null
  notes: string | null
  rejectionReason: string | null
  submittedAt: Date | null
  reviewedAt: Date | null
  postedAt: Date | null
  createdAt: Date
  updatedAt: Date
  workshop?: Workshop
  sourceWarehouse?: Warehouse
  destinationWarehouse?: Warehouse
  senderUser?: User
  reviewerUser?: User
  lines?: TransactionLine[]
  attachments?: Attachment[]
}

export interface TransactionLine {
  id: string
  transactionId: string
  lineNumber: number
  rawItemName: string
  suggestedItemId: string | null
  confirmedItemId: string | null
  extractedUnit: string | null
  confirmedUnit: string | null
  extractedQuantity: number | null
  confirmedQuantity: number | null
  batchNumber: string | null
  itemConfidence: number
  unitConfidence: number
  quantityConfidence: number
  lineStatus: LineStatus
  warningCodes: WarningCode[]
  createdAt: Date
  updatedAt: Date
  suggestedItem?: Item
  confirmedItem?: Item
}

export interface Attachment {
  id: string
  transactionId: string
  storageProvider: StorageProvider
  storagePath: string
  originalFilename: string
  mimeType: string
  fileSize: number
  imageWidth: number | null
  imageHeight: number | null
  pageNumber: number
  imageQualityScore: number | null
  fileHash: string
  uploadedBy: string
  createdAt: Date
  transaction?: Transaction
  uploader?: User
}

export interface AIExtractedLine {
  lineNumber: number
  rawItemName: string
  suggestedItemCode: string | null
  unit: string | null
  quantity: number | null
  batchNumber: string | null
  confidence: {
    item: number
    unit: number
    quantity: number
  }
}

export interface AIWarning {
  code: string
  message: string
}

export interface AIExtractedData {
  documentType: DocumentType
  documentNumber: string | null
  transactionDate: string | null
  workshopName: string | null
  sourceWarehouse: string | null
  destinationWarehouse: string | null
  senderName: string | null
  receiverName: string | null
  lines: AIExtractedLine[]
  overallConfidence: number
  warnings: AIWarning[]
}

export interface TokenUsage {
  promptTokens: number
  candidatesTokens: number
  totalTokens: number
}

export interface AIExtraction {
  id: string
  transactionId: string
  provider: AIProvider
  model: string
  promptVersion: string
  rawResponse: Record<string, unknown>
  parsedResponse: AIExtractedData | null
  processingTimeMs: number
  tokenUsage: TokenUsage | null
  errorMessage: string | null
  createdAt: Date
}

export interface ApprovalHistory {
  id: string
  transactionId: string
  action: AuditAction
  fromStatus: TransactionStatus
  toStatus: TransactionStatus
  actorUserId: string
  comment: string | null
  snapshotBefore: Record<string, unknown>
  snapshotAfter: Record<string, unknown>
  createdAt: Date
  actor?: User
}

export interface InventoryLedger {
  id: string
  transactionId: string
  transactionLineId: string
  workshopId: string
  warehouseId: string
  itemId: string
  transactionDate: Date
  quantityIn: number
  quantityOut: number
  runningBalance: number
  createdAt: Date
  item?: Item
  warehouse?: Warehouse
  workshop?: Workshop
}

export interface InventorySnapshot {
  id: string
  snapshotDate: Date
  workshopId: string
  warehouseId: string
  itemId: string
  quantity: number
  source: SnapshotSource
  createdAt: Date
}

export interface Stocktake {
  id: string
  code: string
  workshopId: string
  warehouseId: string
  stocktakeDate: Date
  status: StocktakeStatus
  createdBy: string
  confirmedBy: string | null
  createdAt: Date
  updatedAt: Date
  workshop?: Workshop
  warehouse?: Warehouse
  lines?: StocktakeLine[]
}

export interface StocktakeLine {
  id: string
  stocktakeId: string
  itemId: string | null
  rawItemName: string
  bookQuantity: number
  countedQuantity: number
  differenceQuantity: number
  differencePercentage: number
  status: StocktakeLineStatus
  explanation: string | null
  createdAt: Date
  updatedAt: Date
  item?: Item
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: AuditAction
  userId: string
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user?: User
}

export interface SystemSetting {
  id: string
  settingKey: string
  settingValue: unknown
  updatedBy: string
  updatedAt: Date
}

export interface InventoryBalance {
  workshopId: string
  warehouseId: string
  itemId: string
  itemCode: string
  itemName: string
  baseUnit: string
  currentBalance: number
  lastTransactionDate: Date | null
}

export interface DashboardKPIs {
  transactionsToday: number
  pendingReview: number
  needsRevision: number
  aiAccuracyRate: number
  imageRetakeRate: number
  avgProcessingHours: number
  duplicatesBlocked: number
  negativeStockWarnings: number
  unmappedItems: number
  stocktakeVariance: number
  estimatedHoursSaved: number
}

export interface PermissionContext {
  userId: string
  role: UserRole
  workshopId: string | null
}

export interface ConfidenceThresholds {
  autoConfirm: number
  manualReview: number
}

export interface ImageQualityResult {
  isValid: boolean
  qualityScore: number
  width: number | null
  height: number | null
  warnings: string[]
}

export interface BusinessRuleResult {
  passed: boolean
  code: WarningCode
  message: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  data?: Record<string, unknown>
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  workshopId: string | null
}
