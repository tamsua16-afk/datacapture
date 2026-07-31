import { getRawClient } from '@/lib/database/client'
import { TRANSACTION_CODE_PREFIXES } from '@/config/constants'
import { TransactionType, TransactionStatus } from '@/types/enums'

export interface CreateDraftInput {
  id?: string
  transactionType: TransactionType
  workshopId: string
  sourceWarehouseId?: string | null
  destinationWarehouseId?: string | null
  documentNumber?: string | null
  transactionDate?: string | Date
  notes?: string | null
  senderUserId: string
}

export interface AttachmentInput {
  id?: string
  transactionId: string
  storageProvider?: string
  storagePath: string
  originalFilename: string
  mimeType: string
  fileSize: number
  imageWidth?: number | null
  imageHeight?: number | null
  pageNumber?: number
  imageQualityScore?: number | null
  fileHash: string
  uploadedBy: string
}

/**
 * Sinh mã giao dịch theo tiền tố (NK-, XK-, CK-, KK-, DC-)
 */
export async function generateTransactionCode(type: TransactionType): Promise<string> {
  const prefix = TRANSACTION_CODE_PREFIXES[type] || 'PX'
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${dateStr}-${randomSuffix}`
}

/**
 * Tạo hoặc cập nhật phiếu nháp DRAFT
 */
export async function saveDraftTransaction(input: CreateDraftInput) {
  const client = getRawClient()
  const txDate = input.transactionDate
    ? new Date(input.transactionDate).toISOString()
    : new Date().toISOString()

  if (input.id) {
    // Cập nhật phiếu nháp hiện tại
    await client.execute({
      sql: `
        UPDATE transactions
        SET transaction_type = ?,
            workshop_id = ?,
            source_warehouse_id = ?,
            destination_warehouse_id = ?,
            document_number = ?,
            transaction_date = ?,
            notes = ?,
            updated_at = datetime('now')
        WHERE id = ? AND status = 'DRAFT'
      `,
      args: [
        input.transactionType,
        input.workshopId,
        input.sourceWarehouseId || null,
        input.destinationWarehouseId || null,
        input.documentNumber || null,
        txDate,
        input.notes || null,
        input.id,
      ],
    })

    return getTransactionById(input.id)
  }

  // Tạo mới phiếu DRAFT
  const newId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const code = await generateTransactionCode(input.transactionType)

  await client.execute({
    sql: `
      INSERT INTO transactions (
        id, transaction_code, transaction_type, workshop_id,
        source_warehouse_id, destination_warehouse_id, document_number,
        transaction_date, sender_user_id, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, datetime('now'), datetime('now'))
    `,
    args: [
      newId,
      code,
      input.transactionType,
      input.workshopId,
      input.sourceWarehouseId || null,
      input.destinationWarehouseId || null,
      input.documentNumber || null,
      txDate,
      input.senderUserId,
      input.notes || null,
    ],
  })

  return getTransactionById(newId)
}

/**
 * Lấy chi tiết phiếu kèm danh sách ảnh đính kèm và xưởng/kho
 */
export async function getTransactionById(id: string) {
  const client = getRawClient()

  const txRes = await client.execute({
    sql: `
      SELECT t.*, 
             w.name as workshop_name, w.code as workshop_code,
             sw.name as source_warehouse_name, sw.code as source_warehouse_code,
             dw.name as destination_warehouse_name, dw.code as destination_warehouse_code,
             u.full_name as sender_name, u.email as sender_email
      FROM transactions t
      LEFT JOIN workshops w ON t.workshop_id = w.id
      LEFT JOIN warehouses sw ON t.source_warehouse_id = sw.id
      LEFT JOIN warehouses dw ON t.destination_warehouse_id = dw.id
      LEFT JOIN users u ON t.sender_user_id = u.id
      WHERE t.id = ?
    `,
    args: [id],
  })

  if (txRes.rows.length === 0) return null
  const tx = txRes.rows[0] as any

  // Lấy danh sách ảnh đính kèm
  const attRes = await client.execute({
    sql: `SELECT * FROM attachments WHERE transaction_id = ? ORDER BY page_number ASC, created_at ASC`,
    args: [id],
  })

  // Lấy danh sách dòng phiếu nếu có
  const linesRes = await client.execute({
    sql: `SELECT * FROM transaction_lines WHERE transaction_id = ? ORDER BY line_number ASC`,
    args: [id],
  })

  return {
    id: tx.id as string,
    transactionCode: tx.transaction_code as string,
    transactionType: tx.transaction_type as TransactionType,
    documentNumber: (tx.document_number as string) || null,
    transactionDate: tx.transaction_date as string,
    workshopId: tx.workshop_id as string,
    sourceWarehouseId: (tx.source_warehouse_id as string) || null,
    destinationWarehouseId: (tx.destination_warehouse_id as string) || null,
    senderUserId: tx.sender_user_id as string,
    reviewerUserId: (tx.reviewer_user_id as string) || null,
    status: tx.status as TransactionStatus,
    overallConfidence: tx.overall_confidence ? Number(tx.overall_confidence) : null,
    duplicateScore: tx.duplicate_score ? Number(tx.duplicate_score) : null,
    notes: (tx.notes as string) || null,
    rejectionReason: (tx.rejection_reason as string) || null,
    submittedAt: (tx.submitted_at as string) || null,
    reviewedAt: (tx.reviewed_at as string) || null,
    postedAt: (tx.posted_at as string) || null,
    createdAt: tx.created_at as string,
    updatedAt: tx.updated_at as string,
    workshopName: tx.workshop_name,
    sourceWarehouseName: tx.source_warehouse_name,
    destinationWarehouseName: tx.destination_warehouse_name,
    senderName: tx.sender_name,
    attachments: attRes.rows.map((a: any) => ({
      id: a.id as string,
      transactionId: a.transaction_id as string,
      storageProvider: a.storage_provider as string,
      storagePath: a.storage_path as string,
      originalFilename: a.original_filename as string,
      mimeType: a.mime_type as string,
      fileSize: Number(a.file_size),
      imageWidth: a.image_width ? Number(a.image_width) : null,
      imageHeight: a.image_height ? Number(a.image_height) : null,
      pageNumber: Number(a.page_number || 1),
      fileHash: a.file_hash as string,
      uploadedBy: a.uploaded_by as string,
      createdAt: a.created_at as string,
    })),
    lines: linesRes.rows.map((l: any) => ({
      id: l.id as string,
      transactionId: l.transaction_id as string,
      lineNumber: Number(l.line_number),
      rawItemName: l.raw_item_name as string,
      suggestedItemId: (l.suggested_item_id as string) || null,
      confirmedItemId: (l.confirmed_item_id as string) || null,
      extractedUnit: (l.extracted_unit as string) || null,
      confirmedUnit: (l.confirmed_unit as string) || null,
      extractedQuantity: l.extracted_quantity !== null ? Number(l.extracted_quantity) : null,
      confirmedQuantity: l.confirmed_quantity !== null ? Number(l.confirmed_quantity) : null,
      batchNumber: (l.batch_number as string) || null,
      itemConfidence: Number(l.item_confidence || 0),
      unitConfidence: Number(l.unit_confidence || 0),
      quantityConfidence: Number(l.quantity_confidence || 0),
      lineStatus: l.line_status as string,
      warningCodes: typeof l.warning_codes === 'string' ? JSON.parse(l.warning_codes) : l.warning_codes || [],
    })),
  }
}

/**
 * Thêm attachment cho phiếu kho
 */
export async function addAttachmentToTransaction(input: AttachmentInput) {
  const client = getRawClient()
  const attId = input.id || `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  await client.execute({
    sql: `
      INSERT INTO attachments (
        id, transaction_id, storage_provider, storage_path,
        original_filename, mime_type, file_size, image_width, image_height,
        page_number, image_quality_score, file_hash, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    args: [
      attId,
      input.transactionId,
      input.storageProvider || 'LOCAL',
      input.storagePath,
      input.originalFilename,
      input.mimeType,
      input.fileSize,
      input.imageWidth || null,
      input.imageHeight || null,
      input.pageNumber || 1,
      input.imageQualityScore || null,
      input.fileHash,
      input.uploadedBy,
    ],
  })

  // Nếu phiếu đang là DRAFT, cập nhật thành IMAGE_UPLOADED
  await client.execute({
    sql: `UPDATE transactions SET status = 'IMAGE_UPLOADED', updated_at = datetime('now') WHERE id = ? AND status = 'DRAFT'`,
    args: [input.transactionId],
  })

  return { id: attId, ...input }
}

/**
 * Xóa tệp đính kèm
 */
export async function deleteAttachment(attachmentId: string, transactionId: string) {
  const client = getRawClient()
  await client.execute({
    sql: `DELETE FROM attachments WHERE id = ? AND transaction_id = ?`,
    args: [attachmentId, transactionId],
  })

  // Đếm lại số ảnh còn lại
  const countRes = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM attachments WHERE transaction_id = ?`,
    args: [transactionId],
  })
  const cnt = Number(countRes.rows[0]?.cnt || 0)

  if (cnt === 0) {
    // Nếu hết ảnh, chuyển lại về DRAFT
    await client.execute({
      sql: `UPDATE transactions SET status = 'DRAFT', updated_at = datetime('now') WHERE id = ? AND status = 'IMAGE_UPLOADED'`,
      args: [transactionId],
    })
  }
}

/**
 * Gửi phiếu sang xử lý AI (DRAFT / IMAGE_UPLOADED -> AI_PROCESSING -> AI_EXTRACTED)
 */
export async function submitForAIProcessing(transactionId: string, options?: any) {
  const { processAIForTransaction } = await import('@/lib/ai/extractionService')
  await processAIForTransaction(transactionId, options)
  return getTransactionById(transactionId)
}

export interface ConfirmLineInput {
  lineId?: string
  lineNumber: number
  confirmedItemId: string | null
  confirmedUnit: string | null
  confirmedQuantity: number | null
  batchNumber?: string | null
}

/**
 * Cho người dùng sửa thông tin chi tiết và xác nhận phiếu (AI_EXTRACTED -> USER_CONFIRMED)
 */
export async function confirmExtractedTransaction(
  transactionId: string,
  confirmedLines: ConfirmLineInput[],
  notes?: string
) {
  const client = getRawClient()

  // Kiểm tra không được sửa trực tiếp phiếu đã POSTED
  const checkTx = await client.execute({
    sql: `SELECT status FROM transactions WHERE id = ?`,
    args: [transactionId],
  })
  if (checkTx.rows.length > 0 && checkTx.rows[0].status === 'POSTED') {
    throw new Error('Giao dịch đã POSTED không được chỉnh sửa trực tiếp. Vui lòng tạo phiếu đảo hoặc phiếu điều chỉnh.')
  }


  for (const line of confirmedLines) {
    if (line.lineId) {
      await client.execute({
        sql: `
          UPDATE transaction_lines
          SET confirmed_item_id = ?,
              confirmed_unit = ?,
              confirmed_quantity = ?,
              batch_number = ?,
              line_status = 'MANUAL_OVERRIDE',
              updated_at = datetime('now')
          WHERE id = ? AND transaction_id = ?
        `,
        args: [
          line.confirmedItemId || null,
          line.confirmedUnit || null,
          line.confirmedQuantity !== undefined ? line.confirmedQuantity : null,
          line.batchNumber || null,
          line.lineId,
          transactionId,
        ],
      })
    }
  }

  await client.execute({
    sql: `
      UPDATE transactions
      SET status = 'USER_CONFIRMED',
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [notes || null, transactionId],
  })

  return getTransactionById(transactionId)
}

/**
 * Lấy danh sách phiếu cho di động
 */
export async function getMobileTransactions(userId: string, workshopId?: string | null) {
  const client = getRawClient()
  let sql = `
    SELECT t.*, w.name as workshop_name,
           (SELECT COUNT(*) FROM attachments WHERE transaction_id = t.id) as attachment_count
    FROM transactions t
    LEFT JOIN workshops w ON t.workshop_id = w.id
    WHERE 1=1
  `
  const args: any[] = []

  if (workshopId) {
    sql += ` AND t.workshop_id = ?`
    args.push(workshopId)
  }

  sql += ` ORDER BY t.updated_at DESC LIMIT 50`

  const result = await client.execute({ sql, args })

  return result.rows.map((t: any) => ({
    id: t.id as string,
    transactionCode: t.transaction_code as string,
    transactionType: t.transaction_type as TransactionType,
    documentNumber: (t.document_number as string) || null,
    transactionDate: t.transaction_date as string,
    workshopId: t.workshop_id as string,
    workshopName: t.workshop_name as string,
    status: t.status as TransactionStatus,
    overallConfidence: t.overall_confidence ? Number(t.overall_confidence) : null,
    attachmentCount: Number(t.attachment_count || 0),
    updatedAt: t.updated_at as string,
  }))
}
