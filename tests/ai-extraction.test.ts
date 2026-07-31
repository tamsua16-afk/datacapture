import { describe, it, expect, beforeEach } from 'vitest'
import { MockExtractionProvider } from '@/lib/ai/mockProvider'
import { parseAndValidateAIResponse } from '@/lib/ai/schemas'
import { processExtractedLine, matchItemMasterData, processAIForTransaction } from '@/lib/ai/extractionService'
import { saveDraftTransaction, confirmExtractedTransaction } from '@/lib/services/transactions'
import { LineStatus, WarningCode } from '@/types/enums'

describe('Milestone 4: AI Extraction Unit Tests', () => {
  const mockUserId = 'demo-staff-001'
  const mockWorkshopId = 'demo-workshop-001'
  let mockProvider: MockExtractionProvider

  beforeEach(() => {
    mockProvider = new MockExtractionProvider()
  })

  // 1. JSON hợp lệ
  describe('1. Kiểm tra JSON hợp lệ & Schema Validation', () => {
    it('Xử lý và validate thành công JSON AI chuẩn đúng schema dự án', async () => {
      const result = await mockProvider.extractFromImage({
        documentType: 'RECEIPT',
        testMode: 'VALID',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.documentType).toBe('RECEIPT')
      expect(result.data?.lines.length).toBeGreaterThan(0)
      expect(result.data?.overallConfidence).toBeGreaterThan(0)
      expect(result.isValidationError).toBe(false)
    })

    it('Trích xuất thành công cho cả 4 loại chứng từ: Nhập, Xuất, Chuyển kho, Kiểm kê', async () => {
      const receiptRes = await mockProvider.extractFromImage({ documentType: 'RECEIPT' })
      expect(receiptRes.data?.documentType).toBe('RECEIPT')

      const issueRes = await mockProvider.extractFromImage({ documentType: 'ISSUE' })
      expect(issueRes.data?.documentType).toBe('ISSUE')

      const transferRes = await mockProvider.extractFromImage({ documentType: 'TRANSFER' })
      expect(transferRes.data?.documentType).toBe('TRANSFER')

      const stocktakeRes = await mockProvider.extractFromImage({ documentType: 'STOCKTAKE' })
      expect(stocktakeRes.data?.documentType).toBe('STOCKTAKE')
    })
  })

  // 2. JSON thiếu trường
  describe('2. Kiểm tra JSON thiếu trường dữ liệu bắt buộc', () => {
    it('Phát hiện lỗi Zod Validation khi JSON trả về thiếu trường bắt buộc', async () => {
      const result = await mockProvider.extractFromImage({
        testMode: 'MISSING_FIELDS',
      })

      expect(result.success).toBe(false)
      expect(result.isValidationError).toBe(true)
      expect(result.errorMessage).toContain('JSON Validation Error')
    })
  })

  // 3. AI trả text không phải JSON
  describe('3. AI trả về văn bản thường không phải JSON', () => {
    it('Xử lý an toàn khi AI trả về plain text thay vì JSON hợp lệ, không gây crash ứng dụng', async () => {
      const result = await mockProvider.extractFromImage({
        testMode: 'NON_JSON',
      })

      expect(result.success).toBe(false)
      expect(result.isValidationError).toBe(true)
      expect(result.errorMessage).toContain('JSON Syntax Error')
      expect(result.rawResponse).toBeDefined()
    })

    it('Hàm parseAndValidateAIResponse không ném exception với input hư hỏng', () => {
      const invalidOutput = parseAndValidateAIResponse('Server 500 Error: Failed to generate response')
      expect(invalidOutput.success).toBe(false)
      expect(invalidOutput.isValidationError).toBe(true)
      expect(invalidOutput.error).toContain('JSON Syntax Error')
    })
  })

  // 4. API Timeout
  describe('4. Xử lý API Timeout', () => {
    it('Báo lỗi timeout chính xác khi quá thời gian chờ (timeoutMs)', async () => {
      const result = await mockProvider.extractFromImage({
        testMode: 'TIMEOUT',
        timeoutMs: 100,
      })

      expect(result.success).toBe(false)
      expect(result.isValidationError).toBe(false)
      expect(result.errorMessage).toContain('timed out')
    })
  })

  // 5. Không tìm thấy mã hàng & Rule Không tự tạo mã hàng
  describe('5. Không tìm thấy mã hàng & Nguyên tắc không tự tạo mã hàng mới', () => {
    it('Không tự tạo mã hàng trong DB và trả suggestedItemId = null, cảnh báo ITEM-01', async () => {
      const unmappedItemName = 'Sơn Chống Thấm Siêu Cấp X999 Unregistered'

      // Kiểm tra ghép nối Master Data
      const matchResult = await matchItemMasterData(unmappedItemName)
      expect(matchResult.itemId).toBeNull()

      // Kiểm tra xử lý dòng
      const processedLine = await processExtractedLine({
        lineNumber: 1,
        rawItemName: unmappedItemName,
        suggestedItemCode: null,
        unit: 'thùng',
        quantity: 20,
        batchNumber: null,
        confidence: { item: 0.85, unit: 0.9, quantity: 0.9 },
      })

      expect(processedLine.suggestedItemId).toBeNull()
      expect(processedLine.lineStatus).toBe(LineStatus.NEEDS_MAPPING)
      expect(processedLine.warningCodes).toContain(WarningCode.ITEM_01)
    })
  })

  // 6. Confidence thấp
  describe('6. Highlight trường confidence thấp', () => {
    it('Đánh dấu dòng là LOW_CONFIDENCE khi độ tin cậy < 0.75', async () => {
      const processedLine = await processExtractedLine({
        lineNumber: 1,
        rawItemName: 'Xi măng PCB40',
        suggestedItemCode: 'XM-PCB40',
        unit: 'bao',
        quantity: 50,
        batchNumber: null,
        confidence: { item: 0.5, unit: 0.6, quantity: 0.65 }, // Min confidence = 0.5 < 0.75
      })

      expect(processedLine.lineStatus).toBe(LineStatus.LOW_CONFIDENCE)
    })
  })

  // 7. Quantity bằng 0
  describe('7. Xử lý số lượng bằng 0 hoặc không hợp lệ', () => {
    it('Gán cảnh báo QTY-01 và trạng thái QUANTITY_INVALID khi quantity = 0', async () => {
      const processedLine = await processExtractedLine({
        lineNumber: 1,
        rawItemName: 'Xi măng PCB40',
        suggestedItemCode: 'XM-PCB40',
        unit: 'bao',
        quantity: 0,
        batchNumber: null,
        confidence: { item: 0.95, unit: 0.95, quantity: 0.95 },
      })

      expect(processedLine.lineStatus).toBe(LineStatus.QUANTITY_INVALID)
      expect(processedLine.warningCodes).toContain(WarningCode.QTY_01)
    })
  })

  // 8. Toàn trình lifecycle & Cho phép người dùng chỉnh sửa trước khi xác nhận
  describe('8. Luồng trạng thái DRAFT -> AI_PROCESSING -> AI_EXTRACTED -> USER_CONFIRMED', () => {
    it('Thực hiện quy trình AI Extraction từ phiếu DRAFT và xác nhận thành công', async () => {
      // 1. Tạo phiếu DRAFT
      const draft = await saveDraftTransaction({
        transactionType: 'PURCHASE_RECEIPT',
        workshopId: mockWorkshopId,
        documentNumber: 'HD-FULL-TEST',
        senderUserId: mockUserId,
      })

      expect(draft?.status).toBe('DRAFT')

      // 2. Chạy AI Extraction
      const processResult = await processAIForTransaction(draft!.id, {
        providerType: 'MOCK',
        documentType: 'RECEIPT',
      })

      expect(processResult.extractionResult.success).toBe(true)
      expect(processResult.lines.length).toBeGreaterThan(0)

      // 3. Người dùng xem & chỉnh sửa dòng trước khi xác nhận
      const confirmedTx = await confirmExtractedTransaction(
        draft!.id,
        [
          {
            lineId: draft!.lines?.[0]?.id || 'line-1',
            lineNumber: 1,
            confirmedItemId: 'item-001',
            confirmedUnit: 'bao',
            confirmedQuantity: 100,
          },
        ],
        'Đã kiểm tra và điều chỉnh mã hàng'
      )

      expect(confirmedTx?.status).toBe('USER_CONFIRMED')
      expect(confirmedTx?.notes).toContain('Đã kiểm tra')
    })
  })
})
