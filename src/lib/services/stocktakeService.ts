import crypto from 'crypto'
import { getRawClient } from '@/lib/database/client'
import { SessionUser } from '@/lib/auth/session'
import { generateTransactionCode } from './transactions'

export interface CreateStocktakeInput {
  workshopId: string
  warehouseId: string
  stocktakeDate: string
  code?: string
  notes?: string
}

export interface StocktakeFilter {
  workshopId?: string
  warehouseId?: string
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface StocktakeExtractedLineInput {
  rawItemName: string
  countedQuantity: number
  itemCode?: string
  baseUnit?: string
}

/**
 * Sinh mã đợt kiểm kê dạng ST-YYYYMMDD-XXX
 */
export async function generateStocktakeCode(): Promise<string> {
  const client = getRawClient()
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `ST-${todayStr}-`

  const res = await client.execute({
    sql: `SELECT code FROM stocktakes WHERE code LIKE ? ORDER BY code DESC LIMIT 1`,
    args: [`${prefix}%`],
  })

  if (res.rows.length === 0) {
    return `${prefix}001`
  }

  const lastCode = res.rows[0].code as string
  const numPart = parseInt(lastCode.slice(-3), 10) || 0
  const nextNum = (numPart + 1).toString().padStart(3, '0')
  return `${prefix}${nextNum}`
}

/**
 * Tính số dư tồn kho sổ sách tại thời điểm quá khứ (stocktakeDate)
 */
export async function calculateHistoricalBookQuantity(
  warehouseId: string,
  itemId: string,
  stocktakeDate: string
): Promise<number> {
  const client = getRawClient()
  const res = await client.execute({
    sql: `
      SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as book_qty
      FROM inventory_ledger
      WHERE warehouse_id = ?
        AND item_id = ?
        AND (transaction_date <= ? OR date(transaction_date) <= date(?))
    `,
    args: [warehouseId, itemId, stocktakeDate, stocktakeDate],
  })

  return Number(res.rows[0]?.book_qty || 0)
}

/**
 * Tạo đợt kiểm kê mới
 */
export async function createStocktakeSession(
  input: CreateStocktakeInput,
  actor: SessionUser
) {
  if (!['WORKSHOP_STAFF', 'WORKSHOP_MANAGER', 'WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role)) {
    throw new Error('Bạn không có quyền tạo đợt kiểm kê')
  }

  const client = getRawClient()
  const stocktakeId = `stk-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const code = input.code || (await generateStocktakeCode())
  const now = new Date().toISOString()
  const stocktakeDate = new Date(input.stocktakeDate).toISOString()

  // 1. Tạo đợt kiểm kê ở trạng thái DRAFT / IN_PROGRESS
  await client.execute({
    sql: `
      INSERT INTO stocktakes (
        id, code, workshop_id, warehouse_id, stocktake_date, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
    `,
    args: [
      stocktakeId,
      code,
      input.workshopId,
      input.warehouseId,
      stocktakeDate,
      actor.id,
      now,
      now,
    ],
  })

  // 2. Tự động khởi tạo danh sách dòng kiểm kê cho tất cả các mặt hàng hiện có trong kho
  const activeItems = await client.execute({
    sql: `SELECT id, code, name FROM items WHERE is_active = 1`,
    args: [],
  })

  for (const item of activeItems.rows) {
    const itemId = item.id as string
    const bookQty = await calculateHistoricalBookQuantity(input.warehouseId, itemId, stocktakeDate)
    
    const lineId = `stkl-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const diffQty = 0 - bookQty
    const diffPct = bookQty > 0 ? (diffQty / bookQty) * 100 : 0
    const status = diffQty === 0 ? 'MATCH' : diffQty > 0 ? 'SURPLUS' : 'SHORTAGE'

    await client.execute({
      sql: `
        INSERT INTO stocktake_lines (
          id, stocktake_id, item_id, raw_item_name, book_quantity, counted_quantity,
          difference_quantity, difference_percentage, status, explanation, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?)
      `,
      args: [
        lineId,
        stocktakeId,
        itemId,
        item.name as string,
        bookQty,
        diffQty,
        diffPct,
        status,
        now,
        now,
      ],
    })
  }

  // Audit log
  await client.execute({
    sql: `
      INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, after_data, created_at)
      VALUES (?, 'STOCKTAKE', ?, 'CREATE', ?, ?, ?)
    `,
    args: [
      `audit-${Date.now()}`,
      stocktakeId,
      actor.id,
      JSON.stringify({ code, workshopId: input.workshopId, warehouseId: input.warehouseId, stocktakeDate }),
      now,
    ],
  })

  return getStocktakeById(stocktakeId)
}

/**
 * Lấy chi tiết đợt kiểm kê theo ID
 */
export async function getStocktakeById(stocktakeId: string) {
  const client = getRawClient()
  const res = await client.execute({
    sql: `
      SELECT s.*,
             w.name as workshop_name, w.code as workshop_code,
             wh.name as warehouse_name, wh.code as warehouse_code,
             u1.full_name as created_by_name,
             u2.full_name as confirmed_by_name
      FROM stocktakes s
      JOIN workshops w ON s.workshop_id = w.id
      JOIN warehouses wh ON s.warehouse_id = wh.id
      JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.confirmed_by = u2.id
      WHERE s.id = ?
    `,
    args: [stocktakeId],
  })

  if (res.rows.length === 0) {
    throw new Error('Không tìm thấy đợt kiểm kê')
  }

  const stocktake = res.rows[0] as any

  // Fetch lines
  const linesRes = await client.execute({
    sql: `
      SELECT l.*, i.code as item_code, i.name as item_name, i.base_unit
      FROM stocktake_lines l
      LEFT JOIN items i ON l.item_id = i.id
      WHERE l.stocktake_id = ?
      ORDER BY l.created_at ASC
    `,
    args: [stocktakeId],
  })

  const lines = linesRes.rows.map((r: any) => ({
    id: r.id as string,
    stocktakeId: r.stocktake_id as string,
    itemId: r.item_id || null,
    itemCode: r.item_code || null,
    itemName: r.item_name || null,
    rawItemName: r.raw_item_name as string,
    baseUnit: r.base_unit || null,
    bookQuantity: Number(r.book_quantity || 0),
    countedQuantity: Number(r.counted_quantity || 0),
    differenceQuantity: Number(r.difference_quantity || 0),
    differencePercentage: Number(r.difference_percentage || 0),
    status: r.status as string,
    explanation: r.explanation || null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))

  return {
    id: stocktake.id as string,
    code: stocktake.code as string,
    workshopId: stocktake.workshop_id as string,
    workshopName: stocktake.workshop_name as string,
    workshopCode: stocktake.workshop_code as string,
    warehouseId: stocktake.warehouse_id as string,
    warehouseName: stocktake.warehouse_name as string,
    warehouseCode: stocktake.warehouse_code as string,
    stocktakeDate: stocktake.stocktake_date as string,
    status: stocktake.status as string,
    createdBy: stocktake.created_by as string,
    createdByName: stocktake.created_by_name as string,
    confirmedBy: stocktake.confirmed_by || null,
    confirmedByName: stocktake.confirmed_by_name || null,
    createdAt: stocktake.created_at as string,
    updatedAt: stocktake.updated_at as string,
    lines,
  }
}

/**
 * Danh sách các đợt kiểm kê
 */
export async function listStocktakes(filters: StocktakeFilter = {}) {
  const client = getRawClient()
  let sql = `
    SELECT s.*,
           w.name as workshop_name,
           wh.name as warehouse_name,
           u.full_name as created_by_name,
           (SELECT COUNT(*) FROM stocktake_lines WHERE stocktake_id = s.id) as total_items,
           (SELECT COUNT(*) FROM stocktake_lines WHERE stocktake_id = s.id AND status = 'MATCH') as matched_items,
           (SELECT COUNT(*) FROM stocktake_lines WHERE stocktake_id = s.id AND status = 'SURPLUS') as surplus_items,
           (SELECT COUNT(*) FROM stocktake_lines WHERE stocktake_id = s.id AND status = 'SHORTAGE') as shortage_items,
           (SELECT COUNT(*) FROM stocktake_lines WHERE stocktake_id = s.id AND status = 'UNIDENTIFIED') as unmapped_items
    FROM stocktakes s
    JOIN workshops w ON s.workshop_id = w.id
    JOIN warehouses wh ON s.warehouse_id = wh.id
    JOIN users u ON s.created_by = u.id
    WHERE 1=1
  `
  const args: any[] = []

  if (filters.workshopId) {
    sql += ` AND s.workshop_id = ?`
    args.push(filters.workshopId)
  }

  if (filters.warehouseId) {
    sql += ` AND s.warehouse_id = ?`
    args.push(filters.warehouseId)
  }

  if (filters.status) {
    sql += ` AND s.status = ?`
    args.push(filters.status)
  }

  if (filters.startDate) {
    sql += ` AND s.stocktake_date >= ?`
    args.push(filters.startDate)
  }

  if (filters.endDate) {
    sql += ` AND s.stocktake_date <= ?`
    args.push(filters.endDate)
  }

  if (filters.search) {
    sql += ` AND (s.code LIKE ? OR w.name LIKE ? OR wh.name LIKE ?)`
    const term = `%${filters.search.trim()}%`
    args.push(term, term, term)
  }

  sql += ` ORDER BY s.stocktake_date DESC`

  const res = await client.execute({ sql, args })

  return res.rows.map((r: any) => ({
    id: r.id as string,
    code: r.code as string,
    workshopId: r.workshop_id as string,
    workshopName: r.workshop_name as string,
    warehouseId: r.warehouse_id as string,
    warehouseName: r.warehouse_name as string,
    stocktakeDate: r.stocktake_date as string,
    status: r.status as string,
    createdBy: r.created_by as string,
    createdByName: r.created_by_name as string,
    totalItems: Number(r.total_items || 0),
    matchedItems: Number(r.matched_items || 0),
    surplusItems: Number(r.surplus_items || 0),
    shortageItems: Number(r.shortage_items || 0),
    unmappedItems: Number(r.unmapped_items || 0),
    createdAt: r.created_at as string,
  }))
}

/**
 * Trích xuất dữ liệu từ bảng kiểm kê (AI / Mock AI) & Cập nhật danh mục đối chiếu
 */
export async function processStocktakeExtraction(
  stocktakeId: string,
  extractedLines: StocktakeExtractedLineInput[],
  actor: SessionUser
) {
  const stocktake = await getStocktakeById(stocktakeId)
  if (stocktake.status === 'CONFIRMED' || stocktake.status === 'ADJUSTED') {
    throw new Error('Đợt kiểm kê đã được xác nhận hoặc điều chỉnh. Không thể tải lại bảng kiểm kê.')
  }

  const client = getRawClient()
  const now = new Date().toISOString()

  for (const line of extractedLines) {
    // 1. Ánh xạ tự động mã hàng dựa vào itemCode hoặc rawItemName hoặc aliases
    let itemId: string | null = null

    if (line.itemCode) {
      const matchByCode = await client.execute({
        sql: `SELECT id FROM items WHERE code = ? AND is_active = 1`,
        args: [line.itemCode],
      })
      if (matchByCode.rows.length > 0) {
        itemId = matchByCode.rows[0].id as string
      }
    }

    if (!itemId) {
      const matchByName = await client.execute({
        sql: `SELECT id FROM items WHERE (name = ? OR code = ?) AND is_active = 1`,
        args: [line.rawItemName, line.rawItemName],
      })
      if (matchByName.rows.length > 0) {
        itemId = matchByName.rows[0].id as string
      }
    }

    if (!itemId) {
      const matchAlias = await client.execute({
        sql: `SELECT item_id FROM item_aliases WHERE normalized_alias = ? LIMIT 1`,
        args: [line.rawItemName.trim().toLowerCase()],
      })
      if (matchAlias.rows.length > 0) {
        itemId = matchAlias.rows[0].item_id as string
      }
    }

    // 2. Tính bookQuantity tại mốc stocktakeDate
    let bookQty = 0
    if (itemId) {
      bookQty = await calculateHistoricalBookQuantity(stocktake.warehouseId, itemId, stocktake.stocktakeDate)
    }

    // 3. Tính chênh lệch & %
    const countedQty = Number(line.countedQuantity || 0)
    const diffQty = countedQty - bookQty
    let diffPct = 0
    if (bookQty > 0) {
      diffPct = (diffQty / bookQty) * 100
    } else if (bookQty === 0 && countedQty > 0) {
      diffPct = 100
    }

    // 4. Phân loại trạng thái dòng
    let status = 'UNIDENTIFIED'
    if (!itemId) {
      status = 'UNIDENTIFIED'
    } else if (diffQty === 0) {
      status = 'MATCH'
    } else if (diffQty > 0) {
      status = 'SURPLUS'
    } else {
      status = 'SHORTAGE'
    }

    // 5. Thêm hoặc cập nhật dòng kiểm kê
    if (itemId) {
      const existingLine = await client.execute({
        sql: `SELECT id FROM stocktake_lines WHERE stocktake_id = ? AND item_id = ?`,
        args: [stocktakeId, itemId],
      })

      if (existingLine.rows.length > 0) {
        await client.execute({
          sql: `
            UPDATE stocktake_lines
            SET counted_quantity = ?,
                book_quantity = ?,
                difference_quantity = ?,
                difference_percentage = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
          `,
          args: [countedQty, bookQty, diffQty, diffPct, status, now, existingLine.rows[0].id],
        })
        continue
      }
    }

    // Nếu chưa có thì insert dòng mới
    const lineId = `stkl-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    await client.execute({
      sql: `
        INSERT INTO stocktake_lines (
          id, stocktake_id, item_id, raw_item_name, book_quantity, counted_quantity,
          difference_quantity, difference_percentage, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        lineId,
        stocktakeId,
        itemId,
        line.rawItemName,
        bookQty,
        countedQty,
        diffQty,
        diffPct,
        status,
        now,
        now,
      ],
    })
  }

  return getStocktakeById(stocktakeId)
}

/**
 * Ánh xạ thủ công mã hàng cho dòng kiểm kê chưa rõ (UNIDENTIFIED)
 */
export async function mapStocktakeLineItem(
  stocktakeId: string,
  lineId: string,
  itemId: string,
  actor: SessionUser
) {
  const stocktake = await getStocktakeById(stocktakeId)
  if (['CONFIRMED', 'ADJUSTED'].includes(stocktake.status)) {
    throw new Error('Không thể sửa ánh xạ khi đợt kiểm kê đã xác nhận hoặc điều chỉnh.')
  }

  const client = getRawClient()
  const now = new Date().toISOString()

  // 1. Tính lại book quantity tại mốc stocktakeDate
  const bookQty = await calculateHistoricalBookQuantity(stocktake.warehouseId, itemId, stocktake.stocktakeDate)

  // 2. Lấy counted quantity hiện tại của dòng
  const lineRes = await client.execute({
    sql: `SELECT counted_quantity, explanation FROM stocktake_lines WHERE id = ? AND stocktake_id = ?`,
    args: [lineId, stocktakeId],
  })

  if (lineRes.rows.length === 0) {
    throw new Error('Không tìm thấy dòng kiểm kê')
  }

  const countedQty = Number(lineRes.rows[0].counted_quantity || 0)
  const explanation = lineRes.rows[0].explanation as string | null
  const diffQty = countedQty - bookQty
  let diffPct = 0
  if (bookQty > 0) {
    diffPct = (diffQty / bookQty) * 100
  } else if (bookQty === 0 && countedQty > 0) {
    diffPct = 100
  }

  let status = diffQty === 0 ? 'MATCH' : diffQty > 0 ? 'SURPLUS' : 'SHORTAGE'
  if (explanation && explanation.trim().length > 0 && status !== 'MATCH') {
    status = 'EXPLAINED'
  }

  await client.execute({
    sql: `
      UPDATE stocktake_lines
      SET item_id = ?,
          book_quantity = ?,
          difference_quantity = ?,
          difference_percentage = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [itemId, bookQty, diffQty, diffPct, status, now, lineId],
  })

  return getStocktakeById(stocktakeId)
}

/**
 * Nhập/Cập nhật số lượng kiểm kê thực tế
 */
export async function updateStocktakeLineCountedQty(
  stocktakeId: string,
  lineId: string,
  countedQuantity: number,
  actor: SessionUser
) {
  const stocktake = await getStocktakeById(stocktakeId)
  if (['CONFIRMED', 'ADJUSTED'].includes(stocktake.status)) {
    throw new Error('Không thể thay đổi số lượng khi đợt kiểm kê đã xác nhận hoặc điều chỉnh.')
  }

  const client = getRawClient()
  const now = new Date().toISOString()

  const lineRes = await client.execute({
    sql: `SELECT item_id, book_quantity, explanation FROM stocktake_lines WHERE id = ? AND stocktake_id = ?`,
    args: [lineId, stocktakeId],
  })

  if (lineRes.rows.length === 0) {
    throw new Error('Không tìm thấy dòng kiểm kê')
  }

  const line = lineRes.rows[0]
  const itemId = line.item_id as string | null
  const bookQty = Number(line.book_quantity || 0)
  const explanation = line.explanation as string | null

  const countedQty = Number(countedQuantity || 0)
  const diffQty = countedQty - bookQty
  let diffPct = 0
  if (bookQty > 0) {
    diffPct = (diffQty / bookQty) * 100
  } else if (bookQty === 0 && countedQty > 0) {
    diffPct = 100
  }

  let status = 'UNIDENTIFIED'
  if (!itemId) {
    status = 'UNIDENTIFIED'
  } else if (diffQty === 0) {
    status = 'MATCH'
  } else if (explanation && explanation.trim().length > 0) {
    status = 'EXPLAINED'
  } else if (diffQty > 0) {
    status = 'SURPLUS'
  } else {
    status = 'SHORTAGE'
  }

  await client.execute({
    sql: `
      UPDATE stocktake_lines
      SET counted_quantity = ?,
          difference_quantity = ?,
          difference_percentage = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [countedQty, diffQty, diffPct, status, now, lineId],
  })

  return getStocktakeById(stocktakeId)
}

/**
 * Nhập giải trình nguyên nhân chênh lệch (Dành cho Xưởng trưởng / Staff)
 */
export async function updateStocktakeLineExplanation(
  stocktakeId: string,
  lineId: string,
  explanation: string,
  actor: SessionUser
) {
  const stocktake = await getStocktakeById(stocktakeId)
  if (['CONFIRMED', 'ADJUSTED'].includes(stocktake.status)) {
    throw new Error('Không thể nhập giải trình khi đợt kiểm kê đã xác nhận hoặc điều chỉnh.')
  }

  const client = getRawClient()
  const now = new Date().toISOString()

  const lineRes = await client.execute({
    sql: `SELECT item_id, difference_quantity, status FROM stocktake_lines WHERE id = ? AND stocktake_id = ?`,
    args: [lineId, stocktakeId],
  })

  if (lineRes.rows.length === 0) {
    throw new Error('Không tìm thấy dòng kiểm kê')
  }

  const line = lineRes.rows[0]
  const diffQty = Number(line.difference_quantity || 0)
  const itemId = line.item_id as string | null

  let newStatus = line.status as string
  if (itemId && diffQty !== 0 && explanation.trim().length > 0) {
    newStatus = 'EXPLAINED'
  } else if (itemId && diffQty !== 0 && explanation.trim().length === 0) {
    newStatus = diffQty > 0 ? 'SURPLUS' : 'SHORTAGE'
  }

  await client.execute({
    sql: `
      UPDATE stocktake_lines
      SET explanation = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [explanation, newStatus, now, lineId],
  })

  return getStocktakeById(stocktakeId)
}

/**
 * Kế toán xác nhận đợt kiểm kê
 */
export async function confirmStocktakeSession(stocktakeId: string, actor: SessionUser) {
  if (!['WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role)) {
    throw new Error('Chỉ Kế toán kho hoặc Quản lý kế toán mới có quyền xác nhận đợt kiểm kê')
  }

  const stocktake = await getStocktakeById(stocktakeId)
  if (stocktake.status === 'CONFIRMED' || stocktake.status === 'ADJUSTED') {
    throw new Error('Đợt kiểm kê này đã được xác nhận trước đó.')
  }

  const unmappedLines = stocktake.lines.filter((l) => !l.itemId)
  if (unmappedLines.length > 0) {
    throw new Error(`Còn ${unmappedLines.length} dòng sản phẩm chưa được ánh xạ mã hàng. Vui lòng ánh xạ trước khi xác nhận.`)
  }

  const client = getRawClient()
  const now = new Date().toISOString()

  await client.execute('BEGIN IMMEDIATE')
  try {
    await client.execute({
      sql: `
        UPDATE stocktakes
        SET status = 'CONFIRMED',
            confirmed_by = ?,
            updated_at = ?
        WHERE id = ?
      `,
      args: [actor.id, now, stocktakeId],
    })

    // Audit log
    await client.execute({
      sql: `
        INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, after_data, created_at)
        VALUES (?, 'STOCKTAKE', ?, 'STATUS_CHANGE', ?, ?, ?)
      `,
      args: [
        `audit-${Date.now()}`,
        stocktakeId,
        actor.id,
        JSON.stringify({ status: 'CONFIRMED', confirmedBy: actor.id }),
        now,
      ],
    })

    await client.execute('COMMIT')
  } catch (err) {
    await client.execute('ROLLBACK')
    throw err
  }

  return getStocktakeById(stocktakeId)
}

/**
 * Tạo Đề Xuất Điều Chỉnh Nháp (Draft Adjustment Proposals)
 * QUY TẮC BẮT BUỘC: KHÔNG TỰ ĐỘNG GHI SỔ (NOT POSTED)!
 */
export async function createAdjustmentProposals(stocktakeId: string, actor: SessionUser) {
  if (!['WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'].includes(actor.role)) {
    throw new Error('Bạn không có quyền tạo đề xuất điều chỉnh')
  }

  const stocktake = await getStocktakeById(stocktakeId)
  const client = getRawClient()
  const now = new Date().toISOString()

  // Phân loại dòng chênh lệch
  const surplusLines = stocktake.lines.filter((l) => l.itemId && l.differenceQuantity > 0)
  const shortageLines = stocktake.lines.filter((l) => l.itemId && l.differenceQuantity < 0)

  if (surplusLines.length === 0 && shortageLines.length === 0) {
    throw new Error('Không có dòng chênh lệch nào để tạo đề xuất điều chỉnh.')
  }

  const createdTransactions: any[] = []

  await client.execute('BEGIN IMMEDIATE')
  try {
    // 1. Tạo phiếu Điều chỉnh Tăng (ADJUSTMENT_IN) ở trạng thái DRAFT
    if (surplusLines.length > 0) {
      const txId = `tx-adj-in-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const txCode = await generateTransactionCode('ADJUSTMENT_IN')

      await client.execute({
        sql: `
          INSERT INTO transactions (
            id, transaction_code, transaction_type, document_number, transaction_date,
            workshop_id, destination_warehouse_id, sender_user_id, status, notes, created_at, updated_at
          ) VALUES (?, ?, 'ADJUSTMENT_IN', ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
        `,
        args: [
          txId,
          txCode,
          `ADJ-IN-${stocktake.code}`,
          stocktake.stocktakeDate,
          stocktake.workshopId,
          stocktake.warehouseId,
          actor.id,
          `Đề xuất điều chỉnh tăng từ đợt kiểm kê ${stocktake.code}`,
          now,
          now,
        ],
      })

      let lineNo = 1
      for (const sLine of surplusLines) {
        const lineId = `line-adj-in-${Date.now()}-${lineNo}`
        await client.execute({
          sql: `
            INSERT INTO transaction_lines (
              id, transaction_id, line_number, raw_item_name, confirmed_item_id,
              confirmed_quantity, line_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'OK', ?, ?)
          `,
          args: [
            lineId,
            txId,
            lineNo++,
            sLine.itemName || sLine.rawItemName,
            sLine.itemId,
            sLine.differenceQuantity,
            now,
            now,
          ],
        })
      }

      createdTransactions.push({ id: txId, code: txCode, type: 'ADJUSTMENT_IN', itemCount: surplusLines.length, status: 'DRAFT' })
    }

    // 2. Tạo phiếu Điều chỉnh Giảm (ADJUSTMENT_OUT) ở trạng thái DRAFT
    if (shortageLines.length > 0) {
      const txId = `tx-adj-out-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const txCode = await generateTransactionCode('ADJUSTMENT_OUT')

      await client.execute({
        sql: `
          INSERT INTO transactions (
            id, transaction_code, transaction_type, document_number, transaction_date,
            workshop_id, source_warehouse_id, sender_user_id, status, notes, created_at, updated_at
          ) VALUES (?, ?, 'ADJUSTMENT_OUT', ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
        `,
        args: [
          txId,
          txCode,
          `ADJ-OUT-${stocktake.code}`,
          stocktake.stocktakeDate,
          stocktake.workshopId,
          stocktake.warehouseId,
          actor.id,
          `Đề xuất điều chỉnh giảm từ đợt kiểm kê ${stocktake.code}`,
          now,
          now,
        ],
      })

      let lineNo = 1
      for (const sLine of shortageLines) {
        const lineId = `line-adj-out-${Date.now()}-${lineNo}`
        await client.execute({
          sql: `
            INSERT INTO transaction_lines (
              id, transaction_id, line_number, raw_item_name, confirmed_item_id,
              confirmed_quantity, line_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'OK', ?, ?)
          `,
          args: [
            lineId,
            txId,
            lineNo++,
            sLine.itemName || sLine.rawItemName,
            sLine.itemId,
            Math.abs(sLine.differenceQuantity),
            now,
            now,
          ],
        })
      }

      createdTransactions.push({ id: txId, code: txCode, type: 'ADJUSTMENT_OUT', itemCount: shortageLines.length, status: 'DRAFT' })
    }

    // 3. Cập nhật trạng thái đợt kiểm kê sang ADJUSTED
    await client.execute({
      sql: `UPDATE stocktakes SET status = 'ADJUSTED', updated_at = ? WHERE id = ?`,
      args: [now, stocktakeId],
    })

    // Audit log
    await client.execute({
      sql: `
        INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, after_data, created_at)
        VALUES (?, 'STOCKTAKE', ?, 'UPDATE', ?, ?, ?)
      `,
      args: [
        `audit-${Date.now()}`,
        stocktakeId,
        actor.id,
        JSON.stringify({ action: 'CREATE_ADJUSTMENT_PROPOSAL', proposals: createdTransactions }),
        now,
      ],
    })

    await client.execute('COMMIT')
  } catch (err) {
    await client.execute('ROLLBACK')
    throw err
  }

  return {
    stocktakeId,
    status: 'ADJUSTED',
    proposals: createdTransactions,
  }
}

/**
 * Xuất biên bản đối chiếu chênh lệch ra file CSV
 */
export async function exportStocktakeCSV(stocktakeId: string): Promise<string> {
  const stocktake = await getStocktakeById(stocktakeId)

  let csvContent = '\uFEFF' // UTF-8 BOM for Excel
  csvContent += `BIÊN BẢN KIỂM KÊ VÀ ĐỐI CHIẾU TỒN KHO\n`
  csvContent += `Mã đợt kiểm kê: ${stocktake.code}\n`
  csvContent += `Xưởng: ${stocktake.workshopName} (${stocktake.workshopCode})\n`
  csvContent += `Kho kiểm kê: ${stocktake.warehouseName} (${stocktake.warehouseCode})\n`
  csvContent += `Ngày kiểm kê: ${new Date(stocktake.stocktakeDate).toLocaleString('vi-VN')}\n`
  csvContent += `Trạng thái: ${stocktake.status}\n`
  csvContent += `Người tạo: ${stocktake.createdByName}\n`
  csvContent += `Người xác nhận: ${stocktake.confirmedByName || 'Chưa xác nhận'}\n\n`

  csvContent += `STT,Mã hàng,Tên hàng hóa/Vật tư,Đơn vị,Tồn sổ sách,Số thực tế,Chênh lệch,Tỷ lệ chênh lệch (%),Trạng thái,Giải trình nguyên nhân\n`

  stocktake.lines.forEach((line, index) => {
    const itemCode = line.itemCode || 'CHƯA_MÃ'
    const itemName = line.itemName || line.rawItemName
    const unit = line.baseUnit || ''
    const book = line.bookQuantity
    const counted = line.countedQuantity
    const diff = line.differenceQuantity
    const diffPct = line.differencePercentage.toFixed(2)
    const status = line.status
    const explanation = (line.explanation || '').replace(/"/g, '""')

    csvContent += `${index + 1},"${itemCode}","${itemName}","${unit}",${book},${counted},${diff},${diffPct}%,"${status}","${explanation}"\n`
  })

  return csvContent
}
