import { getRawClient } from '@/lib/database/client'
import { normalizeAlias } from '@/lib/utils/normalize'
import {
  DEFAULT_CONFIDENCE_MANUAL_REVIEW,
  IS_MOCK_AI,
  AI_PROMPT_VERSION,
} from '@/config/constants'
import { LineStatus, WarningCode, TransactionStatus, AIProvider } from '@/types/enums'
import type { AIExtractedLine } from '@/types/models'
import type { AIExtractionProvider, AIExtractionOptions } from './types'
import { MockExtractionProvider } from './mockProvider'
import { GeminiExtractionProvider } from './geminiProvider'

/**
 * Lấy AI Provider tương ứng theo cấu hình hoặc tham số
 */
export function getExtractionProvider(providerType?: AIProvider): AIExtractionProvider {
  if (providerType === 'GEMINI' || (!IS_MOCK_AI && process.env.MOCK_AI !== 'true' && process.env.GEMINI_API_KEY)) {
    return new GeminiExtractionProvider()
  }
  return new MockExtractionProvider()
}

/**
 * Tìm mã hàng phù hợp trong danh mục `items` và `item_aliases`
 * RULE BẮT BUỘC: Không tự tạo mã hàng mới!
 */
export async function matchItemMasterData(rawItemName: string): Promise<{
  itemId: string | null
  confidence: number
  matchedAlias?: string
}> {
  if (!rawItemName) return { itemId: null, confidence: 0 }

  const client = getRawClient()
  const normalizedRaw = normalizeAlias(rawItemName)

  // 1. Tìm chính xác theo mã hàng (code) hoặc tên hàng (name)
  const exactItemRes = await client.execute({
    sql: `
      SELECT id, code, name FROM items
      WHERE is_active = 1 AND (LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?))
      LIMIT 1
    `,
    args: [rawItemName.trim(), rawItemName.trim()],
  })

  if (exactItemRes.rows.length > 0) {
    const item = exactItemRes.rows[0] as any
    return { itemId: item.id as string, confidence: 0.98 }
  }

  // 2. Tìm theo Alias đã được chuẩn hóa trong `item_aliases`
  const aliasRes = await client.execute({
    sql: `
      SELECT a.item_id, a.alias, i.is_active
      FROM item_aliases a
      JOIN items i ON a.item_id = i.id
      WHERE i.is_active = 1 AND a.normalized_alias = ?
      ORDER BY a.confirmed_count DESC
      LIMIT 1
    `,
    args: [normalizedRaw],
  })

  if (aliasRes.rows.length > 0) {
    const aliasMatch = aliasRes.rows[0] as any
    return {
      itemId: aliasMatch.item_id as string,
      confidence: 0.92,
      matchedAlias: aliasMatch.alias as string,
    }
  }

  // 3. Tìm tương đối qua Alias (LIKE %norm%)
  const fuzzyAliasRes = await client.execute({
    sql: `
      SELECT a.item_id, a.alias, i.is_active
      FROM item_aliases a
      JOIN items i ON a.item_id = i.id
      WHERE i.is_active = 1 AND (a.normalized_alias LIKE ? OR LOWER(i.name) LIKE ?)
      ORDER BY a.confirmed_count DESC
      LIMIT 1
    `,
    args: [`%${normalizedRaw}%`, `%${normalizedRaw}%`],
  })

  if (fuzzyAliasRes.rows.length > 0) {
    const fuzzyMatch = fuzzyAliasRes.rows[0] as any
    return {
      itemId: fuzzyMatch.item_id as string,
      confidence: 0.80,
      matchedAlias: fuzzyMatch.alias as string,
    }
  }

  // Không tìm thấy mã hàng -> Trả null (Không tự tạo mã hàng mới!)
  return { itemId: null, confidence: 0 }
}

/**
 * Phân tích và xử lý trạng thái + cảnh báo cho 1 dòng trích xuất AI
 */
export async function processExtractedLine(line: AIExtractedLine) {
  const warningCodes: WarningCode[] = []
  let lineStatus: LineStatus = LineStatus.OK

  // 1. Kiểm tra / gợi ý mã hàng
  const itemMatch = await matchItemMasterData(line.suggestedItemCode || line.rawItemName)
  const suggestedItemId = itemMatch.itemId
  const itemConfidence = line.confidence.item ?? itemMatch.confidence

  if (!suggestedItemId) {
    warningCodes.push(WarningCode.ITEM_01)
    lineStatus = LineStatus.NEEDS_MAPPING
  }

  // 2. Kiểm tra số lượng
  const quantity = line.quantity
  const quantityConfidence = line.confidence.quantity ?? 0.9

  if (quantity === null || quantity === undefined || quantity <= 0) {
    warningCodes.push(WarningCode.QTY_01)
    lineStatus = LineStatus.QUANTITY_INVALID
  }

  // 3. Highlight trường confidence thấp (< 0.75)
  const unitConfidence = line.confidence.unit ?? 0.9
  const minConfidence = Math.min(itemConfidence, unitConfidence, quantityConfidence)

  if (minConfidence < DEFAULT_CONFIDENCE_MANUAL_REVIEW && (lineStatus === LineStatus.OK || lineStatus === LineStatus.NEEDS_MAPPING)) {
    lineStatus = LineStatus.LOW_CONFIDENCE
  }

  return {
    lineNumber: line.lineNumber,
    rawItemName: line.rawItemName,
    suggestedItemId,
    extractedUnit: line.unit || null,
    confirmedUnit: line.unit || null,
    extractedQuantity: line.quantity !== undefined ? line.quantity : null,
    confirmedQuantity: line.quantity !== undefined ? line.quantity : null,
    batchNumber: line.batchNumber || null,
    itemConfidence,
    unitConfidence,
    quantityConfidence,
    lineStatus,
    warningCodes,
  }
}

/**
 * Thực thi quy trình AI Extraction toàn diện cho một phiếu giao dịch
 */
export async function processAIForTransaction(
  transactionId: string,
  options?: AIExtractionOptions & { providerType?: AIProvider }
) {
  const client = getRawClient()

  // 1. Cập nhật trạng thái phiếu -> AI_PROCESSING
  await client.execute({
    sql: `UPDATE transactions SET status = 'AI_PROCESSING', submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    args: [transactionId],
  })

  // 2. Khởi tạo Provider & Thực thi Trích xuất
  const provider = getExtractionProvider(options?.providerType)
  const extractionResult = await provider.extractFromImage({
    ...options,
    promptVersion: options?.promptVersion || AI_PROMPT_VERSION,
  })

  // 3. Lưu lịch sử trích xuất vào bảng `ai_extractions`
  const extractionId = `aiex-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  await client.execute({
    sql: `
      INSERT INTO ai_extractions (
        id, transaction_id, provider, model, prompt_version,
        raw_response, parsed_response, processing_time_ms, token_usage, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    args: [
      extractionId,
      transactionId,
      extractionResult.provider,
      extractionResult.model,
      extractionResult.promptVersion,
      JSON.stringify(extractionResult.rawResponse || {}),
      extractionResult.data ? JSON.stringify(extractionResult.data) : null,
      extractionResult.processingTimeMs,
      extractionResult.tokenUsage ? JSON.stringify(extractionResult.tokenUsage) : null,
      extractionResult.errorMessage || null,
    ],
  })

  // 4. Xử lý trường hợp thất bại
  if (!extractionResult.success || !extractionResult.data) {
    // Giữ nguyên hoặc xử lý lỗi phiếu
    throw new Error(`AI Extraction failed: ${extractionResult.errorMessage}`)
  }

  // 5. Xử lý từng dòng kết quả AI & gợi ý mã hàng
  const extractedData = extractionResult.data
  const processedLines = []

  for (const line of extractedData.lines) {
    const processed = await processExtractedLine(line)
    processedLines.push(processed)
  }

  // 6. Xóa dòng cũ và lưu các dòng mới vào DB `transaction_lines`
  await client.execute({
    sql: `DELETE FROM transaction_lines WHERE transaction_id = ?`,
    args: [transactionId],
  })

  for (const line of processedLines) {
    const lineId = `line-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    await client.execute({
      sql: `
        INSERT INTO transaction_lines (
          id, transaction_id, line_number, raw_item_name, suggested_item_id, confirmed_item_id,
          extracted_unit, confirmed_unit, extracted_quantity, confirmed_quantity, batch_number,
          item_confidence, unit_confidence, quantity_confidence, line_status, warning_codes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      args: [
        lineId,
        transactionId,
        line.lineNumber,
        line.rawItemName,
        line.suggestedItemId,
        line.suggestedItemId, // ban đầu confirmed_item_id = suggested_item_id nếu có
        line.extractedUnit,
        line.confirmedUnit,
        line.extractedQuantity,
        line.confirmedQuantity,
        line.batchNumber,
        line.itemConfidence,
        line.unitConfidence,
        line.quantityConfidence,
        line.lineStatus,
        JSON.stringify(line.warningCodes),
      ],
    })
  }

  // 7. Cập nhật trạng thái phiếu -> AI_EXTRACTED
  await client.execute({
    sql: `
      UPDATE transactions
      SET status = 'AI_EXTRACTED',
          overall_confidence = ?,
          document_number = COALESCE(?, document_number),
          updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [extractedData.overallConfidence, extractedData.documentNumber || null, transactionId],
  })

  return {
    extractionId,
    extractionResult,
    lines: processedLines,
  }
}
