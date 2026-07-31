import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getRawClient } from '@/lib/database/client'
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  SIGNED_URL_EXPIRES_SECONDS,
} from '@/config/constants'
import { ERROR_CODES } from '@/config/constants'

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export interface FileValidationResult {
  isValid: boolean
  error?: string
  errorCode?: string
}

export interface UploadResult {
  storagePath: string
  fileHash: string
  fileSize: number
  mimeType: string
  originalFilename: string
  isDuplicate: boolean
  duplicateTransactionId?: string
  signedUrl: string
}

/**
 * Validate file format and size
 */
export function validateUploadFile(
  fileSize: number,
  mimeType: string,
  filename: string
): FileValidationResult {
  const allowed = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
  if (!allowed) {
    // Check by extension as fallback
    const ext = path.extname(filename).toLowerCase()
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
    if (!allowedExts.includes(ext)) {
      return {
        isValid: false,
        error: `Định dạng tệp không được hỗ trợ (${ext || mimeType}). Chỉ chấp nhận JPG, PNG, WEBP và PDF.`,
        errorCode: ERROR_CODES.INVALID_FILE_TYPE,
      }
    }
  }

  if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Dung lượng tệp quá lớn (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Giới hạn tối đa là ${MAX_UPLOAD_SIZE_MB}MB.`,
      errorCode: ERROR_CODES.FILE_TOO_LARGE,
    }
  }

  return { isValid: true }
}

/**
 * Calculate SHA-256 hash of a file buffer
 */
export function calculateSHA256(buffer: Buffer | ArrayBuffer): string {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/**
 * Check if an attachment with the same SHA-256 hash already exists in database
 */
export async function checkDuplicateFileHash(fileHash: string): Promise<{
  isDuplicate: boolean
  existingAttachment?: Record<string, unknown>
}> {
  const client = getRawClient()
  const result = await client.execute({
    sql: `
      SELECT a.*, t.transaction_code 
      FROM attachments a
      LEFT JOIN transactions t ON a.transaction_id = t.id
      WHERE a.file_hash = ?
      LIMIT 1
    `,
    args: [fileHash],
  })

  if (result.rows.length > 0) {
    return {
      isDuplicate: true,
      existingAttachment: result.rows[0],
    }
  }

  return { isDuplicate: false }
}

function getSignedUrlSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 16)) {
    throw new Error('Môi trường Production yêu cầu JWT_SECRET hoặc SESSION_SECRET hợp lệ cho Signed URLs')
  }
  return secret || 'xdc-secret-key-signed-urls-2026'
}

/**
 * Generate a secure signed URL token for private file access
 */
export function generateSignedUrlToken(attachmentId: string, expiresSeconds = SIGNED_URL_EXPIRES_SECONDS): {
  token: string
  expiresAt: number
} {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresSeconds
  const secret = getSignedUrlSecret()
  const data = `${attachmentId}:${expiresAt}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex')
  const token = `${expiresAt}.${signature}`

  return { token, expiresAt }
}

/**
 * Verify signed URL token
 */
export function verifySignedUrlToken(attachmentId: string, token: string): boolean {
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [expiresAtStr, signature] = parts
  const expiresAt = parseInt(expiresAtStr, 10)

  if (isNaN(expiresAt) || Date.now() / 1000 > expiresAt) {
    return false // Token expired
  }

  const secret = getSignedUrlSecret()
  const data = `${attachmentId}:${expiresAt}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

/**
 * Save file to private local storage directory or mock in demo mode
 */
export async function savePrivateFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  userId: string,
  transactionId: string
): Promise<UploadResult> {
  const validation = validateUploadFile(buffer.length, mimeType, originalFilename)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  const fileHash = calculateSHA256(buffer)
  const dupCheck = await checkDuplicateFileHash(fileHash)

  // File extension
  const ext = path.extname(originalFilename) || (mimeType === 'application/pdf' ? '.pdf' : '.jpg')
  const safeFilename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`

  // Directory path inside workspace
  const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'attachments', transactionId)
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const fullPath = path.join(uploadDir, safeFilename)
  fs.writeFileSync(fullPath, buffer)

  const storagePath = `attachments/${transactionId}/${safeFilename}`
  const tempId = `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const signedInfo = generateSignedUrlToken(tempId)

  const signedUrl = `/api/attachments/file/${tempId}?token=${signedInfo.token}`

  return {
    storagePath,
    fileHash,
    fileSize: buffer.length,
    mimeType,
    originalFilename,
    isDuplicate: dupCheck.isDuplicate,
    duplicateTransactionId: dupCheck.existingAttachment?.transaction_id ? String(dupCheck.existingAttachment.transaction_id) : undefined,
    signedUrl,
  }
}
