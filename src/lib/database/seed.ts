/**
 * Demo data seed script.
 * Tạo database SQLite và chèn dữ liệu mẫu.
 * Chạy: npm run db:seed
 *
 * Script này dùng SQL thuần để tránh dependency vào dialect Drizzle.
 */

import { createClient } from '@libsql/client'
import path from 'path'
import fs from 'fs'

const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'xuong-data-capture.db')
const db = createClient({ url: `file:${dbPath}` })

async function seed() {
  console.log('🌱 Bắt đầu tạo dữ liệu demo...')

  // ── Tạo tables ──────────────────────────────────────────────────────────────
  await db.executeMultiple(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'WORKSHOP_STAFF',
      workshop_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workshops (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      manager_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      workshop_id TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      warehouse_type TEXT NOT NULL DEFAULT 'GENERAL',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      item_group TEXT NOT NULL DEFAULT 'OTHER',
      base_unit TEXT NOT NULL,
      minimum_stock REAL NOT NULL DEFAULT 0,
      maximum_stock REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_aliases (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      workshop_id TEXT,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      confirmed_count INTEGER NOT NULL DEFAULT 0,
      last_confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unit_conversions (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      from_unit TEXT NOT NULL,
      to_unit TEXT NOT NULL,
      conversion_factor REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      transaction_code TEXT NOT NULL UNIQUE,
      transaction_type TEXT NOT NULL,
      document_number TEXT,
      transaction_date TEXT NOT NULL,
      workshop_id TEXT NOT NULL,
      source_warehouse_id TEXT,
      destination_warehouse_id TEXT,
      sender_user_id TEXT NOT NULL,
      reviewer_user_id TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      overall_confidence REAL,
      duplicate_score REAL,
      notes TEXT,
      rejection_reason TEXT,
      submitted_at TEXT,
      reviewed_at TEXT,
      posted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workshop_id) REFERENCES workshops(id),
      FOREIGN KEY (sender_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_lines (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      raw_item_name TEXT NOT NULL,
      suggested_item_id TEXT,
      confirmed_item_id TEXT,
      extracted_unit TEXT,
      confirmed_unit TEXT,
      extracted_quantity REAL,
      confirmed_quantity REAL,
      batch_number TEXT,
      item_confidence REAL NOT NULL DEFAULT 0,
      unit_confidence REAL NOT NULL DEFAULT 0,
      quantity_confidence REAL NOT NULL DEFAULT 0,
      line_status TEXT NOT NULL DEFAULT 'OK',
      warning_codes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'LOCAL',
      storage_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      image_width INTEGER,
      image_height INTEGER,
      page_number INTEGER NOT NULL DEFAULT 1,
      image_quality_score REAL,
      file_hash TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS ai_extractions (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      raw_response TEXT NOT NULL DEFAULT '{}',
      parsed_response TEXT,
      processing_time_ms INTEGER NOT NULL,
      token_usage TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS approval_history (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      comment TEXT,
      snapshot_before TEXT NOT NULL DEFAULT '{}',
      snapshot_after TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (actor_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      transaction_line_id TEXT NOT NULL,
      workshop_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      quantity_in REAL NOT NULL DEFAULT 0,
      quantity_out REAL NOT NULL DEFAULT 0,
      running_balance REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_date TEXT NOT NULL,
      workshop_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'SCHEDULED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workshop_id) REFERENCES workshops(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

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
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

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
      FOREIGN KEY (stocktake_id) REFERENCES stocktakes(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT,
      before_data TEXT,
      after_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  console.log('✅ Đã tạo tables')

  // ── Users ───────────────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO users (id, email, full_name, role, workshop_id) VALUES
      ('demo-staff-001', 'staff@demo.local', 'Nguyễn Văn An', 'WORKSHOP_STAFF', 'demo-workshop-001'),
      ('demo-manager-001', 'manager@demo.local', 'Trần Thị Bình', 'WORKSHOP_MANAGER', 'demo-workshop-001'),
      ('demo-accountant-001', 'accountant@demo.local', 'Lê Văn Cường', 'WAREHOUSE_ACCOUNTANT', NULL),
      ('demo-acc-manager-001', 'accounting.manager@demo.local', 'Phạm Thị Dung', 'ACCOUNTING_MANAGER', NULL),
      ('demo-admin-001', 'admin@demo.local', 'Hoàng Văn Emm', 'ADMIN', NULL),
      ('demo-viewer-001', 'viewer@demo.local', 'Vũ Thị Phương', 'VIEWER', NULL);
  `)
  console.log('✅ Đã tạo 6 users demo')

  // ── Workshops ───────────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO workshops (id, code, name, address, manager_name) VALUES
      ('demo-workshop-001', 'XD-DAI-MO', 'Xưởng Đại Mỗ', 'Đại Mỗ, Nam Từ Liêm, Hà Nội', 'Trần Thị Bình'),
      ('demo-workshop-002', 'XD-HA-DONG', 'Xưởng Hà Đông', 'Hà Đông, Hà Nội', 'Nguyễn Minh Giang'),
      ('demo-workshop-003', 'XD-DONG-ANH', 'Xưởng Đông Anh', 'Đông Anh, Hà Nội', 'Lê Thành Hùng');
  `)
  console.log('✅ Đã tạo 3 workshops demo')

  // ── Warehouses ──────────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO warehouses (id, workshop_id, code, name, warehouse_type) VALUES
      ('demo-wh-001', 'demo-workshop-001', 'KHO-DM-NVL', 'Kho NVL Đại Mỗ', 'RAW_MATERIAL'),
      ('demo-wh-002', 'demo-workshop-001', 'KHO-DM-TP', 'Kho Thành Phẩm Đại Mỗ', 'FINISHED_GOODS'),
      ('demo-wh-003', 'demo-workshop-002', 'KHO-HD-NVL', 'Kho NVL Hà Đông', 'RAW_MATERIAL'),
      ('demo-wh-004', 'demo-workshop-003', 'KHO-DA-NVL', 'Kho NVL Đông Anh', 'RAW_MATERIAL'),
      ('demo-wh-005', 'demo-workshop-003', 'KHO-DA-CC', 'Kho CC-DC Đông Anh', 'TOOLS');
  `)
  console.log('✅ Đã tạo 5 warehouses demo')

  // ── Items (30+ mã hàng) ─────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO items (id, code, name, item_group, base_unit, minimum_stock) VALUES
      ('item-001', 'XM-PCB40', 'Xi măng PCB40', 'CEMENT', 'kg', 5000),
      ('item-002', 'XM-PCB30', 'Xi măng PCB30', 'CEMENT', 'kg', 3000),
      ('item-003', 'XM-PC40', 'Xi măng PC40', 'CEMENT', 'kg', 2000),
      ('item-004', 'CAT-VANG', 'Cát vàng', 'SAND', 'kg', 10000),
      ('item-005', 'CAT-DEN', 'Cát đen', 'SAND', 'kg', 8000),
      ('item-006', 'CAT-XAY', 'Cát xây', 'SAND', 'kg', 5000),
      ('item-007', 'DA-1X2', 'Đá 1x2', 'STONE', 'kg', 15000),
      ('item-008', 'DA-2X4', 'Đá 2x4', 'STONE', 'kg', 10000),
      ('item-009', 'DA-HOM', 'Đá hộc', 'STONE', 'kg', 5000),
      ('item-010', 'THEP-D10', 'Thép D10', 'STEEL', 'kg', 2000),
      ('item-011', 'THEP-D12', 'Thép D12', 'STEEL', 'kg', 2000),
      ('item-012', 'THEP-D16', 'Thép D16', 'STEEL', 'kg', 1500),
      ('item-013', 'THEP-D20', 'Thép D20', 'STEEL', 'kg', 1000),
      ('item-014', 'THEP-HINH', 'Thép hình các loại', 'STEEL', 'kg', 500),
      ('item-015', 'PG-01', 'Phụ gia 01 siêu dẻo', 'ADDITIVE', 'lít', 200),
      ('item-016', 'PG-02', 'Phụ gia 02 chống thấm', 'ADDITIVE', 'lít', 100),
      ('item-017', 'PG-03', 'Phụ gia 03 đông cứng', 'ADDITIVE', 'lít', 50),
      ('item-018', 'TP-COC-BTR', 'Cọc bê tông rỗng D400', 'FINISHED', 'cái', 100),
      ('item-019', 'TP-COC-BTD', 'Cọc bê tông đặc D300', 'FINISHED', 'cái', 50),
      ('item-020', 'TP-TAM-BT', 'Tấm bê tông đúc sẵn', 'FINISHED', 'cái', 20),
      ('item-021', 'TP-CONG-BT', 'Cống bê tông D600', 'FINISHED', 'cái', 30),
      ('item-022', 'TP-HOT-GA', 'Hố ga BTCT', 'FINISHED', 'cái', 20),
      ('item-023', 'NUOC', 'Nước thi công', 'OTHER', 'm3', 100),
      ('item-024', 'DAU-CD', 'Dầu chống dính khuôn', 'OTHER', 'lít', 50),
      ('item-025', 'DAY-BUOC', 'Dây buộc thép', 'OTHER', 'kg', 100),
      ('item-026', 'XM-TRANG', 'Xi măng trắng trang trí', 'CEMENT', 'kg', 500),
      ('item-027', 'CAT-SAN-LY', 'Cát sàng lọc tinh', 'SAND', 'kg', 3000),
      ('item-028', 'DA-DEM', 'Đá dăm đệm móng', 'STONE', 'kg', 5000),
      ('item-029', 'THEP-LUOI', 'Thép lưới B40', 'STEEL', 'm2', 500),
      ('item-030', 'TP-TAM-LOT', 'Tấm lót đường đúc sẵn', 'FINISHED', 'cái', 50),
      ('item-031', 'PG-TN', 'Phụ gia trương nở không co', 'ADDITIVE', 'kg', 200),
      ('item-032', 'TP-MON-CU', 'Móng cốc BTCT', 'FINISHED', 'cái', 10);
  `)
  console.log('✅ Đã tạo 32 items demo')

  // ── Item Aliases ─────────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO item_aliases (id, item_id, alias, normalized_alias, confirmed_count) VALUES
      ('alias-001', 'item-001', 'XM40', 'xm40', 15),
      ('alias-002', 'item-001', 'Xi mang 40', 'xi mang 40', 8),
      ('alias-003', 'item-001', 'xi măng pcb40', 'xi mang pcb40', 12),
      ('alias-004', 'item-001', 'ximang40', 'ximang40', 5),
      ('alias-005', 'item-004', 'Cat vang', 'cat vang', 20),
      ('alias-006', 'item-004', 'cát vàng', 'cat vang', 18),
      ('alias-007', 'item-005', 'Cat den', 'cat den', 10),
      ('alias-008', 'item-007', 'Đá 1 2', 'da 1 2', 25),
      ('alias-009', 'item-007', 'da 1x2', 'da 1x2', 30),
      ('alias-010', 'item-007', 'đá dăm 1x2', 'da dam 1x2', 8),
      ('alias-011', 'item-010', 'Thep phi 10', 'thep phi 10', 22),
      ('alias-012', 'item-010', 'thép phi 10', 'thep phi 10', 15),
      ('alias-013', 'item-010', 'Fe10', 'fe10', 7),
      ('alias-014', 'item-011', 'Thep phi 12', 'thep phi 12', 18),
      ('alias-015', 'item-011', 'Fe12', 'fe12', 5),
      ('alias-016', 'item-015', 'Phu gia 01', 'phu gia 01', 12),
      ('alias-017', 'item-015', 'phụ gia siêu dẻo', 'phu gia sieu deo', 8);
  `)
  console.log('✅ Đã tạo 17 item aliases')

  // ── Units ────────────────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO units (id, code, name, description) VALUES
      ('unit-001', 'kg', 'Kilôgam', 'Đơn vị khối lượng chuẩn'),
      ('unit-002', 'tan', 'Tấn', '1 Tấn = 1000 kg'),
      ('unit-003', 'bao', 'Bao', 'Bao xi măng hoặc phụ gia'),
      ('unit-004', 'm3', 'Mét khối', 'Đơn vị thể tích cát, đá, nước'),
      ('unit-005', 'lit', 'Lít', 'Đơn vị thể tích phụ gia, dầu'),
      ('unit-006', 'cai', 'Cái', 'Đơn vị đếm thành phẩm cọc, cống, tấm'),
      ('unit-007', 'm2', 'Mét vuông', 'Đơn vị diện tích thép lưới, tấm lót'),
      ('unit-008', 'met', 'Mét', 'Đơn vị chiều dài thép, dây');
  `)
  console.log('✅ Đã tạo 8 units demo')

  // ── Unit Conversions ─────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO unit_conversions (id, item_id, from_unit, to_unit, conversion_factor) VALUES
      ('conv-001', NULL, 'tan', 'kg', 1000.0),
      ('conv-002', 'item-001', 'bao', 'kg', 50.0),
      ('conv-003', 'item-002', 'bao', 'kg', 50.0),
      ('conv-004', 'item-003', 'bao', 'kg', 50.0),
      ('conv-005', 'item-004', 'm3', 'kg', 1400.0),
      ('conv-006', 'item-007', 'm3', 'kg', 1500.0);
  `)
  console.log('✅ Đã tạo 6 quy đổi đơn vị demo')

  // ── Demo Transactions ────────────────────────────────────────────────────────
  // Tạo 16+ giao dịch mẫu (bao gồm: pending, approved, posted, export_ready, exported, duplicates, negative stock)
  const now = new Date()
  const d = (daysAgo: number) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() - daysAgo)
    return dt.toISOString()
  }

  await db.executeMultiple(`
    INSERT OR IGNORE INTO transactions
      (id, transaction_code, transaction_type, document_number, transaction_date, workshop_id, source_warehouse_id, destination_warehouse_id, sender_user_id, status, overall_confidence, duplicate_score, notes, submitted_at, reviewed_at, posted_at)
    VALUES
      -- Phiếu đã ghi sổ (POSTED)
      ('tx-001', 'NK-2024-0001', 'PURCHASE_RECEIPT', 'PNK-001', '${d(10)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'POSTED', 0.95, 0.05, NULL, '${d(10)}', '${d(10)}', '${d(10)}'),
      ('tx-002', 'NK-2024-0002', 'PURCHASE_RECEIPT', 'PNK-002', '${d(9)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'POSTED', 0.91, 0.10, NULL, '${d(9)}', '${d(9)}', '${d(9)}'),
      ('tx-003', 'XK-2024-0001', 'MATERIAL_ISSUE', 'PXK-001', '${d(8)}', 'demo-workshop-001', 'demo-wh-001', NULL, 'demo-staff-001', 'POSTED', 0.97, 0.02, NULL, '${d(8)}', '${d(8)}', '${d(8)}'),
      ('tx-004', 'NK-2024-0003', 'PURCHASE_RECEIPT', 'PNK-003', '${d(7)}', 'demo-workshop-002', NULL, 'demo-wh-003', 'demo-staff-001', 'POSTED', 0.88, 0.08, NULL, '${d(7)}', '${d(7)}', '${d(7)}'),
      ('tx-005', 'CK-2024-0001', 'TRANSFER_OUT', 'PCK-001', '${d(6)}', 'demo-workshop-001', 'demo-wh-001', 'demo-wh-002', 'demo-staff-001', 'POSTED', 0.93, 0.04, NULL, '${d(6)}', '${d(6)}', '${d(6)}'),
      ('tx-006', 'NK-2024-0006', 'PRODUCTION_RECEIPT', 'PTP-006', '${d(5)}', 'demo-workshop-003', NULL, 'demo-wh-004', 'demo-staff-001', 'EXPORT_READY', 0.96, 0.01, 'Sẵn sàng xuất kế toán', '${d(5)}', '${d(5)}', '${d(5)}'),
      ('tx-007', 'XK-2024-0007', 'SALES_ISSUE', 'PXK-007', '${d(4)}', 'demo-workshop-002', 'demo-wh-003', NULL, 'demo-staff-001', 'EXPORTED', 0.92, 0.03, 'Đã xuất CSV', '${d(4)}', '${d(4)}', '${d(4)}'),
      ('tx-008', 'NK-2024-0008', 'PURCHASE_RECEIPT', 'PNK-008', '${d(3)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'APPROVED', 0.89, 0.12, 'Đã duyệt chưa ghi sổ', '${d(3)}', '${d(3)}', NULL),
      ('tx-009', 'XK-2024-0009', 'MATERIAL_ISSUE', 'PXK-009', '${d(3)}', 'demo-workshop-001', 'demo-wh-001', NULL, 'demo-staff-001', 'REJECTED', 0.60, 0.15, 'Từ chối do sai đơn vị', '${d(3)}', '${d(3)}', NULL),
      -- Phiếu chờ duyệt (PENDING_REVIEW)
      ('tx-010', 'NK-2024-0010', 'PURCHASE_RECEIPT', 'PNK-010', '${d(2)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'PENDING_REVIEW', 0.89, 0.05, NULL, '${d(2)}', NULL, NULL),
      ('tx-011', 'XK-2024-0010', 'MATERIAL_ISSUE', 'PXK-010', '${d(1)}', 'demo-workshop-001', 'demo-wh-001', NULL, 'demo-staff-001', 'PENDING_REVIEW', 0.62, 0.78, 'Confidence thấp, nghi trùng PXK-001', '${d(1)}', NULL, NULL),
      ('tx-012', 'NK-2024-0011', 'PURCHASE_RECEIPT', 'PNK-011', '${d(1)}', 'demo-workshop-002', NULL, 'demo-wh-003', 'demo-staff-001', 'PENDING_REVIEW', 0.94, 0.02, NULL, '${d(1)}', NULL, NULL),
      ('tx-013', 'NK-2024-0013', 'OTHER_RECEIPT', 'PNT-013', '${d(1)}', 'demo-workshop-003', NULL, 'demo-wh-005', 'demo-staff-001', 'PENDING_REVIEW', 0.79, 0.10, NULL, '${d(1)}', NULL, NULL),
      -- Phiếu cần bổ sung (NEEDS_REVISION)
      ('tx-020', 'NK-2024-0020', 'PURCHASE_RECEIPT', 'PNK-020', '${d(3)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'NEEDS_REVISION', 0.65, 0.20, 'Yêu cầu chụp lại ảnh rõ hơn', '${d(3)}', NULL, NULL),
      -- Phiếu trùng (DUP-01) - cùng số phiếu, cùng ngày, cùng xưởng
      ('tx-030', 'NK-2024-0030', 'PURCHASE_RECEIPT', 'PNK-001', '${d(5)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'PENDING_REVIEW', 0.91, 0.95, 'CẢNH BÁO: Phiếu có thể trùng PNK-001', '${d(5)}', NULL, NULL),
      -- Phiếu gây âm kho (STOCK-01) - xuất vượt tồn
      ('tx-040', 'XK-2024-0040', 'MATERIAL_ISSUE', 'PXK-AM-KHO', '${d(1)}', 'demo-workshop-001', 'demo-wh-001', NULL, 'demo-staff-001', 'PENDING_REVIEW', 0.96, 0.05, 'CẢNH BÁO: Giao dịch có thể gây âm kho STOCK-01', '${d(1)}', NULL, NULL),
      -- Phiếu mới tạo (DRAFT)
      ('tx-050', 'NK-2024-0050', 'PURCHASE_RECEIPT', NULL, '${d(0)}', 'demo-workshop-001', NULL, 'demo-wh-001', 'demo-staff-001', 'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL);
  `)
  console.log('✅ Đã tạo 17 transactions demo')

  // ── Transaction Lines ────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO transaction_lines
      (id, transaction_id, line_number, raw_item_name, suggested_item_id, confirmed_item_id, extracted_unit, confirmed_unit, extracted_quantity, confirmed_quantity, item_confidence, unit_confidence, quantity_confidence, line_status, warning_codes)
    VALUES
      -- tx-001: Nhập Xi măng PCB40
      ('line-001-1', 'tx-001', 1, 'Xi mang PCB40', 'item-001', 'item-001', 'kg', 'kg', 2500, 2500, 0.96, 0.99, 0.98, 'OK', '[]'),
      ('line-001-2', 'tx-001', 2, 'Cat vang', 'item-004', 'item-004', 'kg', 'kg', 5000, 5000, 0.95, 0.99, 0.97, 'OK', '[]'),
      -- tx-002: Nhập Thép
      ('line-002-1', 'tx-002', 1, 'Thep phi 10', 'item-010', 'item-010', 'kg', 'kg', 1200, 1200, 0.93, 0.98, 0.95, 'OK', '[]'),
      ('line-002-2', 'tx-002', 2, 'Thep phi 12', 'item-011', 'item-011', 'kg', 'kg', 800, 800, 0.91, 0.97, 0.94, 'OK', '[]'),
      -- tx-003: Xuất NVL
      ('line-003-1', 'tx-003', 1, 'Xi mang 40', 'item-001', 'item-001', 'kg', 'kg', 1000, 1000, 0.94, 0.99, 0.98, 'OK', '[]'),
      ('line-003-2', 'tx-003', 2, 'Da 1x2', 'item-007', 'item-007', 'kg', 'kg', 3000, 3000, 0.97, 0.99, 0.99, 'OK', '[]'),
      -- tx-006: Sẵn sàng xuất
      ('line-006-1', 'tx-006', 1, 'Cọc bê tông D400', 'item-018', 'item-018', 'cái', 'cái', 50, 50, 0.98, 0.99, 0.99, 'OK', '[]'),
      -- tx-007: Đã xuất
      ('line-007-1', 'tx-007', 1, 'Thép D16', 'item-012', 'item-012', 'kg', 'kg', 600, 600, 0.94, 0.98, 0.96, 'OK', '[]'),
      -- tx-010: Phiếu pending - có dòng chưa xác định mã hàng
      ('line-010-1', 'tx-010', 1, 'Xi mang PCB40', 'item-001', 'item-001', 'kg', 'kg', 3000, 3000, 0.92, 0.95, 0.90, 'OK', '[]'),
      ('line-010-2', 'tx-010', 2, 'Hàng mới chưa có mã', NULL, NULL, 'cái', NULL, 50, NULL, 0.0, 0.5, 0.8, 'NEEDS_MAPPING', '["UNMAPPED_ITEM"]'),
      -- tx-011: Confidence thấp & Lỗi đơn vị
      ('line-011-1', 'tx-011', 1, 'Vat lieu mờ không rõ', NULL, NULL, '???', NULL, NULL, NULL, 0.45, 0.30, 0.20, 'LOW_CONFIDENCE', '["LOW_CONFIDENCE"]'),
      ('line-011-2', 'tx-011', 2, 'Phụ gia trương nở', 'item-031', 'item-031', 'bao', 'kg', 10, 10, 0.82, 0.40, 0.70, 'UNIT_MISMATCH', '["UNIT_MISMATCH"]'),
      -- tx-013: Dòng cảnh báo số lượng bất thường
      ('line-013-1', 'tx-013', 1, 'Dầu chống dính', 'item-024', 'item-024', 'lít', 'lít', 5000, 5000, 0.85, 0.90, 0.55, 'QUANTITY_ABNORMAL', '["QUANTITY_ABNORMAL"]'),
      -- tx-040: Phiếu gây âm kho
      ('line-040-1', 'tx-040', 1, 'Xi mang PCB40', 'item-001', 'item-001', 'kg', 'kg', 99999, NULL, 0.96, 0.99, 0.98, 'OK', '["NEGATIVE_STOCK"]');
  `)
  console.log('✅ Đã tạo transaction lines demo')

  // ── AI Extractions ───────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO ai_extractions
      (id, transaction_id, provider, model, prompt_version, raw_response, parsed_response, processing_time_ms, error_message)
    VALUES
      ('ai-001', 'tx-001', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PNK-001"}', 1420, NULL),
      ('ai-002', 'tx-002', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PNK-002"}', 1850, NULL),
      ('ai-003', 'tx-003', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PXK-001"}', 1100, NULL),
      ('ai-006', 'tx-006', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PTP-006"}', 1650, NULL),
      ('ai-007', 'tx-007', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PXK-007"}', 1300, NULL),
      ('ai-010', 'tx-010', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PNK-010"}', 2900, NULL),
      ('ai-011', 'tx-011', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"partial"}', '{"documentNumber":"PXK-010"}', 4500, 'Hình ảnh mờ, confidence thấp'),
      ('ai-012', 'tx-012', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PNK-011"}', 1780, NULL),
      ('ai-020', 'tx-020', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"error"}', NULL, 3200, 'Không thể đọc được bảng số lượng'),
      ('ai-030', 'tx-030', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PNK-001"}', 1600, NULL),
      ('ai-040', 'tx-040', 'GEMINI', 'gemini-2.5-flash', 'v1.2', '{"status":"success"}', '{"documentNumber":"PXK-AM-KHO"}', 1350, NULL);
  `)
  console.log('✅ Đã tạo ai extractions demo')

  // ── Inventory Ledger (tồn kho từ các phiếu đã posted) ─────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO inventory_ledger
      (id, transaction_id, transaction_line_id, workshop_id, warehouse_id, item_id, transaction_date, quantity_in, quantity_out, running_balance)
    VALUES
      -- Nhập Xi măng PCB40: +2500kg
      ('ledger-001', 'tx-001', 'line-001-1', 'demo-workshop-001', 'demo-wh-001', 'item-001', '${d(10)}', 2500, 0, 2500),
      -- Nhập Cát vàng: +5000kg
      ('ledger-002', 'tx-001', 'line-001-2', 'demo-workshop-001', 'demo-wh-001', 'item-004', '${d(10)}', 5000, 0, 5000),
      -- Nhập Thép D10: +1200kg
      ('ledger-003', 'tx-002', 'line-002-1', 'demo-workshop-001', 'demo-wh-001', 'item-010', '${d(9)}', 1200, 0, 1200),
      -- Nhập Thép D12: +800kg
      ('ledger-004', 'tx-002', 'line-002-2', 'demo-workshop-001', 'demo-wh-001', 'item-011', '${d(9)}', 800, 0, 800),
      -- Xuất Xi măng: -1000kg (tồn còn 1500)
      ('ledger-005', 'tx-003', 'line-003-1', 'demo-workshop-001', 'demo-wh-001', 'item-001', '${d(8)}', 0, 1000, 1500),
      -- Xuất Đá 1x2: -3000kg (tồn = 0, đây là âm → sẽ tạo trường hợp test)
      ('ledger-006', 'tx-003', 'line-003-2', 'demo-workshop-001', 'demo-wh-001', 'item-007', '${d(8)}', 0, 3000, -3000);
  `)
  console.log('✅ Đã tạo inventory ledger demo (bao gồm 1 trường hợp âm kho)')

  // ── Stocktake demo ──────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO stocktakes (id, code, workshop_id, warehouse_id, stocktake_date, status, created_by) VALUES
      ('kk-001', 'KK-2024-001', 'demo-workshop-001', 'demo-wh-001', '${d(5)}', 'PENDING_CONFIRMATION', 'demo-manager-001');

    INSERT OR IGNORE INTO stocktake_lines (id, stocktake_id, item_id, raw_item_name, book_quantity, counted_quantity, difference_quantity, difference_percentage, status) VALUES
      ('kk-001-l1', 'kk-001', 'item-001', 'Xi măng PCB40', 1500, 1350, -150, -10.0, 'SHORTAGE'),
      ('kk-001-l2', 'kk-001', 'item-004', 'Cát vàng', 5000, 5200, 200, 4.0, 'SURPLUS'),
      ('kk-001-l3', 'kk-001', 'item-010', 'Thép D10', 1200, 1200, 0, 0.0, 'MATCH'),
      ('kk-001-l4', 'kk-001', 'item-011', 'Thép D12', 800, 780, -20, -2.5, 'SHORTAGE'),
      ('kk-001-l5', 'kk-001', NULL, 'Vật liệu không xác định', 0, 100, 100, 100.0, 'UNIDENTIFIED');
  `)
  console.log('✅ Đã tạo stocktake demo (có chênh lệch)')

  // ── System Settings ─────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO system_settings (id, setting_key, setting_value) VALUES
      ('ss-001', 'confidence.autoConfirm', '0.92'),
      ('ss-002', 'confidence.manualReview', '0.75'),
      ('ss-003', 'upload.maxSizeMb', '20'),
      ('ss-004', 'ai.model', '"gemini-3.5-flash"'),
      ('ss-005', 'inventory.allowNegative', 'false'),
      ('ss-006', 'qty.anomalyMultiplier', '3'),
      ('ss-007', 'duplicate.lookbackDays', '30');
  `)
  console.log('✅ Đã tạo system settings mặc định')

  // ── Audit logs demo ─────────────────────────────────────────────────────────
  await db.executeMultiple(`
    INSERT OR IGNORE INTO audit_logs (id, entity_type, entity_id, action, user_id, after_data) VALUES
      ('audit-001', 'TRANSACTION', 'tx-001', 'CREATE', 'demo-staff-001', '{"status":"DRAFT"}'),
      ('audit-002', 'TRANSACTION', 'tx-001', 'STATUS_CHANGE', 'demo-staff-001', '{"fromStatus":"DRAFT","toStatus":"PENDING_REVIEW"}'),
      ('audit-003', 'TRANSACTION', 'tx-001', 'APPROVE', 'demo-accountant-001', '{"fromStatus":"PENDING_REVIEW","toStatus":"APPROVED"}'),
      ('audit-004', 'TRANSACTION', 'tx-001', 'POST', 'demo-accountant-001', '{"fromStatus":"APPROVED","toStatus":"POSTED"}');
  `)
  console.log('✅ Đã tạo audit logs demo')

  console.log('\n🎉 Seed hoàn thành!')
  console.log('📊 Tóm tắt dữ liệu demo:')
  console.log('   - 6 tài khoản người dùng')
  console.log('   - 3 xưởng')
  console.log('   - 5 kho')
  console.log('   - 32 mã hàng')
  console.log('   - 17 alias')
  console.log('   - 12 phiếu giao dịch (bao gồm: pending, posted, trùng, âm kho)')
  console.log('   - 1 đợt kiểm kê (có chênh lệch)')
  console.log(`\n💡 Database: ${dbPath}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed thất bại:', err)
    process.exit(1)
  })
