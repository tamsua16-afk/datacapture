import { getRawClient } from '@/lib/database/client'
import { SessionUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'
import { generateTransactionCode } from './transactions'
import { TransactionType } from '@/types/enums'

export interface PostTransactionOptions {
  allowNegativeStock?: boolean
  negativeStockReason?: string
}

export interface LedgerFilter {
  workshopId?: string
  warehouseId?: string
  itemId?: string
  startDate?: string
  endDate?: string
  transactionType?: string
  search?: string
  limit?: number
  offset?: number
}

export interface StockBalanceFilter {
  workshopId?: string
  warehouseId?: string
  itemGroup?: string
  search?: string
}

export interface PeriodInput {
  workshopId?: string | null
  periodName: string
  startDate: string
  endDate: string
}

/**
 * Ghi sổ tồn kho cho phiếu ở trạng thái APPROVED trong Database Transaction
 */
export async function postTransactionToLedger(
  transactionId: string,
  actor: SessionUser,
  options?: PostTransactionOptions
) {
  if (!hasPermission(actor.role, 'POST_TRANSACTION')) {
    throw new Error('Bạn không có quyền thực hiện ghi sổ tồn kho (Yêu cầu vai trò Kế toán hoặc Quản lý)')
  }

  const client = getRawClient()
  await client.execute('BEGIN IMMEDIATE')

  try {
    // 1. Kiểm tra sự tồn tại và trạng thái của phiếu
    const txRes = await client.execute({
      sql: `SELECT * FROM transactions WHERE id = ?`,
      args: [transactionId],
    })

    if (txRes.rows.length === 0) {
      throw new Error('Không tìm thấy phiếu kho')
    }

    const transaction = txRes.rows[0] as any
    const currentStatus = transaction.status as string
    const txType = transaction.transaction_type as string
    const txDate = transaction.transaction_date as string

    if (currentStatus === 'POSTED') {
      throw new Error('Phiếu kho đã được ghi sổ trước đó (Chống double posting)')
    }

    if (currentStatus !== 'APPROVED') {
      throw new Error(`Chỉ phiếu ở trạng thái APPROVED mới được ghi sổ (Trạng thái hiện tại: "${currentStatus}")`)
    }

    // 2. Kiểm tra kỳ kế toán đã khóa hay chưa
    const txDateStr = new Date(txDate).toISOString().slice(0, 10)
    const periodCheck = await client.execute({
      sql: `
        SELECT * FROM inventory_periods
        WHERE is_closed = 1
          AND date(?) >= date(start_date)
          AND date(?) <= date(end_date)
          AND (workshop_id IS NULL OR workshop_id = ?)
      `,
      args: [txDateStr, txDateStr, transaction.workshop_id],
    })

    if (periodCheck.rows.length > 0) {
      throw new Error('Kỳ kế toán chứa ngày chứng từ này đã bị khóa. Không thể ghi sổ.')
    }

    // 3. Lấy danh sách các dòng phiếu và kiểm tra tính hợp lệ
    const linesRes = await client.execute({
      sql: `SELECT * FROM transaction_lines WHERE transaction_id = ? ORDER BY line_number ASC`,
      args: [transactionId],
    })

    const validLines = linesRes.rows.filter((l: any) => {
      const itemId = l.confirmed_item_id || l.suggested_item_id
      const qty = Number(l.confirmed_quantity ?? l.extracted_quantity ?? 0)
      return itemId && qty > 0
    })

    if (validLines.length === 0) {
      throw new Error('Phiếu không có dòng hàng hóa hợp lệ để ghi sổ')
    }

    // 4. Chuyển trạng thái sang POSTED một cách nguyên tử (Chống concurrent posting)
    const postedAt = new Date().toISOString()
    const updateStatusRes = await client.execute({
      sql: `
        UPDATE transactions
        SET status = 'POSTED',
            posted_at = ?,
            updated_at = ?
        WHERE id = ? AND status = 'APPROVED'
      `,
      args: [postedAt, postedAt, transactionId],
    })

    if (updateStatusRes.rowsAffected === 0) {
      throw new Error('Giao dịch đang được xử lý bởi thao tác khác hoặc trạng thái không còn là APPROVED (Concurrent posting bị chặn)')
    }

    // 5. Xác định các vế chuyển dịch kho (Movements)
    const isTransfer =
      ['TRANSFER_OUT', 'TRANSFER_IN'].includes(txType) ||
      (transaction.source_warehouse_id &&
        transaction.destination_warehouse_id &&
        transaction.source_warehouse_id !== transaction.destination_warehouse_id)

    const isReceipt = [
      'PURCHASE_RECEIPT', 'OTHER_RECEIPT', 'PRODUCTION_RECEIPT',
      'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING_BALANCE'
    ].includes(txType)

    for (const line of validLines) {
      const itemId = (line.confirmed_item_id || line.suggested_item_id) as string
      const qty = Number(line.confirmed_quantity ?? line.extracted_quantity ?? 0)

      const movements: Array<{ warehouseId: string; quantityIn: number; quantityOut: number }> = []

      if (isTransfer) {
        // Phiếu chuyển kho: tạo đầy đủ 2 vế (Xuất ở kho nguồn, Nhập ở kho đích)
        if (transaction.source_warehouse_id) {
          movements.push({
            warehouseId: transaction.source_warehouse_id,
            quantityIn: 0,
            quantityOut: qty,
          })
        }
        if (transaction.destination_warehouse_id) {
          movements.push({
            warehouseId: transaction.destination_warehouse_id,
            quantityIn: qty,
            quantityOut: 0,
          })
        }
      } else if (isReceipt) {
        const targetWh = transaction.destination_warehouse_id || transaction.source_warehouse_id
        if (!targetWh) throw new Error('Phiếu nhập kho phải có thông tin kho đích')
        movements.push({
          warehouseId: targetWh,
          quantityIn: qty,
          quantityOut: 0,
        })
      } else {
        // Issue (Xuất kho)
        const sourceWh = transaction.source_warehouse_id || transaction.destination_warehouse_id
        if (!sourceWh) throw new Error('Phiếu xuất kho phải có thông tin kho xuất')
        movements.push({
          warehouseId: sourceWh,
          quantityIn: 0,
          quantityOut: qty,
        })
      }

      // Xử lý ghi sổ cho từng vế movement
      for (const mov of movements) {
        // Lấy tồn kho hiện tại tức thời trong transaction
        const stockRes = await client.execute({
          sql: `
            SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as balance
            FROM inventory_ledger
            WHERE warehouse_id = ? AND item_id = ?
          `,
          args: [mov.warehouseId, itemId],
        })

        const currentStock = Number(stockRes.rows[0]?.balance || 0)
        const newBalance = currentStock + mov.quantityIn - mov.quantityOut

        // 6. Kiểm tra âm kho
        if (newBalance < 0) {
          const isAllowedException =
            options?.allowNegativeStock === true &&
            ['ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role) &&
            Boolean(options?.negativeStockReason?.trim())

          if (options?.allowNegativeStock === true) {
            if (!['ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role)) {
              throw new Error('Chỉ ACCOUNTING_MANAGER hoặc ADMIN mới có quyền duyệt ngoại lệ xuất âm kho')
            }
            if (!options?.negativeStockReason || !options.negativeStockReason.trim()) {
              throw new Error('Yêu cầu nhập lý do bắt buộc khi phê duyệt ngoại lệ xuất âm kho')
            }
          }

          if (!isAllowedException) {
            throw new Error(
              `Thao tác làm tồn kho bị âm (Tồn hiện tại: ${currentStock}, xuất: ${mov.quantityOut}, còn lại: ${newBalance}). Âm kho bị chặn.`
            )
          }
        }

        // Ghi dòng ledger bất biến
        const ledgerId = `ledg-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
        await client.execute({
          sql: `
            INSERT INTO inventory_ledger (
              id, transaction_id, transaction_line_id, workshop_id, warehouse_id,
              item_id, transaction_date, quantity_in, quantity_out, running_balance, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            ledgerId,
            transactionId,
            line.id,
            transaction.workshop_id,
            mov.warehouseId,
            itemId,
            txDate,
            mov.quantityIn,
            mov.quantityOut,
            newBalance,
            postedAt,
          ],
        })
      }
    }

    // 7. Ghi lịch sử kiểm duyệt (approval_history)
    const historyId = `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    await client.execute({
      sql: `
        INSERT INTO approval_history (
          id, transaction_id, action, from_status, to_status, actor_user_id, comment, created_at
        ) VALUES (?, ?, 'POST', 'APPROVED', 'POSTED', ?, ?, ?)
      `,
      args: [
        historyId,
        transactionId,
        actor.id,
        options?.negativeStockReason
          ? `Ghi sổ kho (Duyệt ngoại lệ âm kho: ${options.negativeStockReason})`
          : 'Ghi sổ kho thành công',
        postedAt,
      ],
    })

    // 8. Ghi audit logs
    const auditId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    await client.execute({
      sql: `
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, user_id, after_data, created_at
        ) VALUES (?, 'transaction', ?, 'POST', ?, ?, ?)
      `,
      args: [
        auditId,
        transactionId,
        actor.id,
        JSON.stringify({
          action: 'POST_TRANSACTION',
          status: 'POSTED',
          options,
        }),
        postedAt,
      ],
    })

    await client.execute('COMMIT')
    return { success: true, transactionId, status: 'POSTED' }
  } catch (error) {
    try {
      await client.execute('ROLLBACK')
    } catch {
      // Ignore rollback errors if already rolled back
    }
    throw error
  }
}

/**
 * Tạo giao dịch đảo (Reversal Transaction) cho giao dịch đã POSTED

 */
export async function createReversalTransaction(
  originalTransactionId: string,
  actor: SessionUser,
  reason: string
) {
  if (!hasPermission(actor.role, 'POST_TRANSACTION')) {
    throw new Error('Bạn không có quyền thực hiện tạo phiếu đảo')
  }

  if (!reason || !reason.trim()) {
    throw new Error('Lý do tạo phiếu đảo là bắt buộc')
  }

  const client = getRawClient()
  const origRes = await client.execute({
    sql: `SELECT * FROM transactions WHERE id = ?`,
    args: [originalTransactionId],
  })

  if (origRes.rows.length === 0) {
    throw new Error('Không tìm thấy giao dịch gốc')
  }

  const origTx = origRes.rows[0] as any
  if (origTx.status !== 'POSTED') {
    throw new Error('Chỉ có thể tạo phiếu đảo cho giao dịch đã ghi sổ (POSTED)')
  }

  // Xác định loại phiếu đảo ngược
  let reversalType: TransactionType = 'ADJUSTMENT_OUT'
  if (['PURCHASE_RECEIPT', 'OTHER_RECEIPT', 'PRODUCTION_RECEIPT', 'ADJUSTMENT_IN', 'OPENING_BALANCE'].includes(origTx.transaction_type)) {
    reversalType = 'ADJUSTMENT_OUT'
  } else if (['MATERIAL_ISSUE', 'SALES_ISSUE', 'OTHER_ISSUE', 'ADJUSTMENT_OUT'].includes(origTx.transaction_type)) {
    reversalType = 'ADJUSTMENT_IN'
  } else if (['TRANSFER_OUT', 'TRANSFER_IN'].includes(origTx.transaction_type)) {
    reversalType = 'TRANSFER_OUT'
  }

  const reversalId = `tx-rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const reversalCode = await generateTransactionCode(reversalType)

  // Với chuyển kho, đảo ngược kho nguồn và kho đích
  const sourceWh = origTx.transaction_type.startsWith('TRANSFER')
    ? origTx.destination_warehouse_id
    : origTx.source_warehouse_id
  const destWh = origTx.transaction_type.startsWith('TRANSFER')
    ? origTx.source_warehouse_id
    : origTx.destination_warehouse_id

  // 1. Tạo giao dịch đảo với trạng thái APPROVED
  const now = new Date().toISOString()
  await client.execute({
    sql: `
      INSERT INTO transactions (
        id, transaction_code, transaction_type, document_number, transaction_date,
        workshop_id, source_warehouse_id, destination_warehouse_id, sender_user_id,
        reviewer_user_id, status, notes, reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?)
    `,
    args: [
      reversalId,
      reversalCode,
      reversalType,
      origTx.document_number ? `REV-${origTx.document_number}` : `REV-${origTx.transaction_code}`,
      now,
      origTx.workshop_id,
      sourceWh || null,
      destWh || null,
      actor.id,
      actor.id,
      `[PHIẾU ĐẢO] Đảo giao dịch ${origTx.transaction_code}. Lý do: ${reason.trim()}`,
      now,
      now,
      now,
    ],
  })

  // 2. Sao chép các dòng phiếu
  const origLines = await client.execute({
    sql: `SELECT * FROM transaction_lines WHERE transaction_id = ? ORDER BY line_number ASC`,
    args: [originalTransactionId],
  })

  for (const line of origLines.rows as any[]) {
    const lineId = `line-rev-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (
          id, transaction_id, line_number, raw_item_name, suggested_item_id,
          confirmed_item_id, extracted_unit, confirmed_unit, extracted_quantity,
          confirmed_quantity, batch_number, line_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OK', ?, ?)
      `,
      args: [
        lineId,
        reversalId,
        line.line_number,
        line.raw_item_name,
        line.suggested_item_id || null,
        line.confirmed_item_id || null,
        line.extracted_unit || null,
        line.confirmed_unit || null,
        line.extracted_quantity,
        line.confirmed_quantity,
        line.batch_number || null,
        now,
        now,
      ],
    })
  }

  // 3. Tự động ghi sổ phiếu đảo
  const postResult = await postTransactionToLedger(reversalId, actor, {
    allowNegativeStock: true,
    negativeStockReason: `Phiếu đảo tự động cho ${origTx.transaction_code}`,
  })

  return {
    success: true,
    reversalTransactionId: reversalId,
    reversalCode,
    postResult,
  }
}

/**
 * Lấy danh sách sổ giao dịch tồn kho (Inventory Ledger)
 */
export async function getLedgerEntries(filters: LedgerFilter = {}) {
  const client = getRawClient()
  let sql = `
    SELECT l.*,
           t.transaction_code, t.transaction_type, t.document_number,
           w.name as workshop_name, w.code as workshop_code,
           wh.name as warehouse_name, wh.code as warehouse_code,
           i.name as item_name, i.code as item_code, i.base_unit
    FROM inventory_ledger l
    JOIN transactions t ON l.transaction_id = t.id
    JOIN workshops w ON l.workshop_id = w.id
    JOIN warehouses wh ON l.warehouse_id = wh.id
    JOIN items i ON l.item_id = i.id
    WHERE 1=1
  `
  const args: any[] = []

  if (filters.workshopId) {
    sql += ` AND l.workshop_id = ?`
    args.push(filters.workshopId)
  }

  if (filters.warehouseId) {
    sql += ` AND l.warehouse_id = ?`
    args.push(filters.warehouseId)
  }

  if (filters.itemId) {
    sql += ` AND l.item_id = ?`
    args.push(filters.itemId)
  }

  if (filters.transactionType) {
    sql += ` AND t.transaction_type = ?`
    args.push(filters.transactionType)
  }

  if (filters.startDate) {
    sql += ` AND l.transaction_date >= ?`
    args.push(filters.startDate)
  }

  if (filters.endDate) {
    sql += ` AND l.transaction_date <= ?`
    args.push(filters.endDate)
  }

  if (filters.search) {
    sql += ` AND (t.transaction_code LIKE ? OR i.name LIKE ? OR i.code LIKE ? OR wh.name LIKE ?)`
    const term = `%${filters.search.trim()}%`
    args.push(term, term, term, term)
  }

  sql += ` ORDER BY l.created_at DESC`

  if (filters.limit) {
    sql += ` LIMIT ?`
    args.push(filters.limit)
    if (filters.offset) {
      sql += ` OFFSET ?`
      args.push(filters.offset)
    }
  }

  const result = await client.execute({ sql, args })

  return result.rows.map((r: any) => ({
    id: r.id as string,
    transactionId: r.transaction_id as string,
    transactionCode: r.transaction_code as string,
    transactionType: r.transaction_type as string,
    documentNumber: r.document_number || null,
    workshopId: r.workshop_id as string,
    workshopName: r.workshop_name as string,
    warehouseId: r.warehouse_id as string,
    warehouseName: r.warehouse_name as string,
    itemId: r.item_id as string,
    itemCode: r.item_code as string,
    itemName: r.item_name as string,
    baseUnit: r.base_unit as string,
    transactionDate: r.transaction_date as string,
    quantityIn: Number(r.quantity_in || 0),
    quantityOut: Number(r.quantity_out || 0),
    runningBalance: Number(r.running_balance || 0),
    createdAt: r.created_at as string,
  }))
}

/**
 * Lấy bảng tổng hợp số dư tồn kho hiện tại (Stock Balances)
 */
export async function getStockBalances(filters: StockBalanceFilter = {}) {
  const client = getRawClient()
  let sql = `
    SELECT l.warehouse_id, l.item_id,
           COALESCE(SUM(l.quantity_in - l.quantity_out), 0) as current_balance,
           MAX(l.created_at) as last_updated,
           wh.name as warehouse_name, wh.code as warehouse_code, wh.workshop_id,
           w.name as workshop_name,
           i.name as item_name, i.code as item_code, i.item_group, i.base_unit,
           i.minimum_stock, i.maximum_stock
    FROM inventory_ledger l
    JOIN warehouses wh ON l.warehouse_id = wh.id
    JOIN workshops w ON wh.workshop_id = w.id
    JOIN items i ON l.item_id = i.id
    WHERE 1=1
  `
  const args: any[] = []

  if (filters.workshopId) {
    sql += ` AND wh.workshop_id = ?`
    args.push(filters.workshopId)
  }

  if (filters.warehouseId) {
    sql += ` AND l.warehouse_id = ?`
    args.push(filters.warehouseId)
  }

  if (filters.itemGroup) {
    sql += ` AND i.item_group = ?`
    args.push(filters.itemGroup)
  }

  if (filters.search) {
    sql += ` AND (i.code LIKE ? OR i.name LIKE ? OR wh.name LIKE ?)`
    const term = `%${filters.search.trim()}%`
    args.push(term, term, term)
  }

  sql += ` GROUP BY l.warehouse_id, l.item_id ORDER BY w.name, wh.name, i.name`

  const result = await client.execute({ sql, args })

  return result.rows.map((r: any) => {
    const currentBalance = Number(r.current_balance || 0)
    const minStock = Number(r.minimum_stock || 0)
    const maxStock = r.maximum_stock ? Number(r.maximum_stock) : null

    let status: 'NORMAL' | 'LOW_STOCK' | 'OVER_STOCK' | 'NEGATIVE' = 'NORMAL'
    if (currentBalance < 0) {
      status = 'NEGATIVE'
    } else if (currentBalance <= minStock && minStock > 0) {
      status = 'LOW_STOCK'
    } else if (maxStock !== null && currentBalance > maxStock) {
      status = 'OVER_STOCK'
    }

    return {
      warehouseId: r.warehouse_id as string,
      warehouseName: r.warehouse_name as string,
      workshopId: r.workshop_id as string,
      workshopName: r.workshop_name as string,
      itemId: r.item_id as string,
      itemCode: r.item_code as string,
      itemName: r.item_name as string,
      itemGroup: r.item_group as string,
      baseUnit: r.base_unit as string,
      currentBalance,
      minimumStock: minStock,
      maximumStock: maxStock,
      status,
      lastUpdated: r.last_updated as string,
    }
  })
}

/**
 * Quản lý Kỳ Kế Toán (Inventory Periods)
 */
export async function getInventoryPeriods(workshopId?: string) {
  const client = getRawClient()
  let sql = `
    SELECT p.*, w.name as workshop_name, u.full_name as closed_by_name
    FROM inventory_periods p
    LEFT JOIN workshops w ON p.workshop_id = w.id
    LEFT JOIN users u ON p.closed_by = u.id
    WHERE 1=1
  `
  const args: any[] = []

  if (workshopId) {
    sql += ` AND (p.workshop_id IS NULL OR p.workshop_id = ?)`
    args.push(workshopId)
  }

  sql += ` ORDER BY p.start_date DESC`

  const result = await client.execute({ sql, args })

  return result.rows.map((r: any) => ({
    id: r.id as string,
    workshopId: r.workshop_id || null,
    workshopName: r.workshop_name || 'Toàn bộ xưởng',
    periodName: r.period_name as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    isClosed: Boolean(r.is_closed),
    closedBy: r.closed_by || null,
    closedByName: r.closed_by_name || null,
    closedAt: r.closed_at || null,
    createdAt: r.created_at as string,
  }))
}

export async function createInventoryPeriod(input: PeriodInput, actor: SessionUser) {
  if (!['ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role)) {
    throw new Error('Chỉ ACCOUNTING_MANAGER hoặc ADMIN mới có quyền tạo kỳ kế toán')
  }

  const client = getRawClient()
  const periodId = `prd-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  await client.execute({
    sql: `
      INSERT INTO inventory_periods (
        id, workshop_id, period_name, start_date, end_date, is_closed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `,
    args: [
      periodId,
      input.workshopId || null,
      input.periodName,
      input.startDate,
      input.endDate,
    ],
  })

  return { id: periodId, ...input, isClosed: false }
}

export async function togglePeriodLock(
  periodId: string,
  isClosed: boolean,
  actor: SessionUser
) {
  if (!['ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role)) {
    throw new Error('Chỉ ACCOUNTING_MANAGER hoặc ADMIN mới có quyền khóa/mở kỳ kế toán')
  }

  const client = getRawClient()
  const now = isClosed ? new Date().toISOString() : null
  const closedBy = isClosed ? actor.id : null

  await client.execute({
    sql: `
      UPDATE inventory_periods
      SET is_closed = ?,
          closed_by = ?,
          closed_at = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [isClosed ? 1 : 0, closedBy, now, periodId],
  })

  return { success: true, periodId, isClosed }
}
