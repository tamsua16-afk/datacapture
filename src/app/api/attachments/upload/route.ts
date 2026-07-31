import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import {
  validateUploadFile,
  calculateSHA256,
  checkDuplicateFileHash,
  savePrivateFile,
} from '@/lib/services/storage'
import { addAttachmentToTransaction } from '@/lib/services/transactions'
import { WARNING_CODE_LABELS } from '@/types/enums'

export async function POST(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const transactionId = formData.get('transactionId') as string | null

    if (!file || !transactionId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Thiếu file hoặc ID phiếu kho',
          },
        },
        { status: 400 }
      )
    }

    // Validate file size and mime type
    const validation = validateUploadFile(file.size, file.type, file.name)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: {
            code: validation.errorCode || 'VALIDATION_ERROR',
            message: validation.error,
          },
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute SHA-256 Hash
    const fileHash = calculateSHA256(buffer)

    // Check duplicate file hash in database (DUP-02 rule)
    const dupCheck = await checkDuplicateFileHash(fileHash)

    // Save private file locally / mock storage
    const saved = await savePrivateFile(
      buffer,
      file.name,
      file.type,
      session.id,
      transactionId
    )

    // Save to attachments database table
    const attachment = await addAttachmentToTransaction({
      transactionId,
      storageProvider: 'LOCAL',
      storagePath: saved.storagePath,
      originalFilename: file.name,
      mimeType: file.type || 'image/jpeg',
      fileSize: file.size,
      fileHash,
      uploadedBy: session.id,
    })

    const warnings = []
    if (dupCheck.isDuplicate) {
      warnings.push({
        code: 'DUP-02',
        message: `${WARNING_CODE_LABELS['DUP-02']} (Phiếu ID: ${dupCheck.existingAttachment?.transaction_id || 'khác'})`,
      })
    }

    return NextResponse.json({
      data: {
        attachment,
        signedUrl: saved.signedUrl,
        fileHash,
        isDuplicate: dupCheck.isDuplicate,
        duplicateTransactionId: dupCheck.existingAttachment?.transaction_id,
        warnings,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
