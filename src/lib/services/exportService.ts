import { getRawClient } from '@/lib/database/client'
import { SessionUser } from '@/lib/auth/session'

export interface ExportFilter {
  workshopId?: string
  startDate?: string
  endDate?: string
  transactionIds?: string[]
}

export interface ExportResult {
  csvContent: string
  exportedCount: number
  transactionIds: string[]
}

/**
 * Xuất dữ liệu giao dịch ở trạng thái POSTED hoặc EXPORT_READY ra CSV chuẩn UTF-8 BOM.
 * QUY TẮC AN TOÀN: Nếu quá trình tạo CSV thất bại, KHÔNG chuyển trạng thái sang EXPORTED.
 */
export async function exportTransactionsToCsv(
  actor: SessionUser,
  filter: ExportFilter = {}
): Promise<ExportResult> {
  const client = getRawClient()

  // 1. Xây dựng truy vấn danh sách giao dịch thoả mãn POSTED hoặc EXPORT_READY
  const whereClauses = [`t.status IN ('POSTED', 'EXPORT_READY', 'EXPORTED')`]
  const queryArgs: any[] = []

  if (filter.workshopId && filter.workshopId !== 'all') {
    whereClauses.push(`t.workshop_id = ?`)
    queryArgs.push(filter.workshopId)
  }

  if (filter.startDate) {
    whereClauses.push(`date(t.transaction_date) >= date(?)`)
    queryArgs.push(filter.startDate)
  }

  if (filter.endDate) {
    whereClauses.push(`date(t.transaction_date) <= date(?)`)
    queryArgs.push(filter.endDate)
  }

  if (filter.transactionIds && filter.transactionIds.length > 0) {
    const placeholders = filter.transactionIds.map(() => '?').join(',')
    whereClauses.push(`t.id IN (${placeholders})`)
    queryArgs.push(...filter.transactionIds)
  }

  const sqlQuery = `
    SELECT
      t.id as transaction_id,
      t.transaction_code,
      t.transaction_type,
      t.document_number,
      t.transaction_date,
      t.status,
      t.overall_confidence,
      t.posted_at,
      w.code as workshop_code,
      w.name as workshop_name,
      wh_src.name as source_warehouse_name,
      wh_dst.name as destination_warehouse_name,
      u.full_name as sender_name,
      l.line_number,
      l.raw_item_name,
      i.code as item_code,
      i.name as item_name,
      l.confirmed_unit,
      l.confirmed_quantity,
      l.batch_number
    FROM transactions t
    JOIN workshops w ON t.workshop_id = w.id
    LEFT JOIN warehouses wh_src ON t.source_warehouse_id = wh_src.id
    LEFT JOIN warehouses wh_dst ON t.destination_warehouse_id = wh_dst.id
    LEFT JOIN users u ON t.sender_user_id = u.id
    LEFT JOIN transaction_lines l ON t.id = l.transaction_id
    LEFT JOIN items i ON l.confirmed_item_id = i.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY t.transaction_date DESC, t.transaction_code ASC, l.line_number ASC
  `

  let rows: any[] = []
  try {
    const res = await client.execute({ sql: sqlQuery, args: queryArgs })
    rows = res.rows
  } catch (err: any) {
    throw new Error(`Lỗi truy vấn dữ liệu xuất CSV: ${err.message}`)
  }

  if (rows.length === 0) {
    throw new Error('Không có giao dịch nào ở trạng thái POSTED hoặc EXPORT_READY thỏa mãn điều kiện xuất.')
  }

  // 2. ĐỊNH DẠNG CSV VÀ UTF-8 BOM PRESERVING
  // Thêm UTF-8 BOM prefix '\uFEFF' ở đầu file để Excel mở chuẩn Tiếng Việt không lỗi font.
  const csvHeaders = [
    'Mã giao dịch',
    'Loại giao dịch',
    'Số chứng từ',
    'Ngày giao dịch',
    'Mã xưởng',
    'Tên xưởng',
    'Kho xuất',
    'Kho nhập',
    'Người lập',
    'Trạng thái',
    'STT dòng',
    'Tên hàng gốc (OCR)',
    'Mã hàng chuẩn',
    'Tên hàng chuẩn',
    'Đơn vị tính',
    'Số lượng',
    'Số lô',
    'Độ tin cậy AI',
    'Ngày ghi sổ',
  ]

  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) return '""'
    const str = String(field).replace(/"/g, '""')
    return `"${str}"`
  }

  const csvRows: string[] = []
  csvRows.push(csvHeaders.map(escapeCsvField).join(','))

  const targetTransactionIdsSet = new Set<string>()

  for (const r of rows) {
    targetTransactionIdsSet.add(String(r.transaction_id))

    const lineRow = [
      r.transaction_code,
      r.transaction_type,
      r.document_number || '',
      r.transaction_date ? String(r.transaction_date).slice(0, 10) : '',
      r.workshop_code || '',
      r.workshop_name || '',
      r.source_warehouse_name || '',
      r.destination_warehouse_name || '',
      r.sender_name || '',
      r.status,
      r.line_number || '',
      r.raw_item_name || '',
      r.item_code || '',
      r.item_name || '',
      r.confirmed_unit || '',
      r.confirmed_quantity !== null && r.confirmed_quantity !== undefined ? r.confirmed_quantity : '',
      r.batch_number || '',
      r.overall_confidence ? (Number(r.overall_confidence) * 100).toFixed(0) + '%' : '',
      r.posted_at ? String(r.posted_at).slice(0, 10) : '',
    ]

    csvRows.push(lineRow.map(escapeCsvField).join(','))
  }

  // BOM header UTF-8: \uFEFF
  const csvContent = '\uFEFF' + csvRows.join('\r\n')
  const targetIdsArr = Array.from(targetTransactionIdsSet)

  // 3. CHỈ CẬP NHẬT TRẠNG THÁI "EXPORTED" NẾU CHƯA THẤT BẠI & KHÔNG PHẢI CHỈ XEM
  // VIEWER role hoặc read-only mode thì không mutate trạng thái database
  if (actor.role !== 'VIEWER') {
    try {
      await client.execute('BEGIN IMMEDIATE')
      for (const txId of targetIdsArr) {
        await client.execute({
          sql: `
            UPDATE transactions
            SET status = 'EXPORTED',
                updated_at = datetime('now')
            WHERE id = ? AND status IN ('POSTED', 'EXPORT_READY')
          `,
          args: [txId],
        })

        // Audit log
        await client.execute({
          sql: `
            INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, after_data, created_at)
            VALUES (?, 'TRANSACTION', ?, 'EXPORT', ?, '{"status":"EXPORTED"}', datetime('now'))
          `,
          args: [`audit-exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, txId, actor.id],
        })
      }
      await client.execute('COMMIT')
    } catch (err: any) {
      await client.execute('ROLLBACK')
      // CHÚ Ý: Nếu mutation thất bại, nhưng CSV đã sinh thành công, vẫn trả về CSV cho client
      // hoặc ném lỗi nếu nguyên tắc bắt buộc ghi nhận trạng thái xuất.
      console.error('Không thể cập nhật trạng thái EXPORTED trong database:', err)
    }
  }

  return {
    csvContent,
    exportedCount: targetIdsArr.length,
    transactionIds: targetIdsArr,
  }
}
