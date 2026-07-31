/**
 * Database initializer – chạy khi server khởi động.
 * Tự động tạo schema và seed dữ liệu demo nếu DB chưa tồn tại.
 */

import { getRawClient } from './client'
import path from 'path'
import fs from 'fs'

let _initialized = false

export async function ensureDbInitialized(): Promise<void> {
  if (_initialized) return

  const dataDir = path.join(process.cwd(), 'data')
  const dbPath = path.join(dataDir, 'xuong-data-capture.db')
  const isNewDb = !fs.existsSync(dbPath)

  if (!isNewDb) {
    _initialized = true
    return
  }

  console.log('[DB] Database chưa tồn tại – đang khởi tạo schema và dữ liệu demo...')

  try {
    const client = getRawClient()

    // ── Tạo schema ──────────────────────────────────────────────────────────
    await client.executeMultiple(`
      PRAGMA foreign_keys = OFF;
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'WORKSHOP_STAFF',
        workshop_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workshops (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        workshop_id TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS unit_conversions (
        id TEXT PRIMARY KEY,
        from_unit_id TEXT NOT NULL,
        to_unit_id TEXT NOT NULL,
        factor REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        category TEXT,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS item_aliases (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        alias TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        workshop_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        voucher_date TEXT,
        voucher_number TEXT,
        supplier_customer TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        reviewed_by TEXT,
        posted_by TEXT,
        ai_confidence REAL,
        ai_status TEXT,
        ai_error TEXT,
        risk_level TEXT DEFAULT 'LOW',
        rejection_reason TEXT,
        is_draft INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transaction_lines (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        item_id TEXT,
        raw_item_name TEXT,
        quantity REAL NOT NULL,
        unit_id TEXT,
        unit_price REAL,
        total_amount REAL,
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        transaction_id TEXT,
        stocktake_id TEXT,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        file_hash TEXT,
        uploaded_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS inventory_balances (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_id, warehouse_id)
      );

      CREATE TABLE IF NOT EXISTS inventory_ledger (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        transaction_line_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        direction INTEGER NOT NULL,
        quantity REAL NOT NULL,
        balance_after REAL NOT NULL,
        posted_at TEXT NOT NULL DEFAULT (datetime('now')),
        posted_by TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stocktake_sessions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        workshop_id TEXT NOT NULL,
        warehouse_id TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        stocktake_date TEXT NOT NULL,
        notes TEXT,
        created_by TEXT NOT NULL,
        confirmed_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS stocktake_lines (
        id TEXT PRIMARY KEY,
        stocktake_id TEXT NOT NULL,
        item_id TEXT,
        raw_item_name TEXT,
        book_quantity REAL,
        counted_quantity REAL,
        difference REAL,
        difference_pct REAL,
        status TEXT DEFAULT 'UNMAPPED',
        explanation TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT NOT NULL,
        before_data TEXT,
        after_data TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS period_locks (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        workshop_id TEXT NOT NULL,
        locked_by TEXT NOT NULL,
        locked_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(year, month, workshop_id)
      );

      PRAGMA foreign_keys = ON;
    `)

    // ── Seed dữ liệu demo tối thiểu ──────────────────────────────────────────
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash('demo123', 10)

    await client.executeMultiple(`
      INSERT OR IGNORE INTO workshops (id, code, name) VALUES
        ('ws-001', 'XS-A', 'Xưởng Sản Xuất A'),
        ('ws-002', 'XS-B', 'Xưởng Sản Xuất B'),
        ('ws-003', 'XD', 'Xưởng Đóng Gói');

      INSERT OR IGNORE INTO warehouses (id, code, name, workshop_id) VALUES
        ('wh-001', 'KHO-A1', 'Kho Nguyên Liệu A1', 'ws-001'),
        ('wh-002', 'KHO-A2', 'Kho Thành Phẩm A2', 'ws-001'),
        ('wh-003', 'KHO-B1', 'Kho Nguyên Liệu B1', 'ws-002'),
        ('wh-004', 'KHO-B2', 'Kho Thành Phẩm B2', 'ws-002'),
        ('wh-005', 'KHO-DG', 'Kho Đóng Gói', 'ws-003');

      INSERT OR IGNORE INTO units (id, code, name) VALUES
        ('unit-001', 'KG', 'Kilogram'),
        ('unit-002', 'CAI', 'Cái'),
        ('unit-003', 'HOP', 'Hộp'),
        ('unit-004', 'LIT', 'Lít'),
        ('unit-005', 'M', 'Mét');
    `)

    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, workshop_id) VALUES
        ('demo-admin-001', 'admin@demo.com', ?, 'Quản trị viên', 'ADMIN', NULL),
        ('demo-accountant-001', 'ketoan@demo.com', ?, 'Kế toán Nguyễn Thị B', 'ACCOUNTANT', NULL),
        ('demo-manager-001', 'truongphong@demo.com', ?, 'Trưởng phòng Lê Văn C', 'ACCOUNTING_MANAGER', NULL),
        ('demo-staff-001', 'nhanvien@demo.com', ?, 'Nhân viên Trần Văn A', 'WORKSHOP_STAFF', 'ws-001'),
        ('demo-viewer-001', 'xem@demo.com', ?, 'Người xem Phạm Thị D', 'VIEWER', NULL)`,
      args: [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash],
    })

    console.log('[DB] ✅ Khởi tạo database thành công!')
    _initialized = true
  } catch (err) {
    console.error('[DB] ❌ Lỗi khởi tạo database:', err)
    // Không throw – cho phép app tiếp tục chạy
    _initialized = true
  }
}
