export const APP_NAME = 'Data Capture - Ứng dụng số hóa'
export const APP_VERSION = '1.0.0'

export const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20)
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const
export const MIN_IMAGE_WIDTH = 400
export const MIN_IMAGE_HEIGHT = 300

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
export const AI_PROMPT_VERSION = 'v1.0'
export const MAX_AI_REQUESTS_PER_HOUR = 60

export const DEFAULT_CONFIDENCE_AUTO_CONFIRM = Number(
  process.env.AI_CONFIDENCE_AUTO_CONFIRM ?? 0.92
)
export const DEFAULT_CONFIDENCE_MANUAL_REVIEW = Number(
  process.env.AI_CONFIDENCE_MANUAL_REVIEW ?? 0.75
)

export const SIGNED_URL_EXPIRES_SECONDS = Number(
  process.env.SIGNED_URL_EXPIRES_SECONDS ?? 3600
)
export const STORAGE_BUCKET = 'attachments'

export const IS_DEMO_MODE = process.env.DEMO_MODE !== 'false'
export const IS_MOCK_AI = process.env.MOCK_AI !== 'false'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const QTY_ANOMALY_HISTORY_COUNT = 30
export const QTY_ANOMALY_MULTIPLIER = 3

export const DUPLICATE_LOOKBACK_DAYS = 30

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7
export const COOKIE_NAME = 'xdc-session'

export const TRANSACTION_CODE_PREFIXES = {
  PURCHASE_RECEIPT: 'NK',
  OTHER_RECEIPT: 'NK',
  PRODUCTION_RECEIPT: 'NK',
  OPENING_BALANCE: 'TON',
  MATERIAL_ISSUE: 'XK',
  SALES_ISSUE: 'XK',
  OTHER_ISSUE: 'XK',
  TRANSFER_OUT: 'CK',
  TRANSFER_IN: 'CK',
  STOCKTAKE: 'KK',
  ADJUSTMENT_IN: 'DC',
  ADJUSTMENT_OUT: 'DC',
} as const

export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  MOBILE_HOME: '/mobile',
  NEW_TRANSACTION: '/mobile/transactions/new',
  TRANSACTION_DETAIL: (id: string) => `/mobile/transactions/${id}`,
  QUEUE: '/accounting/queue',
  REVIEW: (id: string) => `/accounting/review/${id}`,
  LEDGER: '/accounting/ledger',
  STOCKTAKES: '/accounting/stocktakes',
  DASHBOARD: '/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_WORKSHOPS: '/admin/workshops',
  ADMIN_WAREHOUSES: '/admin/warehouses',
  ADMIN_ITEMS: '/admin/items',
  ADMIN_SETTINGS: '/admin/settings',
} as const

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_EXTRACTION_FAILED: 'AI_EXTRACTION_FAILED',
  DUPLICATE_DETECTED: 'DUPLICATE_DETECTED',
  NEGATIVE_STOCK: 'NEGATIVE_STOCK',
  PERIOD_LOCKED: 'PERIOD_LOCKED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DUPLICATE_FILE_HASH: 'DUPLICATE_FILE_HASH',
} as const
