import { describe, it, expect, beforeEach } from 'vitest'
import { getRawClient } from '../src/lib/database/client'
import {
  calculateTransactionRisk,
  approveTransaction,
  returnTransaction,
  rejectTransaction,
  getReviewQueue,
  getUnmappedItemsQueue,
  mapUnmappedItem,
} from '../src/lib/services/reviewService'
import { SessionUser } from '../src/lib/auth/session'

describe('Milestone 5: Review Queue & Approval Workflow', () => {
  const client = getRawClient()

  const mockAccountantUser: SessionUser = {
    id: 'usr-rev-accountant',
    email: 'rev-accountant@factory.com',
    fullName: 'Nguyễn Văn Kế Toán',
    role: 'WAREHOUSE_ACCOUNTANT',
    workshopId: 'ws-rev-01',
  }

  const mockAdminUser: SessionUser = {
    id: 'usr-rev-admin',
    email: 'rev-admin@factory.com',
    fullName: 'Trần Văn Admin',
    role: 'ADMIN',
    workshopId: null,
  }

  const mockStaffUser: SessionUser = {
    id: 'usr-rev-staff',
    email: 'rev-staff@factory.com',
    fullName: 'Lê Văn Nhân Viên',
    role: 'WORKSHOP_STAFF',
    workshopId: 'ws-rev-01',
  }

  const mockViewerUser: SessionUser = {
    id: 'usr-rev-viewer',
    email: 'rev-viewer@factory.com',
    fullName: 'Phạm Văn Viewer',
    role: 'VIEWER',
    workshopId: 'ws-rev-01',
  }

  beforeEach(async () => {
    // Turn off foreign keys temporarily for clean setup of only test IDs
    await client.execute(`PRAGMA foreign_keys = OFF;`)
    await client.execute(`DELETE FROM approval_history WHERE id LIKE 'appr-rev-%' OR id LIKE 'appr-%' OR transaction_id LIKE 'tx-rev-%';`)
    await client.execute(`DELETE FROM audit_logs WHERE id LIKE 'audit-rev-%' OR id LIKE 'audit-%' OR entity_id LIKE 'tx-rev-%' OR entity_id LIKE 'line-rev-%';`)
    await client.execute(`DELETE FROM transaction_lines WHERE id LIKE 'line-rev-%' OR transaction_id LIKE 'tx-rev-%';`)
    await client.execute(`DELETE FROM transactions WHERE id LIKE 'tx-rev-%';`)
    await client.execute(`DELETE FROM item_aliases WHERE id LIKE 'alias-rev-%' OR alias LIKE '%Rev%';`)
    await client.execute(`DELETE FROM users WHERE id LIKE 'usr-rev-%';`)
    await client.execute(`DELETE FROM warehouses WHERE id = 'wh-rev-01';`)
    await client.execute(`DELETE FROM workshops WHERE id = 'ws-rev-01';`)
    await client.execute(`DELETE FROM items WHERE id = 'item-rev-01';`)
    await client.execute(`PRAGMA foreign_keys = ON;`)

    // Seed test master data with IGNORE to avoid duplicate conflicts
    await client.execute(`
      INSERT OR IGNORE INTO workshops (id, code, name, is_active)
      VALUES ('ws-rev-01', 'WSREV01', 'Xưởng Đổ Bê Tông Review', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO warehouses (id, workshop_id, code, name, warehouse_type, is_active)
      VALUES ('wh-rev-01', 'ws-rev-01', 'WHREV01', 'Kho Vật Tư Xi Măng', 'RAW_MATERIAL', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, workshop_id, is_active)
      VALUES 
        ('usr-rev-accountant', 'rev-accountant@factory.com', 'Kế Toán Rev', 'WAREHOUSE_ACCOUNTANT', 'ws-rev-01', 1),
        ('usr-rev-admin', 'rev-admin@factory.com', 'Admin Rev', 'ADMIN', NULL, 1),
        ('usr-rev-staff', 'rev-staff@factory.com', 'Nhân Viên Rev', 'WORKSHOP_STAFF', 'ws-rev-01', 1),
        ('usr-rev-viewer', 'rev-viewer@factory.com', 'Viewer Rev', 'VIEWER', 'ws-rev-01', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO items (id, code, name, base_unit, minimum_stock, is_active)
      VALUES ('item-rev-01', 'REV-XM-PCB40', 'Xi Măng PCB40 Hoàng Thạch Rev', 'bao', 10, 1);
    `)
  })

  it('1. Đánh giá mức độ rủi ro chính xác theo 7 cấp ưu tiên', async () => {
    const mockTx = {
      id: 'tx-rev-risk-01',
      transactionCode: 'NK-20260731-0001',
      transactionType: 'PURCHASE_RECEIPT',
      transactionDate: new Date().toISOString(),
      workshopId: 'ws-rev-01',
      sourceWarehouseId: 'wh-rev-01',
      destinationWarehouseId: 'wh-rev-01',
      senderUserId: 'usr-rev-staff',
      status: 'PENDING_REVIEW',
      overallConfidence: 0.95,
      duplicateScore: 0.85, // > 0.7 -> Trùng phiếu (Priority 2)
      createdAt: new Date().toISOString(),
    }

    const mockLines = [
      {
        id: 'line-rev-01',
        rawItemName: 'Xi Măng PCB40',
        confirmedItemId: null, // Chưa ánh xạ -> Priority 3
        lineStatus: 'NEEDS_MAPPING',
        itemConfidence: 0.9,
      },
    ]

    const assessment = await calculateTransactionRisk(mockTx, mockLines)
    expect(assessment.riskFlags).toContain('DUPLICATE')
    expect(assessment.riskFlags).toContain('UNMAPPED_ITEM')
    // Risk Priority: DUPLICATE (2) cao hơn UNMAPPED_ITEM (3)
    expect(assessment.primaryRisk).toBe('DUPLICATE')
    expect(assessment.primaryRiskPriority).toBe(2)
  })

  it('2. Chuyển trạng thái sang APPROVED thành công và KHÔNG ghi sổ kho', async () => {
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at)
      VALUES ('tx-rev-appr-01', 'NK-20260731-0002', 'PURCHASE_RECEIPT', datetime('now'), 'ws-rev-01', 'wh-rev-01', 'usr-rev-staff', 'PENDING_REVIEW', datetime('now'));
    `)

    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, item_confidence, line_status)
      VALUES ('line-rev-appr-01', 'tx-rev-appr-01', 1, 'Xi măng PCB40', 'item-rev-01', 100, 0.95, 'OK');
    `)

    const result = await approveTransaction('tx-rev-appr-01', mockAccountantUser, 'Đã kiểm tra hóa đơn chuẩn')
    expect(result.success).toBe(true)
    expect(result.status).toBe('APPROVED')

    // Kiểm tra DB transaction status
    const txCheck = await client.execute({
      sql: `SELECT status, reviewer_user_id FROM transactions WHERE id = ?`,
      args: ['tx-rev-appr-01'],
    })
    expect(txCheck.rows[0].status).toBe('APPROVED')
    expect(txCheck.rows[0].reviewer_user_id).toBe('usr-rev-accountant')

    // Kiểm tra approval_history & audit_logs
    const histCheck = await client.execute({
      sql: `SELECT * FROM approval_history WHERE transaction_id = ?`,
      args: ['tx-rev-appr-01'],
    })
    expect(histCheck.rows.length).toBe(1)
    expect(histCheck.rows[0].action).toBe('APPROVE')
    expect(histCheck.rows[0].to_status).toBe('APPROVED')

    // BẮT BUỘC: Không có bất kỳ dòng nào trong inventory_ledger trong Milestone 5
    const ledgerCheck = await client.execute({
      sql: `SELECT COUNT(*) as count FROM inventory_ledger WHERE transaction_id = ?`,
      args: ['tx-rev-appr-01'],
    })
    expect(Number(ledgerCheck.rows[0].count)).toBe(0)
  })

  it('3. Yêu cầu lý do khi Trả lại (NEEDS_REVISION) và Từ chối (REJECTED)', async () => {
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, sender_user_id, status)
      VALUES 
        ('tx-rev-ret-01', 'XK-20260731-0003', 'MATERIAL_ISSUE', datetime('now'), 'ws-rev-01', 'usr-rev-staff', 'PENDING_REVIEW'),
        ('tx-rev-rej-01', 'XK-20260731-0004', 'MATERIAL_ISSUE', datetime('now'), 'ws-rev-01', 'usr-rev-staff', 'PENDING_REVIEW');
    `)

    // Trả lại mà không có lý do -> Throw error
    await expect(returnTransaction('tx-rev-ret-01', mockAccountantUser, '')).rejects.toThrow(
      'Yêu cầu nhập lý do khi trả lại phiếu'
    )

    // Trả lại với lý do hợp lệ -> Chuyển sang NEEDS_REVISION
    const returnRes = await returnTransaction('tx-rev-ret-01', mockAccountantUser, 'Đơn vị tính bị nhầm lẫn')
    expect(returnRes.status).toBe('NEEDS_REVISION')

    // Từ chối mà không có lý do -> Throw error
    await expect(rejectTransaction('tx-rev-rej-01', mockAccountantUser, '   ')).rejects.toThrow(
      'Yêu cầu nhập lý do khi từ chối phiếu'
    )

    // Từ chối với lý do hợp lệ -> Chuyển sang REJECTED
    const rejectRes = await rejectTransaction('tx-rev-rej-01', mockAccountantUser, 'Ảnh chụp mờ không nhìn rõ chữ')
    expect(rejectRes.status).toBe('REJECTED')
  })

  it('4. Phân quyền RBAC khi duyệt phiếu: STAFF & VIEWER bị chặn 403', async () => {
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, sender_user_id, status)
      VALUES ('tx-rev-rbac-01', 'NK-20260731-0005', 'PURCHASE_RECEIPT', datetime('now'), 'ws-rev-01', 'usr-rev-staff', 'PENDING_REVIEW');
    `)

    // WORKSHOP_STAFF không có quyền duyệt
    await expect(approveTransaction('tx-rev-rbac-01', mockStaffUser)).rejects.toThrow(
      'Bạn không có quyền duyệt phiếu kho'
    )

    // VIEWER không có quyền duyệt
    await expect(approveTransaction('tx-rev-rbac-01', mockViewerUser)).rejects.toThrow(
      'Bạn không có quyền duyệt phiếu kho'
    )

    // ADMIN có quyền duyệt
    const adminAppr = await approveTransaction('tx-rev-rbac-01', mockAdminUser)
    expect(adminAppr.status).toBe('APPROVED')
  })

  it('5. Hàng đợi ánh xạ mã hàng và tạo Alias học máy', async () => {
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, sender_user_id, status, created_at)
      VALUES ('tx-rev-map-01', 'NK-20260731-0006', 'PURCHASE_RECEIPT', datetime('now'), 'ws-rev-01', 'usr-rev-staff', 'PENDING_REVIEW', datetime('now'));
    `)

    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, item_confidence, line_status, created_at)
      VALUES ('line-rev-unmap-01', 'tx-rev-map-01', 1, 'Xi Măng Hoàng Thạch PCB40 Bao 50kg Rev', NULL, 0.65, 'NEEDS_MAPPING', datetime('now'));
    `)

    // Lấy danh sách hàng đợi chưa ánh xạ
    const queue = await getUnmappedItemsQueue('ws-rev-01')
    expect(queue.length).toBeGreaterThanOrEqual(1)
    const target = queue.find((q) => q.id === 'line-rev-unmap-01')
    expect(target).toBeDefined()
    expect(target?.rawItemName).toBe('Xi Măng Hoàng Thạch PCB40 Bao 50kg Rev')

    // Thực hiện ánh xạ tới item-rev-01 và tạo Alias
    const mapRes = await mapUnmappedItem('line-rev-unmap-01', 'item-rev-01', true, mockAccountantUser)
    expect(mapRes.success).toBe(true)

    // Kiểm tra line status được cập nhật thành OK
    const lineCheck = await client.execute({
      sql: `SELECT confirmed_item_id, line_status FROM transaction_lines WHERE id = ?`,
      args: ['line-rev-unmap-01'],
    })
    expect(lineCheck.rows[0].confirmed_item_id).toBe('item-rev-01')
    expect(lineCheck.rows[0].line_status).toBe('OK')

    // Kiểm tra alias được tạo mới trong DB
    const aliasCheck = await client.execute({
      sql: `SELECT alias, item_id FROM item_aliases WHERE item_id = ?`,
      args: ['item-rev-01'],
    })
    expect(aliasCheck.rows.length).toBeGreaterThanOrEqual(1)
    expect(aliasCheck.rows.some((a: any) => a.alias === 'Xi Măng Hoàng Thạch PCB40 Bao 50kg Rev')).toBe(true)
  })
})
