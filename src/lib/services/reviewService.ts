import { getRawClient } from '@/lib/database/client'
import { TransactionType, TransactionStatus } from '@/types/enums'
import { SessionUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'

import type { RiskLevel } from '@/types/review'
import { RISK_PRIORITY_MAP, RISK_LABELS } from '@/types/review'
export type { RiskLevel }
export { RISK_PRIORITY_MAP, RISK_LABELS }

export interface RiskAssessment {
  primaryRisk: RiskLevel
  primaryRiskPriority: number // 1 (highest) to 7 (lowest)
  riskFlags: RiskLevel[]
  riskLabels: Record<RiskLevel, string>
}

export interface InventoryStockInfo {
  itemId: string
  warehouseId: string
  currentStock: number
  quantityChange: number
  expectedStock: number
  isNegative: boolean
}

/**
 * Tính toán tồn kho hiện tại của 1 mặt hàng tại 1 kho từ inventory_ledger
 */
export async function getInventoryStock(
  warehouseId: string,
  itemId: string
): Promise<number> {
  if (!warehouseId || !itemId) return 0
  const client = getRawClient()
  const result = await client.execute({
    sql: `
      SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as balance
      FROM inventory_ledger
      WHERE warehouse_id = ? AND item_id = ?
    `,
    args: [warehouseId, itemId],
  })
  return Number(result.rows[0]?.balance || 0)
}

/**
 * Tính toán tồn kho hiện tại và tồn kho dự kiến cho các dòng của phiếu
 */
export async function calculateTransactionStockBalances(
  transaction: any,
  lines: any[]
): Promise<InventoryStockInfo[]> {
  const isReceipt = [
    'PURCHASE_RECEIPT', 'OTHER_RECEIPT', 'PRODUCTION_RECEIPT',
    'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING_BALANCE'
  ].includes(transaction.transactionType)

  const warehouseId = isReceipt
    ? transaction.destinationWarehouseId
    : transaction.sourceWarehouseId

  if (!warehouseId) return []

  const stockInfos: InventoryStockInfo[] = []

  for (const line of lines) {
    const targetItemId = line.confirmedItemId || line.suggestedItemId
    if (!targetItemId) continue

    const currentStock = await getInventoryStock(warehouseId, targetItemId)
    const qty = Number(line.confirmedQuantity ?? line.extractedQuantity ?? 0)
    const quantityChange = isReceipt ? qty : -qty
    const expectedStock = currentStock + quantityChange

    stockInfos.push({
      itemId: targetItemId,
      warehouseId,
      currentStock,
      quantityChange,
      expectedStock,
      isNegative: expectedStock < 0,
    })
  }

  return stockInfos
}

/**
 * Đánh giá mức độ rủi ro của phiếu theo 7 cấp ưu tiên
 */
export async function calculateTransactionRisk(
  transaction: any,
  lines: any[],
  stockBalances?: InventoryStockInfo[]
): Promise<RiskAssessment> {
  const riskFlags: RiskLevel[] = []

  // 1. Kiểm tra Âm kho (Priority 1)
  const balances = stockBalances || (await calculateTransactionStockBalances(transaction, lines))
  if (balances.some((b) => b.isNegative)) {
    riskFlags.push('NEGATIVE_STOCK')
  }

  // 2. Kiểm tra Trùng phiếu (Priority 2)
  const dupScore = Number(transaction.duplicateScore || 0)
  const hasDupWarning = lines.some((l) => {
    const warnings = typeof l.warningCodes === 'string' ? JSON.parse(l.warningCodes) : l.warningCodes || []
    return warnings.includes('DUP-01')
  })
  if (dupScore >= 0.7 || hasDupWarning) {
    riskFlags.push('DUPLICATE')
  }

  // 3. Kiểm tra Mã hàng chưa ánh xạ (Priority 3)
  const hasUnmapped = lines.some(
    (l) => !l.confirmedItemId || l.lineStatus === 'NEEDS_MAPPING'
  )
  if (hasUnmapped) {
    riskFlags.push('UNMAPPED_ITEM')
  }

  // 4. Kiểm tra Sai đơn vị (Priority 4)
  const hasUnitMismatch = lines.some((l) => l.lineStatus === 'UNIT_MISMATCH')
  if (hasUnitMismatch) {
    riskFlags.push('UNIT_MISMATCH')
  }

  // 5. Kiểm tra Confidence thấp (Priority 5)
  const overallConf = transaction.overallConfidence ? Number(transaction.overallConfidence) : 1
  const hasLowLineConf = lines.some((l) => {
    const conf = Number(l.itemConfidence || 1)
    return conf < 0.8 || l.lineStatus === 'LOW_CONFIDENCE'
  })
  if (overallConf < 0.8 || hasLowLineConf) {
    riskFlags.push('LOW_CONFIDENCE')
  }

  // 6. Kiểm tra Chờ lâu > 24h (Priority 6)
  const submittedTime = transaction.submittedAt
    ? new Date(transaction.submittedAt).getTime()
    : new Date(transaction.createdAt).getTime()
  const hoursWaiting = (Date.now() - submittedTime) / (1000 * 60 * 60)
  if (hoursWaiting >= 24 && ['PENDING_REVIEW', 'USER_CONFIRMED'].includes(transaction.status)) {
    riskFlags.push('LONG_WAIT')
  }

  // 7. Bình thường nếu không có cờ rủi ro nào
  if (riskFlags.length === 0) {
    riskFlags.push('NORMAL')
  }

  // Sắp xếp các risk flag theo mức ưu tiên (1 là cao nhất)
  riskFlags.sort((a, b) => RISK_PRIORITY_MAP[a] - RISK_PRIORITY_MAP[b])

  const primaryRisk = riskFlags[0]

  return {
    primaryRisk,
    primaryRiskPriority: RISK_PRIORITY_MAP[primaryRisk],
    riskFlags,
    riskLabels: RISK_LABELS,
  }
}

export interface ReviewQueueFilter {
  workshopId?: string
  status?: string
  riskLevel?: string
  transactionType?: string
  search?: string
  sortBy?: 'risk' | 'newest' | 'oldest'
  startDate?: string
  endDate?: string
}

/**
 * Lấy danh sách phiếu trong Hàng đợi kiểm duyệt kèm đánh giá rủi ro
 */
export async function getReviewQueue(filters: ReviewQueueFilter = {}) {
  const client = getRawClient()
  let sql = `
    SELECT t.*,
           w.name as workshop_name, w.code as workshop_code,
           sw.name as source_warehouse_name,
           dw.name as destination_warehouse_name,
           u.full_name as sender_name,
           (SELECT COUNT(*) FROM attachments WHERE transaction_id = t.id) as attachment_count,
           (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = t.id) as line_count
    FROM transactions t
    LEFT JOIN workshops w ON t.workshop_id = w.id
    LEFT JOIN warehouses sw ON t.source_warehouse_id = sw.id
    LEFT JOIN warehouses dw ON t.destination_warehouse_id = dw.id
    LEFT JOIN users u ON t.sender_user_id = u.id
    WHERE 1=1
  `
  const args: any[] = []

  if (filters.status && filters.status !== 'ALL') {
    sql += ` AND t.status = ?`
    args.push(filters.status)
  } else if (!filters.status) {
    // Mặc định xem các phiếu chờ kiểm duyệt
    sql += ` AND t.status IN ('PENDING_REVIEW', 'USER_CONFIRMED', 'NEEDS_REVISION')`
  }

  if (filters.workshopId) {
    sql += ` AND t.workshop_id = ?`
    args.push(filters.workshopId)
  }

  if (filters.transactionType) {
    sql += ` AND t.transaction_type = ?`
    args.push(filters.transactionType)
  }

  if (filters.search) {
    sql += ` AND (t.transaction_code LIKE ? OR t.document_number LIKE ? OR t.notes LIKE ?)`
    const term = `%${filters.search.trim()}%`
    args.push(term, term, term)
  }

  if (filters.startDate) {
    sql += ` AND t.transaction_date >= ?`
    args.push(filters.startDate)
  }

  if (filters.endDate) {
    sql += ` AND t.transaction_date <= ?`
    args.push(filters.endDate)
  }

  sql += ` ORDER BY t.created_at DESC`

  const result = await client.execute({ sql, args })
  const items: any[] = []

  for (const row of result.rows) {
    const linesRes = await client.execute({
      sql: `SELECT * FROM transaction_lines WHERE transaction_id = ? ORDER BY line_number ASC`,
      args: [row.id],
    })
    const lines = linesRes.rows.map((l: any) => ({
      ...l,
      itemConfidence: Number(l.item_confidence || 0),
      unitConfidence: Number(l.unit_confidence || 0),
      quantityConfidence: Number(l.quantity_confidence || 0),
      lineStatus: l.line_status,
      confirmedItemId: l.confirmed_item_id,
      suggestedItemId: l.suggested_item_id,
      confirmedQuantity: l.confirmed_quantity,
      extractedQuantity: l.extracted_quantity,
    }))

    const stockBalances = await calculateTransactionStockBalances(row, lines)
    const riskAssessment = await calculateTransactionRisk(row, lines, stockBalances)

    // Nếu lọc theo rủi ro
    if (filters.riskLevel && filters.riskLevel !== 'ALL') {
      if (!riskAssessment.riskFlags.includes(filters.riskLevel as RiskLevel)) {
        continue
      }
    }

    items.push({
      id: row.id as string,
      transactionCode: row.transaction_code as string,
      transactionType: row.transaction_type as TransactionType,
      documentNumber: (row.document_number as string) || null,
      transactionDate: row.transaction_date as string,
      workshopId: row.workshop_id as string,
      workshopName: row.workshop_name as string,
      sourceWarehouseName: row.source_warehouse_name || null,
      destinationWarehouseName: row.destination_warehouse_name || null,
      senderName: row.sender_name as string,
      status: row.status as TransactionStatus,
      overallConfidence: row.overall_confidence ? Number(row.overall_confidence) : null,
      duplicateScore: row.duplicate_score ? Number(row.duplicate_score) : null,
      notes: (row.notes as string) || null,
      rejectionReason: (row.rejection_reason as string) || null,
      submittedAt: (row.submitted_at as string) || null,
      reviewedAt: (row.reviewed_at as string) || null,
      createdAt: row.created_at as string,
      attachmentCount: Number(row.attachment_count || 0),
      lineCount: Number(row.line_count || 0),
      riskAssessment,
      stockBalances,
    })
  }

  // Sắp xếp
  if (filters.sortBy === 'newest') {
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (filters.sortBy === 'oldest') {
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } else {
    // Mặc định: theo mức rủi ro ưu tiên (1 là cao nhất), sau đó theo ngày tạo
    items.sort((a, b) => {
      if (a.riskAssessment.primaryRiskPriority !== b.riskAssessment.primaryRiskPriority) {
        return a.riskAssessment.primaryRiskPriority - b.riskAssessment.primaryRiskPriority
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  return items
}

/**
 * Duyệt phiếu: Chuyển trạng thái sang APPROVED.
 * QUY TẮC: KHÔNG GHI SỔ KHO TRONG MILESTONE NÀY.
 */
export async function approveTransaction(
  transactionId: string,
  actor: SessionUser,
  comment?: string
) {
  if (!hasPermission(actor.role, 'APPROVE_TRANSACTION')) {
    throw new Error('Bạn không có quyền duyệt phiếu kho (Yêu cầu vai trò Kế toán hoặc Quản lý)')
  }

  const client = getRawClient()
  const txRes = await client.execute({
    sql: `SELECT * FROM transactions WHERE id = ?`,
    args: [transactionId],
  })

  if (txRes.rows.length === 0) {
    throw new Error('Không tìm thấy phiếu kho')
  }

  const tx = txRes.rows[0] as any
  const fromStatus = tx.status as string

  if (['APPROVED', 'POSTED', 'REJECTED', 'CANCELLED'].includes(fromStatus)) {
    throw new Error(`Không thể duyệt phiếu ở trạng thái "${fromStatus}"`)
  }

  const reviewedAt = new Date().toISOString()

  // Cập nhật trạng thái phiếu thành APPROVED
  await client.execute({
    sql: `
      UPDATE transactions
      SET status = 'APPROVED',
          reviewer_user_id = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [actor.id, reviewedAt, reviewedAt, transactionId],
  })

  // Thêm vào lịch sử kiểm duyệt (approval_history)
  const historyId = `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO approval_history (
        id, transaction_id, action, from_status, to_status, actor_user_id, comment, created_at
      ) VALUES (?, ?, 'APPROVE', ?, 'APPROVED', ?, ?, ?)
    `,
    args: [historyId, transactionId, fromStatus, actor.id, comment || 'Đã duyệt phiếu', reviewedAt],
  })

  // Thêm vào nhật ký hệ thống (audit_logs)
  const auditId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, user_id, after_data, created_at
      ) VALUES (?, 'transaction', ?, 'APPROVE', ?, ?, ?)
    `,
    args: [
      auditId,
      transactionId,
      actor.id,
      JSON.stringify({ fromStatus, toStatus: 'APPROVED', reviewerId: actor.id }),
      reviewedAt,
    ],
  })

  return { success: true, transactionId, status: 'APPROVED' }
}

/**
 * Trả lại phiếu: Chuyển trạng thái sang NEEDS_REVISION. Yêu cầu bắt buộc phải có lý do.
 */
export async function returnTransaction(
  transactionId: string,
  actor: SessionUser,
  reason: string
) {
  if (!hasPermission(actor.role, 'APPROVE_TRANSACTION') && !hasPermission(actor.role, 'REJECT_TRANSACTION')) {
    throw new Error('Bạn không có quyền thực hiện thao tác trả lại phiếu')
  }

  if (!reason || !reason.trim()) {
    throw new Error('Yêu cầu nhập lý do khi trả lại phiếu')
  }

  const client = getRawClient()
  const txRes = await client.execute({
    sql: `SELECT * FROM transactions WHERE id = ?`,
    args: [transactionId],
  })

  if (txRes.rows.length === 0) {
    throw new Error('Không tìm thấy phiếu kho')
  }

  const tx = txRes.rows[0] as any
  const fromStatus = tx.status as string

  if (['APPROVED', 'POSTED', 'REJECTED', 'CANCELLED'].includes(fromStatus)) {
    throw new Error(`Không thể trả lại phiếu ở trạng thái "${fromStatus}"`)
  }

  const reviewedAt = new Date().toISOString()
  const cleanReason = reason.trim()

  await client.execute({
    sql: `
      UPDATE transactions
      SET status = 'NEEDS_REVISION',
          rejection_reason = ?,
          reviewer_user_id = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [cleanReason, actor.id, reviewedAt, reviewedAt, transactionId],
  })

  // approval_history
  const historyId = `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO approval_history (
        id, transaction_id, action, from_status, to_status, actor_user_id, comment, created_at
      ) VALUES (?, ?, 'RETURN', ?, 'NEEDS_REVISION', ?, ?, ?)
    `,
    args: [historyId, transactionId, fromStatus, actor.id, cleanReason, reviewedAt],
  })

  // audit_logs
  const auditId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, user_id, after_data, created_at
      ) VALUES (?, 'transaction', ?, 'RETURN', ?, ?, ?)
    `,
    args: [
      auditId,
      transactionId,
      actor.id,
      JSON.stringify({ fromStatus, toStatus: 'NEEDS_REVISION', reason: cleanReason }),
      reviewedAt,
    ],
  })

  return { success: true, transactionId, status: 'NEEDS_REVISION' }
}

/**
 * Từ chối phiếu: Chuyển trạng thái sang REJECTED. Yêu cầu bắt buộc phải có lý do.
 */
export async function rejectTransaction(
  transactionId: string,
  actor: SessionUser,
  reason: string
) {
  if (!hasPermission(actor.role, 'REJECT_TRANSACTION')) {
    throw new Error('Bạn không có quyền từ chối phiếu kho')
  }

  if (!reason || !reason.trim()) {
    throw new Error('Yêu cầu nhập lý do khi từ chối phiếu')
  }

  const client = getRawClient()
  const txRes = await client.execute({
    sql: `SELECT * FROM transactions WHERE id = ?`,
    args: [transactionId],
  })

  if (txRes.rows.length === 0) {
    throw new Error('Không tìm thấy phiếu kho')
  }

  const tx = txRes.rows[0] as any
  const fromStatus = tx.status as string

  if (['APPROVED', 'POSTED', 'REJECTED', 'CANCELLED'].includes(fromStatus)) {
    throw new Error(`Không thể từ chối phiếu ở trạng thái "${fromStatus}"`)
  }

  const reviewedAt = new Date().toISOString()
  const cleanReason = reason.trim()

  await client.execute({
    sql: `
      UPDATE transactions
      SET status = 'REJECTED',
          rejection_reason = ?,
          reviewer_user_id = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [cleanReason, actor.id, reviewedAt, reviewedAt, transactionId],
  })

  // approval_history
  const historyId = `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO approval_history (
        id, transaction_id, action, from_status, to_status, actor_user_id, comment, created_at
      ) VALUES (?, ?, 'REJECT', ?, 'REJECTED', ?, ?, ?)
    `,
    args: [historyId, transactionId, fromStatus, actor.id, cleanReason, reviewedAt],
  })

  // audit_logs
  const auditId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, user_id, after_data, created_at
      ) VALUES (?, 'transaction', ?, 'REJECT', ?, ?, ?)
    `,
    args: [
      auditId,
      transactionId,
      actor.id,
      JSON.stringify({ fromStatus, toStatus: 'REJECTED', reason: cleanReason }),
      reviewedAt,
    ],
  })

  return { success: true, transactionId, status: 'REJECTED' }
}

/**
 * Lấy lịch sử kiểm duyệt và thao tác của phiếu
 */
export async function getTransactionApprovalHistory(transactionId: string) {
  const client = getRawClient()
  const result = await client.execute({
    sql: `
      SELECT ah.*, u.full_name as actor_name, u.role as actor_role
      FROM approval_history ah
      LEFT JOIN users u ON ah.actor_user_id = u.id
      WHERE ah.transaction_id = ?
      ORDER BY ah.created_at ASC
    `,
    args: [transactionId],
  })

  return result.rows.map((row: any) => ({
    id: row.id as string,
    transactionId: row.transaction_id as string,
    action: row.action as string,
    fromStatus: row.from_status as string,
    toStatus: row.to_status as string,
    actorUserId: row.actor_user_id as string,
    actorName: row.actor_name as string,
    actorRole: row.actor_role as string,
    comment: (row.comment as string) || null,
    createdAt: row.created_at as string,
  }))
}

/**
 * Lấy danh sách hàng đợi các dòng mã hàng chưa được ánh xạ (UNMAPPED ITEMS QUEUE)
 */
export async function getUnmappedItemsQueue(workshopId?: string) {
  const client = getRawClient()
  let sql = `
    SELECT l.*, t.transaction_code, t.transaction_type, t.transaction_date,
           t.workshop_id, w.name as workshop_name
    FROM transaction_lines l
    JOIN transactions t ON l.transaction_id = t.id
    LEFT JOIN workshops w ON t.workshop_id = w.id
    WHERE (l.confirmed_item_id IS NULL OR l.line_status = 'NEEDS_MAPPING')
      AND t.status IN ('DRAFT', 'IMAGE_UPLOADED', 'AI_EXTRACTED', 'USER_CONFIRMED', 'PENDING_REVIEW', 'NEEDS_REVISION')
  `
  const args: any[] = []

  if (workshopId) {
    sql += ` AND t.workshop_id = ?`
    args.push(workshopId)
  }

  sql += ` ORDER BY t.created_at DESC`

  const result = await client.execute({ sql, args })

  return result.rows.map((r: any) => ({
    id: r.id as string,
    transactionId: r.transaction_id as string,
    transactionCode: r.transaction_code as string,
    transactionType: r.transaction_type as string,
    transactionDate: r.transaction_date as string,
    workshopId: r.workshop_id as string,
    workshopName: r.workshop_name as string,
    lineNumber: Number(r.line_number),
    rawItemName: r.raw_item_name as string,
    suggestedItemId: r.suggested_item_id || null,
    extractedUnit: r.extracted_unit || null,
    extractedQuantity: r.extracted_quantity !== null ? Number(r.extracted_quantity) : null,
    itemConfidence: Number(r.item_confidence || 0),
    createdAt: r.created_at as string,
  }))
}

/**
 * Ánh xạ dòng mã hàng với sản phẩm trong danh mục, tùy chọn lưu Alias
 */
export async function mapUnmappedItem(
  lineId: string,
  targetItemId: string,
  createAlias: boolean,
  actor: SessionUser
) {
  const client = getRawClient()

  // 1. Kiểm tra dòng phiếu
  const lineRes = await client.execute({
    sql: `SELECT l.*, t.workshop_id FROM transaction_lines l JOIN transactions t ON l.transaction_id = t.id WHERE l.id = ?`,
    args: [lineId],
  })

  if (lineRes.rows.length === 0) {
    throw new Error('Không tìm thấy dòng chứng từ')
  }

  const line = lineRes.rows[0] as any

  // 2. Cập nhật confirmed_item_id và line_status
  await client.execute({
    sql: `
      UPDATE transaction_lines
      SET confirmed_item_id = ?,
          line_status = 'OK',
          updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [targetItemId, lineId],
  })

  // 3. Nếu chọn tạo alias cho lần trích xuất AI sau
  if (createAlias && line.raw_item_name) {
    const rawAlias = line.raw_item_name.trim()
    const normAlias = rawAlias.toLowerCase()
    const aliasId = `alias-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Kiểm tra đã có alias chưa
    const existingAlias = await client.execute({
      sql: `SELECT id FROM item_aliases WHERE normalized_alias = ? AND item_id = ?`,
      args: [normAlias, targetItemId],
    })

    if (existingAlias.rows.length === 0) {
      await client.execute({
        sql: `
          INSERT INTO item_aliases (
            id, item_id, workshop_id, alias, normalized_alias, confirmed_count, last_confirmed_at
          ) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
        `,
        args: [aliasId, targetItemId, line.workshop_id || null, rawAlias, normAlias],
      })
    } else {
      await client.execute({
        sql: `
          UPDATE item_aliases
          SET confirmed_count = confirmed_count + 1,
              last_confirmed_at = datetime('now')
          WHERE id = ?
        `,
        args: [existingAlias.rows[0].id],
      })
    }
  }

  // 4. Audit log
  const auditId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, user_id, after_data
      ) VALUES (?, 'transaction_line', ?, 'UPDATE', ?, ?)
    `,
    args: [
      auditId,
      lineId,
      actor.id,
      JSON.stringify({ action: 'MAP_ITEM', targetItemId, createAlias }),
    ],
  })

  return { success: true, lineId, targetItemId }
}
