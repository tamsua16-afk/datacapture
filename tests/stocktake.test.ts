import { describe, it, expect, beforeEach } from 'vitest'
import { getRawClient } from '../src/lib/database/client'
import {
  createStocktakeSession,
  getStocktakeById,
  processStocktakeExtraction,
  mapStocktakeLineItem,
  updateStocktakeLineCountedQty,
  updateStocktakeLineExplanation,
  confirmStocktakeSession,
  createAdjustmentProposals,
  exportStocktakeCSV,
  calculateHistoricalBookQuantity,
} from '../src/lib/services/stocktakeService'
import { postTransactionToLedger } from '../src/lib/services/ledgerService'
import { SessionUser } from '../src/lib/auth/session'

describe('Milestone 7: Stocktake & Reconciliation Integration Tests', () => {
  const client = getRawClient()

  const mockAccountantUser: SessionUser = {
    id: 'usr-stk-accountant',
    email: 'stk-accountant@factory.com',
    fullName: 'Lê Văn Kế Toán Kho',
    role: 'WAREHOUSE_ACCOUNTANT',
    workshopId: 'ws-stk-01',
  }

  const mockWorkshopManager: SessionUser = {
    id: 'usr-stk-manager',
    email: 'stk-manager@factory.com',
    fullName: 'Nguyễn Văn Xưởng Trưởng',
    role: 'WORKSHOP_MANAGER',
    workshopId: 'ws-stk-01',
  }

  const mockStaffUser: SessionUser = {
    id: 'usr-stk-staff',
    email: 'stk-staff@factory.com',
    fullName: 'Trần Văn Nhân Viên',
    role: 'WORKSHOP_STAFF',
    workshopId: 'ws-stk-01',
  }

  beforeEach(async () => {
    // Schema setup for SQLite in test mode
    await client.execute(`
      CREATE TABLE IF NOT EXISTS stocktakes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        workshop_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        stocktake_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        created_by TEXT NOT NULL,
        confirmed_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (confirmed_by) REFERENCES users(id)
      );
    `)

    await client.execute(`
      CREATE TABLE IF NOT EXISTS stocktake_lines (
        id TEXT PRIMARY KEY,
        stocktake_id TEXT NOT NULL,
        item_id TEXT,
        raw_item_name TEXT NOT NULL,
        book_quantity REAL NOT NULL DEFAULT 0,
        counted_quantity REAL NOT NULL DEFAULT 0,
        difference_quantity REAL NOT NULL DEFAULT 0,
        difference_percentage REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'UNIDENTIFIED',
        explanation TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (stocktake_id) REFERENCES stocktakes(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );
    `)

    await client.execute(`PRAGMA foreign_keys = OFF;`)
    await client.execute(`DELETE FROM inventory_periods WHERE workshop_id = 'ws-stk-01';`)
    await client.execute(`DELETE FROM audit_logs WHERE id LIKE 'audit-stk-%' OR entity_id LIKE 'stk-%';`)
    await client.execute(`DELETE FROM stocktake_lines WHERE stocktake_id LIKE 'stk-%';`)
    await client.execute(`DELETE FROM stocktakes WHERE id LIKE 'stk-%';`)
    await client.execute(`DELETE FROM inventory_ledger WHERE warehouse_id = 'wh-stk-01' OR transaction_id LIKE 'tx-stk-%';`)
    await client.execute(`DELETE FROM transaction_lines WHERE transaction_id LIKE 'tx-stk-%';`)
    await client.execute(`DELETE FROM transactions WHERE id LIKE 'tx-stk-%';`)
    await client.execute(`DELETE FROM users WHERE id LIKE 'usr-stk-%';`)
    await client.execute(`DELETE FROM warehouses WHERE id LIKE 'wh-stk-%';`)
    await client.execute(`DELETE FROM workshops WHERE id = 'ws-stk-01';`)
    await client.execute(`DELETE FROM items WHERE id LIKE 'item-stk-%';`)
    await client.execute(`PRAGMA foreign_keys = ON;`)

    // Seed master data
    await client.execute(`
      INSERT OR IGNORE INTO workshops (id, code, name, is_active)
      VALUES ('ws-stk-01', 'WSSTK01', 'Xưởng Kiểm Kê', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO warehouses (id, workshop_id, code, name, warehouse_type, is_active)
      VALUES ('wh-stk-01', 'ws-stk-01', 'WHSTK01', 'Kho Vật Tư Kiểm Kê', 'RAW_MATERIAL', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, workshop_id, is_active)
      VALUES 
        ('usr-stk-accountant', 'stk-accountant@factory.com', 'Kế Toán STK', 'WAREHOUSE_ACCOUNTANT', 'ws-stk-01', 1),
        ('usr-stk-manager', 'stk-manager@factory.com', 'Quản Lý STK', 'WORKSHOP_MANAGER', 'ws-stk-01', 1),
        ('usr-stk-staff', 'stk-staff@factory.com', 'Nhân Viên STK', 'WORKSHOP_STAFF', 'ws-stk-01', 1);
    `)

    await client.execute(`
      INSERT OR IGNORE INTO items (id, code, name, base_unit, minimum_stock, is_active)
      VALUES 
        ('item-stk-01', 'STK-CEMENT-01', 'Xi Măng Hoàng Thạch PCB40 STK', 'bao', 10, 1),
        ('item-stk-02', 'STK-SAND-01', 'Cát Vàng Sông Lô STK', 'm3', 20, 1);
    `)
  })

  it('1. Tính tồn kho tại thời điểm quá khứ (Historical Past Date Snapshot)', async () => {
    // Tạo 3 phiếu kho ghi sổ ở các mốc thời gian khác nhau:
    // - T1 (Past 2026-07-01): Nhập 100 bao xi măng (POSTED)
    // - T2 (Stocktake date 2026-07-15): Xuất 30 bao xi măng (POSTED) -> Tồn tại mốc T2 = 70
    // - T3 (Future 2026-07-25): Nhập 50 bao xi măng (POSTED) -> Tồn hiện tại T3 = 120

    const t1Date = '2026-07-01T10:00:00.000Z'
    const stocktakeDate = '2026-07-15T23:59:59.000Z'
    const t3Date = '2026-07-25T10:00:00.000Z'

    // Tx 1 at T1
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status)
      VALUES ('tx-stk-01', 'PUR-STK-01', 'PURCHASE_RECEIPT', '${t1Date}', 'ws-stk-01', 'wh-stk-01', 'usr-stk-staff', 'APPROVED');
    `)
    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, line_status)
      VALUES ('line-stk-01', 'tx-stk-01', 1, 'Xi Măng', 'item-stk-01', 100, 'OK');
    `)
    await postTransactionToLedger('tx-stk-01', mockAccountantUser)

    // Tx 2 at T2 (Stocktake Date boundary)
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, source_warehouse_id, sender_user_id, status)
      VALUES ('tx-stk-02', 'ISS-STK-02', 'MATERIAL_ISSUE', '${stocktakeDate}', 'ws-stk-01', 'wh-stk-01', 'usr-stk-staff', 'APPROVED');
    `)
    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, line_status)
      VALUES ('line-stk-02', 'tx-stk-02', 1, 'Xi Măng', 'item-stk-01', 30, 'OK');
    `)
    await postTransactionToLedger('tx-stk-02', mockAccountantUser)

    // Tx 3 at T3 (After Stocktake Date)
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status)
      VALUES ('tx-stk-03', 'PUR-STK-03', 'PURCHASE_RECEIPT', '${t3Date}', 'ws-stk-01', 'wh-stk-01', 'usr-stk-staff', 'APPROVED');
    `)
    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, line_status)
      VALUES ('line-stk-03', 'tx-stk-03', 1, 'Xi Măng', 'item-stk-01', 50, 'OK');
    `)
    await postTransactionToLedger('tx-stk-03', mockAccountantUser)

    // Kiểm tra tính toán tồn tại thời điểm quá khứ stocktakeDate (2026-07-15)
    const bookQtyAtStocktakeDate = await calculateHistoricalBookQuantity('wh-stk-01', 'item-stk-01', stocktakeDate)
    expect(bookQtyAtStocktakeDate).toBe(70) // 100 - 30 = 70, không tính +50 của T3!

    // Tạo đợt kiểm kê mốc 2026-07-15
    const session = await createStocktakeSession(
      {
        workshopId: 'ws-stk-01',
        warehouseId: 'wh-stk-01',
        stocktakeDate,
        code: 'STK-TEST-PAST',
      },
      mockStaffUser
    )

    const cementLine = session.lines.find((l) => l.itemId === 'item-stk-01')
    expect(cementLine).toBeDefined()
    expect(cementLine?.bookQuantity).toBe(70)
  })

  it('2. Xử lý mã hàng chưa ánh xạ (UNIDENTIFIED status) và Ánh xạ thủ công', async () => {
    const stocktakeDate = new Date().toISOString()
    const session = await createStocktakeSession(
      {
        workshopId: 'ws-stk-01',
        warehouseId: 'wh-stk-01',
        stocktakeDate,
        code: 'STK-TEST-UNMAPPED',
      },
      mockStaffUser
    )

    // Trích xuất AI với một mặt hàng hoàn toàn mới chưa có trong danh mục
    const updatedSession = await processStocktakeExtraction(
      session.id,
      [
        { rawItemName: 'Vật tư lạ chưa dán nhãn', countedQuantity: 15 },
      ],
      mockStaffUser
    )

    const unmappedLine = updatedSession.lines.find((l) => l.rawItemName === 'Vật tư lạ chưa dán nhãn')
    expect(unmappedLine).toBeDefined()
    expect(unmappedLine?.itemId).toBeNull()
    expect(unmappedLine?.status).toBe('UNIDENTIFIED')

    // Thực hiện ánh xạ thủ công sang `item-stk-02` (Cát Vàng Sông Lô)
    const mappedSession = await mapStocktakeLineItem(session.id, unmappedLine!.id, 'item-stk-02', mockStaffUser)
    const mappedLine = mappedSession.lines.find((l) => l.id === unmappedLine!.id)

    expect(mappedLine?.itemId).toBe('item-stk-02')
    expect(mappedLine?.status).not.toBe('UNIDENTIFIED')
  })

  it('3. Nhập counted quantity, tính chênh lệch & %, phân loại SURPLUS và SHORTAGE', async () => {
    // Seed tồn kho 50 cho item-stk-01
    const txDate = '2026-07-01T10:00:00.000Z'
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status)
      VALUES ('tx-stk-10', 'PUR-STK-10', 'PURCHASE_RECEIPT', '${txDate}', 'ws-stk-01', 'wh-stk-01', 'usr-stk-staff', 'APPROVED');
    `)
    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, line_status)
      VALUES ('line-stk-10', 'tx-stk-10', 1, 'Xi Măng', 'item-stk-01', 50, 'OK');
    `)
    await postTransactionToLedger('tx-stk-10', mockAccountantUser)

    const session = await createStocktakeSession(
      {
        workshopId: 'ws-stk-01',
        warehouseId: 'wh-stk-01',
        stocktakeDate: new Date().toISOString(),
        code: 'STK-TEST-QTY',
      },
      mockStaffUser
    )

    const cementLine = session.lines.find((l) => l.itemId === 'item-stk-01')!
    expect(cementLine.bookQuantity).toBe(50)

    // Cập nhật thực tế kiểm kê = 60 (Thừa 10 = +20%)
    const updatedSurplus = await updateStocktakeLineCountedQty(session.id, cementLine.id, 60, mockStaffUser)
    const surplusLine = updatedSurplus.lines.find((l) => l.id === cementLine.id)!

    expect(surplusLine.countedQuantity).toBe(60)
    expect(surplusLine.differenceQuantity).toBe(10)
    expect(surplusLine.differencePercentage).toBe(20)
    expect(surplusLine.status).toBe('SURPLUS')

    // Cập nhật thực tế kiểm kê = 40 (Thiếu 10 = -20%)
    const updatedShortage = await updateStocktakeLineCountedQty(session.id, cementLine.id, 40, mockStaffUser)
    const shortageLine = updatedShortage.lines.find((l) => l.id === cementLine.id)!

    expect(shortageLine.countedQuantity).toBe(40)
    expect(shortageLine.differenceQuantity).toBe(-10)
    expect(shortageLine.differencePercentage).toBe(-20)
    expect(shortageLine.status).toBe('SHORTAGE')
  })

  it('4. Nhập giải trình Xưởng trưởng và Kế toán xác nhận đợt kiểm kê', async () => {
    const session = await createStocktakeSession(
      {
        workshopId: 'ws-stk-01',
        warehouseId: 'wh-stk-01',
        stocktakeDate: new Date().toISOString(),
        code: 'STK-TEST-CONFIRM',
      },
      mockStaffUser
    )

    const line = session.lines[0]
    // Cập nhật thực tế kiểm kê cho có chênh lệch
    await updateStocktakeLineCountedQty(session.id, line.id, 5, mockStaffUser)

    // Xưởng trưởng nhập giải trình
    const explainedSession = await updateStocktakeLineExplanation(
      session.id,
      line.id,
      'Hao hụt tự nhiên do độ ẩm bảo quản',
      mockWorkshopManager
    )
    const explainedLine = explainedSession.lines.find((l) => l.id === line.id)!
    expect(explainedLine.explanation).toBe('Hao hụt tự nhiên do độ ẩm bảo quản')
    expect(explainedLine.status).toBe('EXPLAINED')

    // Kế toán bấm xác nhận đợt kiểm kê
    const confirmedSession = await confirmStocktakeSession(session.id, mockAccountantUser)
    expect(confirmedSession.status).toBe('CONFIRMED')
    expect(confirmedSession.confirmedBy).toBe(mockAccountantUser.id)
  })

  it('5. Tạo Đề xuất điều chỉnh Nháp (DRAFT) - KHÔNG TỰ ĐỘNG GHI SỔ LEDGER', async () => {
    // 1. Seed tồn kho ban đầu: item-stk-01 = 100
    const txDate = '2026-07-01T10:00:00.000Z'
    await client.execute(`
      INSERT INTO transactions (id, transaction_code, transaction_type, transaction_date, workshop_id, destination_warehouse_id, sender_user_id, status)
      VALUES ('tx-stk-20', 'PUR-STK-20', 'PURCHASE_RECEIPT', '${txDate}', 'ws-stk-01', 'wh-stk-01', 'usr-stk-staff', 'APPROVED');
    `)
    await client.execute(`
      INSERT INTO transaction_lines (id, transaction_id, line_number, raw_item_name, confirmed_item_id, confirmed_quantity, line_status)
      VALUES ('line-stk-20', 'tx-stk-20', 1, 'Xi Măng', 'item-stk-01', 100, 'OK');
    `)
    await postTransactionToLedger('tx-stk-20', mockAccountantUser)

    // Lấy tổng số bản ghi trong inventory_ledger trước khi kiểm kê
    const ledgerBeforeRes = await client.execute(`SELECT COUNT(*) as cnt FROM inventory_ledger WHERE item_id = 'item-stk-01'`)
    const ledgerCountBefore = Number(ledgerBeforeRes.rows[0].cnt)

    // 2. Tạo đợt kiểm kê và lập chênh lệch thiếu 15 bao (counted = 85)
    const session = await createStocktakeSession(
      {
        workshopId: 'ws-stk-01',
        warehouseId: 'wh-stk-01',
        stocktakeDate: new Date().toISOString(),
        code: 'STK-TEST-PROPOSAL',
      },
      mockStaffUser
    )

    const line = session.lines.find((l) => l.itemId === 'item-stk-01')!
    await updateStocktakeLineCountedQty(session.id, line.id, 85, mockStaffUser) // thiếu 15

    // 3. Kế toán xác nhận và Tạo đề xuất điều chỉnh
    await confirmStocktakeSession(session.id, mockAccountantUser)
    const proposalResult = await createAdjustmentProposals(session.id, mockAccountantUser)

    expect(proposalResult.status).toBe('ADJUSTED')
    expect(proposalResult.proposals.length).toBe(1)
    expect(proposalResult.proposals[0].type).toBe('ADJUSTMENT_OUT')
    expect(proposalResult.proposals[0].status).toBe('DRAFT') // QUY TẮC BẮT BUỘC: DRAFT!

    // 4. KIỂM TRA QUAN TRỌNG: Sổ tồn kho inventory_ledger KHÔNG bị tự động biến đổi
    const ledgerAfterRes = await client.execute(`SELECT COUNT(*) as cnt FROM inventory_ledger WHERE item_id = 'item-stk-01'`)
    const ledgerCountAfter = Number(ledgerAfterRes.rows[0].cnt)
    expect(ledgerCountAfter).toBe(ledgerCountBefore) // Không thêm bất kỳ bản ghi ghi sổ nào!
  })

  it('6. Xuất biên bản chênh lệch kiểm kê ra CSV', async () => {
    const session = await createStocktakeSession(
      {
        workshopId: 'ws-stk-01',
        warehouseId: 'wh-stk-01',
        stocktakeDate: new Date().toISOString(),
        code: 'STK-TEST-CSV',
      },
      mockStaffUser
    )

    const csvData = await exportStocktakeCSV(session.id)
    expect(csvData).toContain('BIÊN BẢN KIỂM KÊ VÀ ĐỐI CHIẾU TỒN KHO')
    expect(csvData).toContain('STK-TEST-CSV')
    expect(csvData).toContain('Xi Măng Hoàng Thạch PCB40 STK')
  })
})
