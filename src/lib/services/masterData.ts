/**
 * Service xử lý Master Data cho Xưởng Data Capture.
 * Quản lý: Xưởng, Kho, Hàng hóa, Alias, Đơn vị tính, Quy đổi đơn vị, Cảnh báo tồn kho, CSV Import/Export & Quick Search.
 */

import { getRawClient } from '@/lib/database/client'
import { normalizeAlias } from '@/lib/utils/normalize'
import Papa from 'papaparse'

// Interface cho kết quả CSV Import
export interface CsvImportResult {
  importedCount: number
  errors: string[]
}

// ─── WORKSHOPS ───────────────────────────────────────────────────────────────

export async function getWorkshops() {
  const client = getRawClient()
  const result = await client.execute(`
    SELECT w.*, COUNT(wh.id) as warehouse_count
    FROM workshops w
    LEFT JOIN warehouses wh ON w.id = wh.workshop_id
    GROUP BY w.id
    ORDER BY w.code ASC
  `)

  return result.rows.map((row: any) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    address: (row.address as string) || null,
    managerName: (row.manager_name as string) || null,
    isActive: Boolean(row.is_active),
    warehouseCount: Number(row.warehouse_count || 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function createWorkshop(data: {
  code: string
  name: string
  address?: string | null
  managerName?: string | null
  isActive?: boolean
}) {
  const client = getRawClient()
  const codeClean = data.code.trim().toUpperCase()

  // Kiểm tra trùng mã xưởng
  const check = await client.execute({
    sql: 'SELECT id FROM workshops WHERE LOWER(code) = LOWER(?)',
    args: [codeClean],
  })
  if (check.rows.length > 0) {
    throw new Error(`Mã xưởng "${codeClean}" đã tồn tại trong hệ thống`)
  }

  const id = `ws-${Date.now()}`
  await client.execute({
    sql: `INSERT INTO workshops (id, code, name, address, manager_name, is_active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      codeClean,
      data.name.trim(),
      data.address?.trim() || null,
      data.managerName?.trim() || null,
      data.isActive ?? true ? 1 : 0,
    ],
  })

  return { id, code: codeClean, name: data.name }
}

export async function updateWorkshop(
  id: string,
  data: {
    code?: string
    name?: string
    address?: string | null
    managerName?: string | null
    isActive?: boolean
  }
) {
  const client = getRawClient()

  if (data.code) {
    const codeClean = data.code.trim().toUpperCase()
    const check = await client.execute({
      sql: 'SELECT id FROM workshops WHERE LOWER(code) = LOWER(?) AND id != ?',
      args: [codeClean, id],
    })
    if (check.rows.length > 0) {
      throw new Error(`Mã xưởng "${codeClean}" đã bị trùng với xưởng khác`)
    }
  }

  const existing = await client.execute({
    sql: 'SELECT * FROM workshops WHERE id = ?',
    args: [id],
  })
  if (existing.rows.length === 0) {
    throw new Error('Xưởng không tồn tại')
  }

  const current = existing.rows[0] as any
  const code = data.code ? data.code.trim().toUpperCase() : current.code
  const name = data.name ? data.name.trim() : current.name
  const address = data.address !== undefined ? (data.address?.trim() || null) : current.address
  const managerName = data.managerName !== undefined ? (data.managerName?.trim() || null) : current.manager_name
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active

  await client.execute({
    sql: `UPDATE workshops SET code = ?, name = ?, address = ?, manager_name = ?, is_active = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [code, name, address, managerName, isActive, id],
  })

  return { id, code, name, isActive: Boolean(isActive) }
}

export async function deleteWorkshop(id: string) {
  const client = getRawClient()

  // Kiểm tra phụ thuộc: kho, giao dịch, người dùng
  const whCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM warehouses WHERE workshop_id = ?',
    args: [id],
  })
  const txCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM transactions WHERE workshop_id = ?',
    args: [id],
  })
  const userCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM users WHERE workshop_id = ?',
    args: [id],
  })

  const whCount = Number((whCheck.rows[0] as any).cnt || 0)
  const txCount = Number((txCheck.rows[0] as any).cnt || 0)
  const userCount = Number((userCheck.rows[0] as any).cnt || 0)

  if (whCount > 0 || txCount > 0 || userCount > 0) {
    throw new Error(
      `Không thể xóa cứng Xưởng đã phát sinh dữ liệu (${whCount} kho, ${txCount} giao dịch, ${userCount} nhân sự). ` +
      `Hãy sử dụng tính năng khóa bằng Trạng thái (is_active = false).`
    )
  }

  await client.execute({
    sql: 'DELETE FROM workshops WHERE id = ?',
    args: [id],
  })

  return { success: true }
}

// ─── WAREHOUSES ──────────────────────────────────────────────────────────────

export async function getWarehouses(workshopId?: string) {
  const client = getRawClient()
  let sqlStr = `
    SELECT wh.*, w.name as workshop_name, w.code as workshop_code
    FROM warehouses wh
    JOIN workshops w ON wh.workshop_id = w.id
  `
  const args: any[] = []

  if (workshopId) {
    sqlStr += ' WHERE wh.workshop_id = ?'
    args.push(workshopId)
  }

  sqlStr += ' ORDER BY wh.code ASC'

  const result = await client.execute({ sql: sqlStr, args })

  return result.rows.map((row: any) => ({
    id: row.id as string,
    workshopId: row.workshop_id as string,
    workshopName: row.workshop_name as string,
    workshopCode: row.workshop_code as string,
    code: row.code as string,
    name: row.name as string,
    warehouseType: row.warehouse_type as string,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function createWarehouse(data: {
  workshopId: string
  code: string
  name: string
  warehouseType?: string
  isActive?: boolean
}) {
  const client = getRawClient()
  const codeClean = data.code.trim().toUpperCase()

  // Kiểm tra trùng mã kho
  const check = await client.execute({
    sql: 'SELECT id FROM warehouses WHERE LOWER(code) = LOWER(?)',
    args: [codeClean],
  })
  if (check.rows.length > 0) {
    throw new Error(`Mã kho "${codeClean}" đã tồn tại trong hệ thống`)
  }

  // Kiểm tra xưởng tồn tại
  const wsCheck = await client.execute({
    sql: 'SELECT id FROM workshops WHERE id = ?',
    args: [data.workshopId],
  })
  if (wsCheck.rows.length === 0) {
    throw new Error('Xưởng không tồn tại')
  }

  const id = `wh-${Date.now()}`
  await client.execute({
    sql: `INSERT INTO warehouses (id, workshop_id, code, name, warehouse_type, is_active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.workshopId,
      codeClean,
      data.name.trim(),
      data.warehouseType || 'GENERAL',
      data.isActive ?? true ? 1 : 0,
    ],
  })

  return { id, code: codeClean, name: data.name }
}

export async function updateWarehouse(
  id: string,
  data: {
    workshopId?: string
    code?: string
    name?: string
    warehouseType?: string
    isActive?: boolean
  }
) {
  const client = getRawClient()

  if (data.code) {
    const codeClean = data.code.trim().toUpperCase()
    const check = await client.execute({
      sql: 'SELECT id FROM warehouses WHERE LOWER(code) = LOWER(?) AND id != ?',
      args: [codeClean, id],
    })
    if (check.rows.length > 0) {
      throw new Error(`Mã kho "${codeClean}" đã bị trùng với kho khác`)
    }
  }

  const existing = await client.execute({
    sql: 'SELECT * FROM warehouses WHERE id = ?',
    args: [id],
  })
  if (existing.rows.length === 0) {
    throw new Error('Kho không tồn tại')
  }

  const current = existing.rows[0] as any
  const workshopId = data.workshopId || current.workshop_id
  const code = data.code ? data.code.trim().toUpperCase() : current.code
  const name = data.name ? data.name.trim() : current.name
  const warehouseType = data.warehouseType || current.warehouse_type
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active

  await client.execute({
    sql: `UPDATE warehouses SET workshop_id = ?, code = ?, name = ?, warehouse_type = ?, is_active = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [workshopId, code, name, warehouseType, isActive, id],
  })

  return { id, code, name, isActive: Boolean(isActive) }
}

export async function deleteWarehouse(id: string) {
  const client = getRawClient()

  const ledgerCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM inventory_ledger WHERE warehouse_id = ?',
    args: [id],
  })
  const txCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM transactions WHERE source_warehouse_id = ? OR destination_warehouse_id = ?',
    args: [id, id],
  })

  const ledgerCount = Number((ledgerCheck.rows[0] as any).cnt || 0)
  const txCount = Number((txCheck.rows[0] as any).cnt || 0)

  if (ledgerCount > 0 || txCount > 0) {
    throw new Error(
      `Không thể xóa cứng Kho đã phát sinh dữ liệu (${txCount} giao dịch, ${ledgerCount} dòng sổ tồn kho). ` +
      `Hãy khóa kho bằng Trạng thái (is_active = false).`
    )
  }

  await client.execute({
    sql: 'DELETE FROM warehouses WHERE id = ?',
    args: [id],
  })

  return { success: true }
}

// ─── ITEMS & ALIASES ─────────────────────────────────────────────────────────

export async function getItems(params?: {
  group?: string
  activeOnly?: boolean
  search?: string
}) {
  const client = getRawClient()

  let sqlStr = 'SELECT * FROM items WHERE 1=1'
  const args: any[] = []

  if (params?.group) {
    sqlStr += ' AND item_group = ?'
    args.push(params.group)
  }

  if (params?.activeOnly) {
    sqlStr += ' AND is_active = 1'
  }

  if (params?.search) {
    const qNorm = normalizeAlias(params.search)
    sqlStr += ` AND (LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR id IN (
      SELECT item_id FROM item_aliases WHERE normalized_alias LIKE ?
    ))`
    args.push(`%${qNorm}%`, `%${qNorm}%`, `%${qNorm}%`)
  }

  sqlStr += ' ORDER BY code ASC'

  const result = await client.execute({ sql: sqlStr, args })
  const itemsList = result.rows.map((row: any) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    itemGroup: row.item_group as string,
    baseUnit: row.base_unit as string,
    minimumStock: Number(row.minimum_stock || 0),
    maximumStock: row.maximum_stock !== null ? Number(row.maximum_stock) : null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    aliases: [] as string[],
  }))

  // Lấy alias kèm theo
  const aliasesResult = await client.execute('SELECT item_id, alias FROM item_aliases')
  const aliasMap = new Map<string, string[]>()
  for (const r of aliasesResult.rows as any[]) {
    const list = aliasMap.get(r.item_id) || []
    list.push(r.alias)
    aliasMap.set(r.item_id, list)
  }

  for (const item of itemsList) {
    item.aliases = aliasMap.get(item.id) || []
  }

  return itemsList
}

export async function createItem(
  data: {
    code: string
    name: string
    itemGroup?: string
    baseUnit: string
    minimumStock?: number
    maximumStock?: number | null
    isActive?: boolean
    aliases?: string[]
  },
  isAiGenerated = false
) {
  // RULE KHÔNG ĐƯỢC VI PHẠM #2: AI không được tự tạo mã hàng!
  if (isAiGenerated) {
    throw new Error('AI không được tự động tạo mã hàng mới. Vui lòng tạo thủ công bởi người dùng.')
  }

  const client = getRawClient()
  const codeClean = data.code.trim().toUpperCase()

  // Kiểm tra trùng mã hàng
  const check = await client.execute({
    sql: 'SELECT id FROM items WHERE LOWER(code) = LOWER(?)',
    args: [codeClean],
  })
  if (check.rows.length > 0) {
    throw new Error(`Mã hàng "${codeClean}" đã tồn tại trong hệ thống`)
  }

  const id = `item-${Date.now()}`
  await client.execute({
    sql: `INSERT INTO items (id, code, name, item_group, base_unit, minimum_stock, maximum_stock, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      codeClean,
      data.name.trim(),
      data.itemGroup || 'OTHER',
      data.baseUnit.trim().toLowerCase(),
      data.minimumStock ?? 0,
      data.maximumStock ?? null,
      data.isActive ?? true ? 1 : 0,
    ],
  })

  // Nếu có truyền aliases
  if (data.aliases && Array.isArray(data.aliases)) {
    for (const aliasStr of data.aliases) {
      const aliasClean = aliasStr.trim()
      if (aliasClean) {
        const norm = normalizeAlias(aliasClean)
        const aliasId = `alias-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        await client.execute({
          sql: `INSERT INTO item_aliases (id, item_id, alias, normalized_alias)
                VALUES (?, ?, ?, ?)`,
          args: [aliasId, id, aliasClean, norm],
        })
      }
    }
  }

  return { id, code: codeClean, name: data.name }
}

export async function updateItem(
  id: string,
  data: {
    code?: string
    name?: string
    itemGroup?: string
    baseUnit?: string
    minimumStock?: number
    maximumStock?: number | null
    isActive?: boolean
  }
) {
  const client = getRawClient()

  if (data.code) {
    const codeClean = data.code.trim().toUpperCase()
    const check = await client.execute({
      sql: 'SELECT id FROM items WHERE LOWER(code) = LOWER(?) AND id != ?',
      args: [codeClean, id],
    })
    if (check.rows.length > 0) {
      throw new Error(`Mã hàng "${codeClean}" đã bị trùng với mã hàng khác`)
    }
  }

  const existing = await client.execute({
    sql: 'SELECT * FROM items WHERE id = ?',
    args: [id],
  })
  if (existing.rows.length === 0) {
    throw new Error('Mã hàng không tồn tại')
  }

  const current = existing.rows[0] as any
  const code = data.code ? data.code.trim().toUpperCase() : current.code
  const name = data.name ? data.name.trim() : current.name
  const itemGroup = data.itemGroup || current.item_group
  const baseUnit = data.baseUnit ? data.baseUnit.trim().toLowerCase() : current.base_unit
  const minimumStock = data.minimumStock !== undefined ? data.minimumStock : current.minimum_stock
  const maximumStock = data.maximumStock !== undefined ? data.maximumStock : current.maximum_stock
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active

  await client.execute({
    sql: `UPDATE items
          SET code = ?, name = ?, item_group = ?, base_unit = ?, minimum_stock = ?, maximum_stock = ?, is_active = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [code, name, itemGroup, baseUnit, minimumStock, maximumStock, isActive, id],
  })

  return { id, code, name, isActive: Boolean(isActive) }
}

export async function deleteItem(id: string) {
  const client = getRawClient()

  const lineCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM transaction_lines WHERE confirmed_item_id = ? OR suggested_item_id = ?',
    args: [id, id],
  })
  const ledgerCheck = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM inventory_ledger WHERE item_id = ?',
    args: [id],
  })

  const lineCount = Number((lineCheck.rows[0] as any).cnt || 0)
  const ledgerCount = Number((ledgerCheck.rows[0] as any).cnt || 0)

  if (lineCount > 0 || ledgerCount > 0) {
    throw new Error(
      `Không thể xóa cứng Mã hàng đã xuất hiện trong giao dịch (${lineCount} chi tiết phiếu, ${ledgerCount} dòng sổ tồn). ` +
      `Hãy sử dụng tính năng khóa bằng Trạng thái (is_active = false).`
    )
  }

  // Xóa các alias liên quan trước
  await client.execute({
    sql: 'DELETE FROM item_aliases WHERE item_id = ?',
    args: [id],
  })

  await client.execute({
    sql: 'DELETE FROM items WHERE id = ?',
    args: [id],
  })

  return { success: true }
}

// ─── ITEM ALIASES SERVICE ────────────────────────────────────────────────────

export async function getItemAliases(itemId?: string) {
  const client = getRawClient()
  let sqlStr = `
    SELECT a.*, i.code as item_code, i.name as item_name
    FROM item_aliases a
    JOIN items i ON a.item_id = i.id
  `
  const args: any[] = []
  if (itemId) {
    sqlStr += ' WHERE a.item_id = ?'
    args.push(itemId)
  }
  sqlStr += ' ORDER BY a.alias ASC'

  const res = await client.execute({ sql: sqlStr, args })
  return res.rows.map((row: any) => ({
    id: row.id as string,
    itemId: row.item_id as string,
    itemCode: row.item_code as string,
    itemName: row.item_name as string,
    workshopId: (row.workshop_id as string) || null,
    alias: row.alias as string,
    normalizedAlias: row.normalized_alias as string,
    confirmedCount: Number(row.confirmed_count || 0),
    createdAt: row.created_at as string,
  }))
}

export async function createItemAlias(data: {
  itemId: string
  alias: string
  workshopId?: string | null
}) {
  const client = getRawClient()
  const aliasClean = data.alias.trim()
  if (!aliasClean) throw new Error('Alias không được để trống')

  const norm = normalizeAlias(aliasClean)

  // Kiểm tra đã có alias tương tự chưa
  const check = await client.execute({
    sql: 'SELECT id FROM item_aliases WHERE item_id = ? AND normalized_alias = ?',
    args: [data.itemId, norm],
  })
  if (check.rows.length > 0) {
    throw new Error(`Alias "${aliasClean}" đã tồn tại cho hàng hóa này`)
  }

  const id = `alias-${Date.now()}`
  await client.execute({
    sql: `INSERT INTO item_aliases (id, item_id, workshop_id, alias, normalized_alias)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, data.itemId, data.workshopId || null, aliasClean, norm],
  })

  return { id, itemId: data.itemId, alias: aliasClean, normalizedAlias: norm }
}

export async function deleteItemAlias(id: string) {
  const client = getRawClient()
  await client.execute({
    sql: 'DELETE FROM item_aliases WHERE id = ?',
    args: [id],
  })
  return { success: true }
}

// ─── UNITS & CONVERSIONS ─────────────────────────────────────────────────────

export async function getUnits() {
  const client = getRawClient()
  const res = await client.execute('SELECT * FROM units ORDER BY code ASC')
  return res.rows.map((row: any) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string) || null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
  }))
}

export async function createUnit(data: {
  code: string
  name: string
  description?: string | null
  isActive?: boolean
}) {
  const client = getRawClient()
  const codeClean = data.code.trim().toLowerCase()

  const check = await client.execute({
    sql: 'SELECT id FROM units WHERE LOWER(code) = LOWER(?)',
    args: [codeClean],
  })
  if (check.rows.length > 0) {
    throw new Error(`Đơn vị tính "${codeClean}" đã tồn tại trong hệ thống`)
  }

  const id = `unit-${Date.now()}`
  await client.execute({
    sql: `INSERT INTO units (id, code, name, description, is_active)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, codeClean, data.name.trim(), data.description?.trim() || null, data.isActive ?? true ? 1 : 0],
  })

  return { id, code: codeClean, name: data.name }
}

export async function getUnitConversions(itemId?: string) {
  const client = getRawClient()
  let sqlStr = `
    SELECT uc.*, i.code as item_code, i.name as item_name
    FROM unit_conversions uc
    LEFT JOIN items i ON uc.item_id = i.id
  `
  const args: any[] = []
  if (itemId) {
    sqlStr += ' WHERE uc.item_id = ?'
    args.push(itemId)
  }
  sqlStr += ' ORDER BY uc.from_unit ASC'

  const res = await client.execute({ sql: sqlStr, args })
  return res.rows.map((row: any) => ({
    id: row.id as string,
    itemId: (row.item_id as string) || null,
    itemCode: (row.item_code as string) || null,
    itemName: (row.item_name as string) || null,
    fromUnit: row.from_unit as string,
    toUnit: row.to_unit as string,
    conversionFactor: Number(row.conversion_factor),
    isActive: Boolean(row.is_active),
  }))
}

export async function createUnitConversion(data: {
  itemId?: string | null
  fromUnit: string
  toUnit: string
  conversionFactor: number
  isActive?: boolean
}) {
  const client = getRawClient()
  const fromClean = data.fromUnit.trim().toLowerCase()
  const toClean = data.toUnit.trim().toLowerCase()

  if (fromClean === toClean) {
    throw new Error('Đơn vị nguồn và đơn vị đích phải khác nhau')
  }
  if (data.conversionFactor <= 0) {
    throw new Error('Hệ số quy đổi phải lớn hơn 0')
  }

  const id = `conv-${Date.now()}`
  await client.execute({
    sql: `INSERT INTO unit_conversions (id, item_id, from_unit, to_unit, conversion_factor, is_active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, data.itemId || null, fromClean, toClean, data.conversionFactor, data.isActive ?? true ? 1 : 0],
  })

  return { id, fromUnit: fromClean, toUnit: toClean, conversionFactor: data.conversionFactor }
}

// ─── QUICK SEARCH ────────────────────────────────────────────────────────────

export async function quickSearchMasterData(query: string) {
  if (!query || query.trim().length === 0) {
    return { items: [], workshops: [], warehouses: [], units: [] }
  }

  const client = getRawClient()
  const qNorm = normalizeAlias(query)
  const qLike = `%${qNorm}%`

  // 1. Tìm hàng hóa
  const itemsRes = await client.execute({
    sql: `
      SELECT DISTINCT i.*
      FROM items i
      LEFT JOIN item_aliases a ON i.id = a.item_id
      WHERE LOWER(i.code) LIKE ?
         OR LOWER(i.name) LIKE ?
         OR a.normalized_alias LIKE ?
      LIMIT 15
    `,
    args: [qLike, qLike, qLike],
  })

  // 2. Tìm xưởng
  const workshopsRes = await client.execute({
    sql: `SELECT * FROM workshops WHERE LOWER(code) LIKE ? OR LOWER(name) LIKE ? LIMIT 10`,
    args: [qLike, qLike],
  })

  // 3. Tìm kho
  const warehousesRes = await client.execute({
    sql: `SELECT wh.*, w.name as workshop_name FROM warehouses wh JOIN workshops w ON wh.workshop_id = w.id WHERE LOWER(wh.code) LIKE ? OR LOWER(wh.name) LIKE ? LIMIT 10`,
    args: [qLike, qLike],
  })

  // 4. Tìm đơn vị tính
  const unitsRes = await client.execute({
    sql: `SELECT * FROM units WHERE LOWER(code) LIKE ? OR LOWER(name) LIKE ? LIMIT 10`,
    args: [qLike, qLike],
  })

  return {
    items: itemsRes.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      baseUnit: r.base_unit,
      minimumStock: Number(r.minimum_stock || 0),
      isActive: Boolean(r.is_active),
    })),
    workshops: workshopsRes.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: Boolean(r.is_active),
    })),
    warehouses: warehousesRes.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      workshopName: r.workshop_name,
      isActive: Boolean(r.is_active),
    })),
    units: unitsRes.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: Boolean(r.is_active),
    })),
  }
}

// ─── CSV IMPORT / EXPORT ─────────────────────────────────────────────────────

export async function exportItemsToCsv(): Promise<string> {
  const items = await getItems()
  const csvData = items.map((item) => ({
    'Mã hàng': item.code,
    'Tên hàng hóa': item.name,
    'Nhóm hàng': item.itemGroup,
    'Đơn vị cơ sở': item.baseUnit,
    'Tồn tối thiểu': item.minimumStock,
    'Tồn tối đa': item.maximumStock ?? '',
    'Alias (tên khác)': item.aliases.join('; '),
    'Trạng thái': item.isActive ? 'Hoạt động' : 'Đã khóa',
  }))

  return Papa.unparse(csvData, { header: true })
}

export async function importItemsFromCsv(csvContent: string): Promise<CsvImportResult> {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  })

  const errors: string[] = []
  let importedCount = 0

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach((e) => errors.push(`Lỗi định dạng CSV tại dòng ${e.row}: ${e.message}`))
  }

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i]
    const rowNum = i + 2 // Tính cả header row

    const code = row['Mã hàng'] || row['code'] || row['Code']
    const name = row['Tên hàng hóa'] || row['name'] || row['Name']
    const itemGroup = row['Nhóm hàng'] || row['itemGroup'] || 'OTHER'
    const baseUnit = row['Đơn vị cơ sở'] || row['baseUnit'] || 'kg'
    const minStockStr = row['Tồn tối thiểu'] || row['minimumStock'] || '0'
    const maxStockStr = row['Tồn tối đa'] || row['maximumStock'] || ''
    const aliasesStr = row['Alias (tên khác)'] || row['aliases'] || ''

    if (!code || !code.trim()) {
      errors.push(`Dòng ${rowNum}: Thiếu mã hàng`)
      continue
    }
    if (!name || !name.trim()) {
      errors.push(`Dòng ${rowNum}: Thiếu tên hàng hóa`)
      continue
    }

    const aliases = aliasesStr
      ? aliasesStr.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : []

    try {
      await createItem({
        code: code.trim(),
        name: name.trim(),
        itemGroup: itemGroup.trim().toUpperCase(),
        baseUnit: baseUnit.trim().toLowerCase(),
        minimumStock: parseFloat(minStockStr) || 0,
        maximumStock: maxStockStr.trim() ? parseFloat(maxStockStr) : null,
        isActive: true,
        aliases,
      })
      importedCount++
    } catch (err: any) {
      errors.push(`Dòng ${rowNum} (Mã: ${code}): ${err.message}`)
    }
  }

  return { importedCount, errors }
}
