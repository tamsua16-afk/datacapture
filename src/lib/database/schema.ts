/**
 * Drizzle ORM Schema – Xưởng Data Capture
 * Sử dụng PostgreSQL dialect (production).
 * Demo mode dùng better-sqlite3 với schema tương tự.
 * 19 bảng theo yêu cầu nghiệp vụ.
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ─── PostgreSQL Enums ─────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', [
  'WORKSHOP_STAFF',
  'WORKSHOP_MANAGER',
  'WAREHOUSE_ACCOUNTANT',
  'ACCOUNTING_MANAGER',
  'ADMIN',
  'VIEWER',
])

export const transactionStatusEnum = pgEnum('transaction_status', [
  'DRAFT', 'IMAGE_UPLOADED', 'AI_PROCESSING', 'AI_EXTRACTED',
  'USER_CONFIRMED', 'PENDING_REVIEW', 'NEEDS_REVISION',
  'APPROVED', 'REJECTED', 'POSTED', 'EXPORT_READY', 'EXPORTED', 'CANCELLED',
])

export const transactionTypeEnum = pgEnum('transaction_type', [
  'OPENING_BALANCE', 'PURCHASE_RECEIPT', 'OTHER_RECEIPT', 'PRODUCTION_RECEIPT',
  'MATERIAL_ISSUE', 'SALES_ISSUE', 'OTHER_ISSUE',
  'TRANSFER_OUT', 'TRANSFER_IN', 'STOCKTAKE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
])

export const warehouseTypeEnum = pgEnum('warehouse_type', [
  'RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOODS', 'TOOLS', 'GENERAL',
])

export const lineStatusEnum = pgEnum('line_status', [
  'OK', 'NEEDS_MAPPING', 'UNIT_MISMATCH', 'QUANTITY_INVALID',
  'QUANTITY_ABNORMAL', 'LOW_CONFIDENCE', 'MANUAL_OVERRIDE',
])

export const stocktakeStatusEnum = pgEnum('stocktake_status', [
  'DRAFT', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'CONFIRMED', 'ADJUSTED', 'CANCELLED',
])

export const stocktakeLineStatusEnum = pgEnum('stocktake_line_status', [
  'MATCH', 'SURPLUS', 'SHORTAGE', 'UNIDENTIFIED', 'EXPLAINED',
])

export const storageProviderEnum = pgEnum('storage_provider', ['SUPABASE', 'LOCAL'])
export const aiProviderEnum = pgEnum('ai_provider', ['GEMINI', 'MOCK'])
export const auditActionEnum = pgEnum('audit_action', [
  'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE',
  'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT', 'RETURN', 'POST',
])
export const itemGroupEnum = pgEnum('item_group', [
  'CEMENT', 'SAND', 'STONE', 'STEEL', 'ADDITIVE', 'FINISHED', 'OTHER',
])
export const snapshotSourceEnum = pgEnum('snapshot_source', [
  'SCHEDULED', 'MANUAL', 'PERIOD_CLOSE',
])

// ─── users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('WORKSHOP_STAFF'),
  workshopId: uuid('workshop_id'),
  isActive: boolean('is_active').notNull().default(true),
  passwordHash: varchar('password_hash', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('users_email_idx').on(t.email),
  index('users_workshop_idx').on(t.workshopId),
  index('users_role_idx').on(t.role),
])

// ─── workshops ────────────────────────────────────────────────────────────────
export const workshops = pgTable('workshops', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  managerName: varchar('manager_name', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('workshops_code_idx').on(t.code),
])

// ─── warehouses ───────────────────────────────────────────────────────────────
export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  workshopId: uuid('workshop_id').notNull().references(() => workshops.id),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  warehouseType: warehouseTypeEnum('warehouse_type').notNull().default('GENERAL'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('warehouses_workshop_idx').on(t.workshopId),
  uniqueIndex('warehouses_code_idx').on(t.code),
])

// ─── items ────────────────────────────────────────────────────────────────────
export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  itemGroup: itemGroupEnum('item_group').notNull().default('OTHER'),
  baseUnit: varchar('base_unit', { length: 50 }).notNull(),
  minimumStock: numeric('minimum_stock', { precision: 15, scale: 3 }).notNull().default('0'),
  maximumStock: numeric('maximum_stock', { precision: 15, scale: 3 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('items_code_idx').on(t.code),
  index('items_group_idx').on(t.itemGroup),
])

// ─── item_aliases ─────────────────────────────────────────────────────────────
export const itemAliases = pgTable('item_aliases', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => items.id),
  workshopId: uuid('workshop_id').references(() => workshops.id),
  alias: varchar('alias', { length: 255 }).notNull(),
  normalizedAlias: varchar('normalized_alias', { length: 255 }).notNull(),
  confirmedCount: integer('confirmed_count').notNull().default(0),
  lastConfirmedAt: timestamp('last_confirmed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('aliases_item_idx').on(t.itemId),
  index('aliases_normalized_idx').on(t.normalizedAlias),
  index('aliases_workshop_idx').on(t.workshopId),
])

// ─── units ────────────────────────────────────────────────────────────────────
export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('units_code_idx').on(t.code),
])

// ─── unit_conversions ──────────────────────────────────────────────────────────
export const unitConversions = pgTable('unit_conversions', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => items.id),
  fromUnit: varchar('from_unit', { length: 50 }).notNull(),
  toUnit: varchar('to_unit', { length: 50 }).notNull(),
  conversionFactor: numeric('conversion_factor', { precision: 15, scale: 6 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('unit_conv_item_idx').on(t.itemId),
  index('unit_conv_units_idx').on(t.fromUnit, t.toUnit),
])

// ─── transactions ─────────────────────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionCode: varchar('transaction_code', { length: 50 }).notNull().unique(),
  transactionType: transactionTypeEnum('transaction_type').notNull(),
  documentNumber: varchar('document_number', { length: 100 }),
  transactionDate: timestamp('transaction_date').notNull(),
  workshopId: uuid('workshop_id').notNull().references(() => workshops.id),
  sourceWarehouseId: uuid('source_warehouse_id').references(() => warehouses.id),
  destinationWarehouseId: uuid('destination_warehouse_id').references(() => warehouses.id),
  senderUserId: uuid('sender_user_id').notNull().references(() => users.id),
  reviewerUserId: uuid('reviewer_user_id').references(() => users.id),
  status: transactionStatusEnum('status').notNull().default('DRAFT'),
  overallConfidence: numeric('overall_confidence', { precision: 5, scale: 4 }),
  duplicateScore: numeric('duplicate_score', { precision: 5, scale: 4 }),
  notes: text('notes'),
  rejectionReason: text('rejection_reason'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('transactions_code_idx').on(t.transactionCode),
  index('transactions_workshop_idx').on(t.workshopId),
  index('transactions_status_idx').on(t.status),
  index('transactions_date_idx').on(t.transactionDate),
  index('transactions_type_idx').on(t.transactionType),
  index('transactions_sender_idx').on(t.senderUserId),
  // Composite index for DUP-01 rule
  index('transactions_dup_check_idx').on(
    t.workshopId, t.documentNumber, t.transactionDate, t.transactionType
  ),
])

// ─── transaction_lines ────────────────────────────────────────────────────────
export const transactionLines = pgTable('transaction_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  rawItemName: varchar('raw_item_name', { length: 500 }).notNull(),
  suggestedItemId: uuid('suggested_item_id').references(() => items.id),
  confirmedItemId: uuid('confirmed_item_id').references(() => items.id),
  extractedUnit: varchar('extracted_unit', { length: 50 }),
  confirmedUnit: varchar('confirmed_unit', { length: 50 }),
  extractedQuantity: numeric('extracted_quantity', { precision: 15, scale: 3 }),
  confirmedQuantity: numeric('confirmed_quantity', { precision: 15, scale: 3 }),
  batchNumber: varchar('batch_number', { length: 100 }),
  itemConfidence: numeric('item_confidence', { precision: 5, scale: 4 }).notNull().default('0'),
  unitConfidence: numeric('unit_confidence', { precision: 5, scale: 4 }).notNull().default('0'),
  quantityConfidence: numeric('quantity_confidence', { precision: 5, scale: 4 }).notNull().default('0'),
  lineStatus: lineStatusEnum('line_status').notNull().default('OK'),
  warningCodes: jsonb('warning_codes').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('lines_transaction_idx').on(t.transactionId),
  index('lines_confirmed_item_idx').on(t.confirmedItemId),
])

// ─── attachments ──────────────────────────────────────────────────────────────
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'restrict' }),
  storageProvider: storageProviderEnum('storage_provider').notNull().default('LOCAL'),
  storagePath: text('storage_path').notNull(),
  originalFilename: varchar('original_filename', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  imageWidth: integer('image_width'),
  imageHeight: integer('image_height'),
  pageNumber: integer('page_number').notNull().default(1),
  imageQualityScore: numeric('image_quality_score', { precision: 5, scale: 4 }),
  fileHash: varchar('file_hash', { length: 64 }).notNull(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('attachments_transaction_idx').on(t.transactionId),
  index('attachments_hash_idx').on(t.fileHash),
  index('attachments_uploader_idx').on(t.uploadedBy),
])

// ─── ai_extractions ───────────────────────────────────────────────────────────
export const aiExtractions = pgTable('ai_extractions', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  provider: aiProviderEnum('provider').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  promptVersion: varchar('prompt_version', { length: 20 }).notNull(),
  rawResponse: jsonb('raw_response').notNull(),
  parsedResponse: jsonb('parsed_response'),
  processingTimeMs: integer('processing_time_ms').notNull(),
  tokenUsage: jsonb('token_usage'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('ai_extractions_transaction_idx').on(t.transactionId),
])

// ─── approval_history ─────────────────────────────────────────────────────────
export const approvalHistory = pgTable('approval_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  action: auditActionEnum('action').notNull(),
  fromStatus: transactionStatusEnum('from_status').notNull(),
  toStatus: transactionStatusEnum('to_status').notNull(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  comment: text('comment'),
  snapshotBefore: jsonb('snapshot_before').notNull().default(sql`'{}'::jsonb`),
  snapshotAfter: jsonb('snapshot_after').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('approval_history_transaction_idx').on(t.transactionId),
  index('approval_history_actor_idx').on(t.actorUserId),
])

// ─── inventory_ledger ─────────────────────────────────────────────────────────
export const inventoryLedger = pgTable('inventory_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  transactionLineId: uuid('transaction_line_id').notNull().references(() => transactionLines.id),
  workshopId: uuid('workshop_id').notNull().references(() => workshops.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  itemId: uuid('item_id').notNull().references(() => items.id),
  transactionDate: timestamp('transaction_date').notNull(),
  quantityIn: numeric('quantity_in', { precision: 15, scale: 3 }).notNull().default('0'),
  quantityOut: numeric('quantity_out', { precision: 15, scale: 3 }).notNull().default('0'),
  runningBalance: numeric('running_balance', { precision: 15, scale: 3 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('ledger_warehouse_item_idx').on(t.warehouseId, t.itemId),
  index('ledger_date_idx').on(t.transactionDate),
  index('ledger_transaction_idx').on(t.transactionId),
])

// ─── inventory_snapshots ──────────────────────────────────────────────────────
export const inventorySnapshots = pgTable('inventory_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  snapshotDate: timestamp('snapshot_date').notNull(),
  workshopId: uuid('workshop_id').notNull().references(() => workshops.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  itemId: uuid('item_id').notNull().references(() => items.id),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  source: snapshotSourceEnum('source').notNull().default('SCHEDULED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('snapshots_date_warehouse_item_idx').on(t.snapshotDate, t.warehouseId, t.itemId),
])

// ─── inventory_periods ────────────────────────────────────────────────────────
export const inventoryPeriods = pgTable('inventory_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  workshopId: uuid('workshop_id').references(() => workshops.id),
  periodName: varchar('period_name', { length: 50 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isClosed: boolean('is_closed').notNull().default(false),
  closedBy: uuid('closed_by').references(() => users.id),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('periods_workshop_idx').on(t.workshopId),
])


// ─── stocktakes ───────────────────────────────────────────────────────────────
export const stocktakes = pgTable('stocktakes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  workshopId: uuid('workshop_id').notNull().references(() => workshops.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  stocktakeDate: timestamp('stocktake_date').notNull(),
  status: stocktakeStatusEnum('status').notNull().default('DRAFT'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('stocktakes_workshop_idx').on(t.workshopId),
  index('stocktakes_status_idx').on(t.status),
])

// ─── stocktake_lines ──────────────────────────────────────────────────────────
export const stocktakeLines = pgTable('stocktake_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  stocktakeId: uuid('stocktake_id').notNull().references(() => stocktakes.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').references(() => items.id),
  rawItemName: varchar('raw_item_name', { length: 500 }).notNull(),
  bookQuantity: numeric('book_quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  countedQuantity: numeric('counted_quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  differenceQuantity: numeric('difference_quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  differencePercentage: numeric('difference_percentage', { precision: 8, scale: 4 }).notNull().default('0'),
  status: stocktakeLineStatusEnum('status').notNull().default('UNIDENTIFIED'),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('stocktake_lines_stocktake_idx').on(t.stocktakeId),
])

// ─── audit_logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  action: auditActionEnum('action').notNull(),
  userId: uuid('user_id').references(() => users.id),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_entity_idx').on(t.entityType, t.entityId),
  index('audit_user_idx').on(t.userId),
  index('audit_action_idx').on(t.action),
  index('audit_created_idx').on(t.createdAt),
])

// ─── system_settings ──────────────────────────────────────────────────────────
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: jsonb('setting_value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
})

// ─── Relations ────────────────────────────────────────────────────────────────
export const workshopsRelations = relations(workshops, ({ many }) => ({
  warehouses: many(warehouses),
  users: many(users),
  transactions: many(transactions),
  stocktakes: many(stocktakes),
}))

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  workshop: one(workshops, { fields: [warehouses.workshopId], references: [workshops.id] }),
  ledgerEntries: many(inventoryLedger),
  stocktakes: many(stocktakes),
}))

export const itemsRelations = relations(items, ({ many }) => ({
  aliases: many(itemAliases),
  transactionLines: many(transactionLines),
  ledgerEntries: many(inventoryLedger),
  stocktakeLines: many(stocktakeLines),
}))

export const itemAliasesRelations = relations(itemAliases, ({ one }) => ({
  item: one(items, { fields: [itemAliases.itemId], references: [items.id] }),
  workshop: one(workshops, { fields: [itemAliases.workshopId], references: [workshops.id] }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  workshop: one(workshops, { fields: [users.workshopId], references: [workshops.id] }),
  sentTransactions: many(transactions),
  uploads: many(attachments),
  approvals: many(approvalHistory),
}))

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  workshop: one(workshops, { fields: [transactions.workshopId], references: [workshops.id] }),
  sourceWarehouse: one(warehouses, {
    fields: [transactions.sourceWarehouseId],
    references: [warehouses.id],
    relationName: 'sourceWarehouse',
  }),
  destinationWarehouse: one(warehouses, {
    fields: [transactions.destinationWarehouseId],
    references: [warehouses.id],
    relationName: 'destinationWarehouse',
  }),
  senderUser: one(users, { fields: [transactions.senderUserId], references: [users.id] }),
  reviewerUser: one(users, { fields: [transactions.reviewerUserId], references: [users.id] }),
  lines: many(transactionLines),
  attachments: many(attachments),
  aiExtractions: many(aiExtractions),
  approvalHistory: many(approvalHistory),
  ledgerEntries: many(inventoryLedger),
}))

export const transactionLinesRelations = relations(transactionLines, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionLines.transactionId],
    references: [transactions.id],
  }),
  suggestedItem: one(items, {
    fields: [transactionLines.suggestedItemId],
    references: [items.id],
    relationName: 'suggestedItem',
  }),
  confirmedItem: one(items, {
    fields: [transactionLines.confirmedItemId],
    references: [items.id],
    relationName: 'confirmedItem',
  }),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  transaction: one(transactions, { fields: [attachments.transactionId], references: [transactions.id] }),
  uploader: one(users, { fields: [attachments.uploadedBy], references: [users.id] }),
}))

export const approvalHistoryRelations = relations(approvalHistory, ({ one }) => ({
  transaction: one(transactions, { fields: [approvalHistory.transactionId], references: [transactions.id] }),
  actor: one(users, { fields: [approvalHistory.actorUserId], references: [users.id] }),
}))

export const inventoryLedgerRelations = relations(inventoryLedger, ({ one }) => ({
  transaction: one(transactions, { fields: [inventoryLedger.transactionId], references: [transactions.id] }),
  transactionLine: one(transactionLines, { fields: [inventoryLedger.transactionLineId], references: [transactionLines.id] }),
  workshop: one(workshops, { fields: [inventoryLedger.workshopId], references: [workshops.id] }),
  warehouse: one(warehouses, { fields: [inventoryLedger.warehouseId], references: [warehouses.id] }),
  item: one(items, { fields: [inventoryLedger.itemId], references: [items.id] }),
}))

export const stocktakesRelations = relations(stocktakes, ({ one, many }) => ({
  workshop: one(workshops, { fields: [stocktakes.workshopId], references: [workshops.id] }),
  warehouse: one(warehouses, { fields: [stocktakes.warehouseId], references: [warehouses.id] }),
  createdByUser: one(users, { fields: [stocktakes.createdBy], references: [users.id] }),
  confirmedByUser: one(users, { fields: [stocktakes.confirmedBy], references: [users.id] }),
  lines: many(stocktakeLines),
}))

export const stocktakeLinesRelations = relations(stocktakeLines, ({ one }) => ({
  stocktake: one(stocktakes, { fields: [stocktakeLines.stocktakeId], references: [stocktakes.id] }),
  item: one(items, { fields: [stocktakeLines.itemId], references: [items.id] }),
}))
