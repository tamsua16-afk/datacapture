import { describe, it, expect, beforeEach } from 'vitest'
import { getRawClient } from '../src/lib/database/client'
import {
  postTransactionToLedger,
  createReversalTransaction,
  getLedgerEntries,
  getStockBalances,
  createInventoryPeriod,
  togglePeriodLock,
} from '../src/lib/services/ledgerService'
import { SessionUser } from '../src/lib/auth/session'

describe('Milestone 6: Inventory Ledger Integration Tests', () => {
  const client = getRawClient()

  const mockAccountantUser: SessionUser = {
    id: 'usr-ledg-accountant',
    email: 'ledg-accountant@factory.com',
    fullName: 'Lê Văn Kế Toán',
    role: 'WAREHOUSE_ACCOUNTANT',
    workshopId: 'ws-ledg-01',
  }

  const mockManagerUser: SessionUser = {
    id: 'usr-ledg-manager',
    email: 'ledg-manager@factory.com',
    fullName: 'Phạm Thị Quản Lý',
    role: 'ACCOUNTING_MANAGER',
    workshopId: 'ws-ledg-01',
  }

  const mockStaffUser: SessionUser = {
    id: 'usr-ledg-staff',
    email: 'ledg-staff@factory.com',
    fullName: 'Trần Văn Nhân Viên',
    role: 'WORKSHOP_STAFF',
    workshopId: 'ws-ledg-01',
  }

  beforeEach(async () => {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS inventory_periods (
        id TEXT PRIMARY KEY,
        workshop_id TEXT,
        period_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_closed INTEGER NOT NULL DEFAULT 0,
        closed_by TEXT,
        closed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (closed_by) REFERENCES users(id)
      );
    `)

    await client.execute(`PRAGMA foreign_keys = OFF;`)
    await client.execute(`DELETE FROM audit_logs WHERE id LIKE 'audit-ledg-%' OR entity_id LIKE 'tx-ledg-%';`)
    await client.execute(`DELETE FROM approval_history WHERE id LIKE 'appr-ledg-%' OR transaction_id LIKE 'tx-ledg-%';`)
    await client.execute(`DELETE FROM inventory_ledger WHERE id LIKE 'ledg-%' OR transaction_id LIKE 'tx-ledg-%';`)
    await client.execute(`DELETE FROM inventory_periods WHERE id LIKE 'prd-ledg-%';`)
    await client.execute(`DELETE FROM transaction_lines WHERE id LIKE 'line-ledg-%' OR transaction_id LIKE 'tx-ledg-%';`)
    await client.execute(`DELETE FROM transactions WHERE id LIKE 'tx-ledg-%';`)
    await client.execute(`DELETE FROM users WHERE id LIKE 'usr-ledg-%';`)
    await client.execute(`DELETE FROM warehouses WHERE id LIKE 'wh-ledg-%';`)
    await client.execute(`DELETE FROM workshops WHERE id = 'ws-ledg-01';`)
    await client.execute(`DELETE FROM items WHERE id = 'item-ledg-01';`)
    await client.execute(`PRAGMA foreign_keys = ON;`)


    // Seed master data
    await client.execute(`
      INSERT OR IGNORE INTO workshops (id, code, name, is_active)
      VALUES ('ws-ledg-01', 'WSLEDG01', 'Xưởng Tồn Kho Ledger', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO warehouses (id, workshop_id, code, name, warehouse_type, is_active)
      VALUES 
        ('wh-ledg-01', 'ws-ledg-01', 'WHLEDG01', 'Kho Vật Tư Chính', 'RAW_MATERIAL', 1),
        ('wh-ledg-02', 'ws-ledg-01', 'WHLEDG02', 'Kho Sản Phẩm Phụ', 'FINISHED_GOODS', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, workshop_id, is_active)
      VALUES 
        ('usr-ledg-accountant', 'ledg-accountant@factory.com', 'Kế Toán Ledger', 'WAREHOUSE_ACCOUNTANT', 'ws-ledg-01', 1),
        ('usr-ledg-manager', 'ledg-manager@factory.com', 'Quản Lý Ledger', 'ACCOUNTING_MANAGER', 'ws-ledg-01', 1),
        ('usr-ledg-staff', 'ledg-staff@factory.com', 'Nhân Viên Ledger', 'WORKSHOP_STAFF', 'ws-ledg-01', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO items (id, code, name, base_unit, minimum_stock, is_active)
      VALUES ('item-ledg-01', 'LEDG-CEMENT-01', 'Xi Măng Hoàng Thạch PCB40 Ledger', 'bao', 10, 1);
    `)
  })

  it('1. Nhập kho: Ghi sổ phiếu APPROVED nhập kho tạo đúng vế Nhập và số dư tồn', async () => {
    const txId = 'tx-ledg-in-01'
    const now = new Date().toISOString()

    await client.execute({
      sql: `
        INSERT INTO transactions (
          id, transaction_code, transaction_type, document_number, transaction_date,
          workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at
        ) VALUES (?, 'NK-LEDG-001', 'PURCHASE_RECEIPT', 'CT-NK-001', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txId, now, now, now],
    })

    await client.execute({
      sql: `
        INSERT INTO transaction_lines (
          id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_unit, confirmed_quantity, line_status, created_at, updated_at
        ) VALUES ('line-ledg-01', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 'bao', 100, 'OK', ?, ?)
      `,
      args: [txId, now, now],
    })

    const result = await postTransactionToLedger(txId, mockAccountantUser)
    expect(result.success).toBe(true)
    expect(result.status).toBe('POSTED')

    const entries = await getLedgerEntries({ warehouseId: 'wh-ledg-01', itemId: 'item-ledg-01' })
    expect(entries.length).toBe(1)
    expect(entries[0].quantityIn).toBe(100)
    expect(entries[0].quantityOut).toBe(0)
    expect(entries[0].runningBalance).toBe(100)

    const balances = await getStockBalances({ warehouseId: 'wh-ledg-01' })
    expect(balances.length).toBe(1)
    expect(balances[0].currentBalance).toBe(100)
    expect(balances[0].status).toBe('NORMAL')
  })

  it('2. Xuất kho: Ghi sổ phiếu APPROVED xuất kho làm giảm số dư tồn', async () => {
    // Đầu tiên nhập 100 bao
    const txInId = 'tx-ledg-in-02'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-002', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txInId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-02', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 100, ?, ?)
      `,
      args: [txInId, now, now],
    })
    await postTransactionToLedger(txInId, mockAccountantUser)

    // Tạo phiếu xuất 40 bao
    const txOutId = 'tx-ledg-out-01'
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, source_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'XK-LEDG-001', 'MATERIAL_ISSUE', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txOutId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-03', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 40, ?, ?)
      `,
      args: [txOutId, now, now],
    })

    const result = await postTransactionToLedger(txOutId, mockAccountantUser)
    expect(result.success).toBe(true)

    const balances = await getStockBalances({ warehouseId: 'wh-ledg-01' })
    expect(balances[0].currentBalance).toBe(60) // 100 - 40
  })

  it('3. Chuyển kho: Ghi sổ phiếu chuyển kho tạo đầy đủ hai vế (Chuyển đi & Chuyển đến)', async () => {
    // Tạo sẵn tồn ở kho 1 (wh-ledg-01) = 50
    const txInId = 'tx-ledg-in-03'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-003', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txInId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-04', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 50, ?, ?)
      `,
      args: [txInId, now, now],
    })

    await postTransactionToLedger(txInId, mockAccountantUser)

    // Tạo phiếu chuyển 30 bao từ kho 1 sang kho 2
    const txTransferId = 'tx-ledg-tr-01'
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, source_warehouse_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'CK-LEDG-001', 'TRANSFER_OUT', ?, 'ws-ledg-01', 'wh-ledg-01', 'wh-ledg-02', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txTransferId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-05', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 30, ?, ?)
      `,
      args: [txTransferId, now, now],
    })

    await postTransactionToLedger(txTransferId, mockAccountantUser)

    // Kiểm tra kho 1 còn 20
    const b1 = await getStockBalances({ warehouseId: 'wh-ledg-01' })
    expect(b1[0].currentBalance).toBe(20)

    // Kiểm tra kho 2 tăng lên 30
    const b2 = await getStockBalances({ warehouseId: 'wh-ledg-02' })
    expect(b2[0].currentBalance).toBe(30)
  })

  it('4. Double posting: Ghi sổ lại phiếu đã POSTED phải bị từ chối', async () => {
    const txId = 'tx-ledg-dup-01'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-DUP', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-dup', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 10, ?, ?)
      `,
      args: [txId, now, now],
    })

    // Lần 1: Thành công
    await postTransactionToLedger(txId, mockAccountantUser)

    // Lần 2: Phải báo lỗi đã POSTED
    await expect(postTransactionToLedger(txId, mockAccountantUser)).rejects.toThrow('Phiếu kho đã được ghi sổ trước đó')
  })

  it('5. Concurrent posting: Hai yêu cầu ghi sổ đồng thời chỉ có 1 yêu cầu thành công', async () => {
    const txId = 'tx-ledg-conc-01'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-CONC', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-conc', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 50, ?, ?)
      `,
      args: [txId, now, now],
    })

    // Gọi 2 promise đồng thời
    const results = await Promise.allSettled([
      postTransactionToLedger(txId, mockAccountantUser),
      postTransactionToLedger(txId, mockAccountantUser),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)
  })

  it('6. Rollback: Khi xảy ra lỗi giữa chừng, toàn bộ transaction bị rollback và không có dòng ledger nào được ghi', async () => {
    const txId = 'tx-ledg-roll-01'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-ROLL', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txId, now, now, now],
    })
    // Không thêm transaction_lines hợp lệ (không có confirmed_item_id)
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-roll', ?, 1, 'Hàng chưa ánh xạ', NULL, 10, ?, ?)
      `,
      args: [txId, now, now],
    })

    await expect(postTransactionToLedger(txId, mockAccountantUser)).rejects.toThrow('Phiếu không có dòng hàng hóa hợp lệ')

    // Trạng thái phiếu vẫn là APPROVED (hoặc không đổi sang POSTED)
    const txRes = await client.execute({ sql: `SELECT status FROM transactions WHERE id = ?`, args: [txId] })
    expect(txRes.rows[0].status).toBe('APPROVED')

    // Không có dòng ledger nào được lưu
    const ledgRes = await client.execute({ sql: `SELECT COUNT(*) as cnt FROM inventory_ledger WHERE transaction_id = ?`, args: [txId] })
    expect(Number(ledgRes.rows[0].cnt)).toBe(0)
  })

  it('7. Âm kho: Thao tác xuất kho làm tồn âm bị từ chối', async () => {
    // Kho hiện tại tồn 10 bao
    const txInId = 'tx-ledg-in-04'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-004', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txInId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-06', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 10, ?, ?)
      `,
      args: [txInId, now, now],
    })
    await postTransactionToLedger(txInId, mockAccountantUser)

    // Tạo phiếu xuất 50 bao (vượt quá 10)
    const txOutId = 'tx-ledg-neg-01'
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, source_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'XK-LEDG-NEG', 'MATERIAL_ISSUE', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txOutId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-neg', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 50, ?, ?)
      `,
      args: [txOutId, now, now],
    })

    // Ghi sổ bởi WAREHOUSE_ACCOUNTANT thông thường mà không có ngoại lệ
    await expect(postTransactionToLedger(txOutId, mockAccountantUser)).rejects.toThrow('Âm kho bị chặn')
  })

  it('8. Ngoại lệ âm kho: ACCOUNTING_MANAGER có thể duyệt ngoại lệ xuất âm kho với lý do bắt buộc', async () => {
    const txOutId = 'tx-ledg-neg-02'
    const now = new Date().toISOString()
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, source_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'XK-LEDG-NEG2', 'MATERIAL_ISSUE', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txOutId, now, now, now],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-neg2', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 50, ?, ?)
      `,
      args: [txOutId, now, now],
    })

    // 1. Thử duyệt ngoại lệ mà không nhập lý do -> Bị từ chối
    await expect(
      postTransactionToLedger(txOutId, mockManagerUser, { allowNegativeStock: true, negativeStockReason: '' })
    ).rejects.toThrow('Yêu cầu nhập lý do bắt buộc khi phê duyệt ngoại lệ xuất âm kho')


    // 2. Thử duyệt ngoại lệ bởi WAREHOUSE_ACCOUNTANT -> Bị từ chối do không phải ACCOUNTING_MANAGER / ADMIN
    await expect(
      postTransactionToLedger(txOutId, mockAccountantUser, { allowNegativeStock: true, negativeStockReason: 'Cần xuất vội cho công trình' })
    ).rejects.toThrow('Chỉ ACCOUNTING_MANAGER hoặc ADMIN')


    // 3. ACCOUNTING_MANAGER duyệt ngoại lệ với lý do đầy đủ -> Thành công
    const result = await postTransactionToLedger(txOutId, mockManagerUser, {
      allowNegativeStock: true,
      negativeStockReason: 'Duyệt ngoại lệ: Hàng đã về kho thực tế nhưng hóa đơn chưa tới',
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe('POSTED')

    const balances = await getStockBalances({ warehouseId: 'wh-ledg-01' })
    expect(balances[0].currentBalance).toBe(-50) // 0 - 50 = -50
    expect(balances[0].status).toBe('NEGATIVE')

  })

  it('9. Kỳ đã khóa: Ghi sổ phiếu trong kỳ kế toán đã khóa bị ngăn chặn', async () => {
    // Khóa kỳ từ 2026-06-01 đến 2026-06-30
    const period = await createInventoryPeriod(
      {
        periodName: 'Tháng 06/2026',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        workshopId: 'ws-ledg-01',
      },
      mockManagerUser
    )

    await togglePeriodLock(period.id, true, mockManagerUser)

    // Tạo phiếu thuộc kỳ tháng 6/2026
    const txId = 'tx-ledg-closed-01'
    const oldDate = '2026-06-15T10:00:00.000Z'
    await client.execute({
      sql: `
        INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status, created_at, updated_at)
        VALUES (?, 'NK-LEDG-CLOSED', 'PURCHASE_RECEIPT', ?, 'ws-ledg-01', 'wh-ledg-01', 'usr-ledg-staff', 'APPROVED', ?, ?)
      `,
      args: [txId, oldDate, oldDate, oldDate],
    })
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, created_at, updated_at)
        VALUES ('line-ledg-closed', ?, 1, 'Xi Măng PCB40', 'item-ledg-01', 20, ?, ?)
      `,
      args: [txId, oldDate, oldDate],
    })

    // Ghi sổ phiếu bị chặn do thuộc kỳ đã khóa
    await expect(postTransactionToLedger(txId, mockAccountantUser)).rejects.toThrow('Kỳ kế toán chứa ngày chứng từ này đã bị khóa')
  })
})

function txInInId(id: string) {
  return id
}
