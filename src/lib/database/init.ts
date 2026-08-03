/**
 * Database initializer – chạy khi server khởi động lần đầu.
 * Tự động tạo schema và seed dữ liệu demo từ demo.ts nếu DB chưa tồn tại.
 */

import { getRawClient } from './client'
import {
  DEMO_USERS,
  DEMO_WORKSHOPS,
  DEMO_WAREHOUSES,
  DEMO_ITEMS,
  DEMO_ITEM_ALIASES,
} from '@/config/demo'
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

    // ── Tạo toàn bộ schema ───────────────────────────────────────────────────
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
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS unit_conversions (
        id TEXT PRIMARY KEY,
        item_id TEXT,
        from_unit TEXT NOT NULL,
        to_unit TEXT NOT NULL,
        conversion_factor REAL NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        item_group TEXT NOT NULL DEFAULT 'OTHER',
        base_unit TEXT NOT NULL DEFAULT 'cái',
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_id, normalized_alias)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        workshop_id TEXT NOT NULL,
        source_warehouse_id TEXT,
        destination_warehouse_id TEXT,
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
        ai_model TEXT,
        ai_prompt_version TEXT,
        ai_raw_response TEXT,
        ai_processing_ms INTEGER,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        rejection_reason TEXT,
        is_draft INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transaction_lines (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        raw_item_name TEXT,
        suggested_item_id TEXT,
        confirmed_item_id TEXT,
        raw_quantity REAL,
        confirmed_quantity REAL,
        raw_unit TEXT,
        confirmed_unit TEXT,
        unit_price REAL,
        total_amount REAL,
        line_confidence REAL,
        line_status TEXT NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        transaction_id TEXT,
        stocktake_id TEXT,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        file_hash TEXT,
        signed_url TEXT,
        signed_url_expires_at TEXT,
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
        raw_item_name TEXT,
        item_id TEXT,
        book_quantity REAL,
        counted_quantity REAL,
        difference REAL,
        difference_pct REAL,
        line_status TEXT NOT NULL DEFAULT 'UNMAPPED',
        explanation TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

      PRAGMA foreign_keys = ON;
    `)

    // ── Seed Workshops ───────────────────────────────────────────────────────
    for (const ws of DEMO_WORKSHOPS) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO workshops (id, code, name, address, manager_name, is_active)
              VALUES (?, ?, ?, ?, ?, 1)`,
        args: [ws.id, ws.code, ws.name, ws.address ?? null, ws.managerName ?? null],
      })
    }
    console.log(`[DB] ✅ Seeded ${DEMO_WORKSHOPS.length} xưởng`)

    // ── Seed Warehouses ──────────────────────────────────────────────────────
    for (const wh of DEMO_WAREHOUSES) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO warehouses (id, workshop_id, code, name, warehouse_type, is_active)
              VALUES (?, ?, ?, ?, ?, 1)`,
        args: [wh.id, wh.workshopId, wh.code, wh.name, wh.warehouseType],
      })
    }
    console.log(`[DB] ✅ Seeded ${DEMO_WAREHOUSES.length} kho`)

    // ── Seed Users (với bcrypt hash) ─────────────────────────────────────────
    const bcrypt = await import('bcryptjs')
    for (const user of DEMO_USERS) {
      const hash = await bcrypt.hash(user.password, 10)
      await client.execute({
        sql: `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, workshop_id, is_active)
              VALUES (?, ?, ?, ?, ?, ?, 1)`,
        args: [user.id, user.email, hash, user.fullName, user.role, user.workshopId],
      })
    }
    console.log(`[DB] ✅ Seeded ${DEMO_USERS.length} tài khoản demo`)

    // ── Seed Items ───────────────────────────────────────────────────────────
    for (const item of DEMO_ITEMS) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO items (id, code, name, item_group, base_unit, minimum_stock, is_active)
              VALUES (?, ?, ?, ?, ?, ?, 1)`,
        args: [item.id, item.code, item.name, item.itemGroup, item.baseUnit, item.minimumStock],
      })
    }
    console.log(`[DB] ✅ Seeded ${DEMO_ITEMS.length} mã hàng`)

    // ── Seed Item Aliases ────────────────────────────────────────────────────
    const itemCodeToId = new Map(DEMO_ITEMS.map((i) => [i.code, i.id]))
    let aliasCount = 0
    for (const a of DEMO_ITEM_ALIASES) {
      const itemId = itemCodeToId.get(a.itemCode)
      if (!itemId) continue
      const normalized = a.alias.toLowerCase().replace(/[àáạảãăắặẳẵằâấậẩẫ]/g, 'a')
        .replace(/[èéẹẻẽêếệểễề]/g, 'e').replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôốộổỗồơớợởỡờ]/g, 'o').replace(/[ùúụủũưứựửữừ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()
      const id = `alias-init-${itemId}-${aliasCount++}`
      await client.execute({
        sql: `INSERT OR IGNORE INTO item_aliases (id, item_id, workshop_id, alias, normalized_alias)
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, itemId, a.workshopId ?? null, a.alias, normalized],
      })
    }
    console.log(`[DB] ✅ Seeded ${aliasCount} alias hàng hóa`)

    _initialized = true
    console.log('[DB] 🎉 Khởi tạo database demo hoàn tất!')
  } catch (err) {
    console.error('[DB] ❌ Lỗi khởi tạo database:', err)
    _initialized = true // Cho app tiếp tục, tránh crash loop
  }
}
