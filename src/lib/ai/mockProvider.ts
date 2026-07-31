import type { AIExtractionProvider, AIExtractionOptions, AIExtractionResult } from './types'
import { parseAndValidateAIResponse } from './schemas'
import { AI_PROMPT_VERSION, GEMINI_MODEL } from '@/config/constants'
import type { DocumentType } from '@/types/enums'

export class MockExtractionProvider implements AIExtractionProvider {
  readonly providerName = 'MOCK' as const
  readonly modelName = 'mock-v1'

  async extractFromImage(options: AIExtractionOptions): Promise<AIExtractionResult> {
    const startTime = Date.now()
    const timeoutMs = options.timeoutMs ?? 10000

    // Simulating test modes
    if (options.testMode === 'TIMEOUT') {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs + 100))
      return {
        success: false,
        provider: this.providerName,
        model: this.modelName,
        promptVersion: options.promptVersion ?? AI_PROMPT_VERSION,
        processingTimeMs: Date.now() - startTime,
        errorMessage: `Request timed out after ${timeoutMs}ms`,
        isValidationError: false,
      }
    }

    if (options.testMode === 'NON_JSON') {
      const nonJsonText = 'Đây là văn bản phản hồi từ AI nhưng không phải định dạng JSON hợp lệ.'
      const validated = parseAndValidateAIResponse(nonJsonText)
      return {
        success: false,
        rawResponse: validated.rawResponse,
        provider: this.providerName,
        model: this.modelName,
        promptVersion: options.promptVersion ?? AI_PROMPT_VERSION,
        processingTimeMs: Date.now() - startTime,
        errorMessage: validated.error,
        isValidationError: true,
      }
    }

    if (options.testMode === 'MISSING_FIELDS') {
      // Missing overallConfidence and invalid lines structure
      const invalidJson = JSON.stringify({
        documentType: 'RECEIPT',
        documentNumber: 'PN-001',
        lines: [
          {
            lineNumber: 1,
            // missing rawItemName
          },
        ],
      })
      const validated = parseAndValidateAIResponse(invalidJson)
      return {
        success: false,
        rawResponse: validated.rawResponse,
        provider: this.providerName,
        model: this.modelName,
        promptVersion: options.promptVersion ?? AI_PROMPT_VERSION,
        processingTimeMs: Date.now() - startTime,
        errorMessage: validated.error,
        isValidationError: true,
      }
    }

    // Default mock response based on documentType or specific testMode
    const docType: DocumentType = options.documentType || 'RECEIPT'
    const mockJson = this.generateMockJson(docType, options.testMode)
    const validated = parseAndValidateAIResponse(JSON.stringify(mockJson))

    return {
      success: validated.success,
      data: validated.data,
      rawResponse: validated.rawResponse,
      provider: this.providerName,
      model: this.modelName,
      promptVersion: options.promptVersion ?? AI_PROMPT_VERSION,
      processingTimeMs: Date.now() - startTime,
      tokenUsage: {
        promptTokens: 450,
        candidatesTokens: 180,
        totalTokens: 630,
      },
      errorMessage: validated.error || null,
      isValidationError: validated.isValidationError || false,
    }
  }

  private generateMockJson(docType: DocumentType, testMode?: string) {
    let lines = []

    if (testMode === 'UNMAPPED_ITEM') {
      lines = [
        {
          lineNumber: 1,
          rawItemName: 'Sơn Chống Thấm Siêu Cấp X999 Unregistered',
          suggestedItemCode: null,
          unit: 'thùng',
          quantity: 20,
          batchNumber: 'LOT-2026-X',
          confidence: { item: 0.85, unit: 0.9, quantity: 0.95 },
        },
      ]
    } else if (testMode === 'LOW_CONFIDENCE') {
      lines = [
        {
          lineNumber: 1,
          rawItemName: 'Xi măng PCB40 (mờ chữ)',
          suggestedItemCode: 'XM-PCB40',
          unit: 'bao',
          quantity: 50,
          batchNumber: null,
          confidence: { item: 0.55, unit: 0.6, quantity: 0.65 },
        },
      ]
    } else if (testMode === 'ZERO_QUANTITY') {
      lines = [
        {
          lineNumber: 1,
          rawItemName: 'Xi măng PCB40',
          suggestedItemCode: 'XM-PCB40',
          unit: 'bao',
          quantity: 0,
          batchNumber: null,
          confidence: { item: 0.95, unit: 0.95, quantity: 0.95 },
        },
      ]
    } else {
      // Standard mock lines by documentType
      switch (docType) {
        case 'RECEIPT':
          lines = [
            {
              lineNumber: 1,
              rawItemName: 'Xi măng PCB40 Hoàng Thạch',
              suggestedItemCode: 'XM-PCB40',
              unit: 'bao',
              quantity: 100,
              batchNumber: 'LO-202607-01',
              confidence: { item: 0.95, unit: 0.98, quantity: 0.96 },
            },
            {
              lineNumber: 2,
              rawItemName: 'Thép D10 Hòa Phát',
              suggestedItemCode: 'TP-D10',
              unit: 'kg',
              quantity: 1500,
              batchNumber: 'LO-202607-02',
              confidence: { item: 0.92, unit: 0.95, quantity: 0.94 },
            },
          ]
          break
        case 'ISSUE':
          lines = [
            {
              lineNumber: 1,
              rawItemName: 'Xi măng PCB30 Nghi Sơn',
              suggestedItemCode: 'XM-PCB30',
              unit: 'bao',
              quantity: 40,
              batchNumber: 'LO-ISSUE-01',
              confidence: { item: 0.94, unit: 0.96, quantity: 0.95 },
            },
            {
              lineNumber: 2,
              rawItemName: 'Đá 1x2 bê tông',
              suggestedItemCode: 'DA-1X2',
              unit: 'm3',
              quantity: 15,
              batchNumber: null,
              confidence: { item: 0.88, unit: 0.9, quantity: 0.92 },
            },
          ]
          break
        case 'TRANSFER':
          lines = [
            {
              lineNumber: 1,
              rawItemName: 'Thép thanh D12 Hòa Phát',
              suggestedItemCode: 'TP-D12',
              unit: 'kg',
              quantity: 800,
              batchNumber: 'LOT-CK-09',
              confidence: { item: 0.93, unit: 0.96, quantity: 0.95 },
            },
            {
              lineNumber: 2,
              rawItemName: 'Phụ gia Sika ViscoCrete',
              suggestedItemCode: 'PG-SIKA',
              unit: 'lít',
              quantity: 200,
              batchNumber: 'LOT-SIKA-88',
              confidence: { item: 0.91, unit: 0.94, quantity: 0.92 },
            },
          ]
          break
        case 'STOCKTAKE':
          lines = [
            {
              lineNumber: 1,
              rawItemName: 'Xi măng PCB40',
              suggestedItemCode: 'XM-PCB40',
              unit: 'bao',
              quantity: 250,
              batchNumber: null,
              confidence: { item: 0.96, unit: 0.98, quantity: 0.97 },
            },
            {
              lineNumber: 2,
              rawItemName: 'Cát vàng sông Lô',
              suggestedItemCode: 'CAT-VANGLO',
              unit: 'm3',
              quantity: 35,
              batchNumber: null,
              confidence: { item: 0.9, unit: 0.92, quantity: 0.91 },
            },
          ]
          break
        default:
          lines = [
            {
              lineNumber: 1,
              rawItemName: 'Vật tư tổng hợp',
              suggestedItemCode: null,
              unit: 'cái',
              quantity: 10,
              batchNumber: null,
              confidence: { item: 0.85, unit: 0.85, quantity: 0.85 },
            },
          ]
      }
    }

    return {
      documentType: docType,
      documentNumber: `HD-${Date.now().toString().slice(-5)}`,
      transactionDate: new Date().toISOString().slice(0, 10),
      workshopName: 'Xưởng Bê tông Đô Thành',
      sourceWarehouse: 'Kho Nguyên Vật Liệu',
      destinationWarehouse: docType === 'TRANSFER' ? 'Kho Bán Thành Phẩm' : null,
      senderName: 'Nguyễn Văn A',
      receiverName: 'Trần Văn B',
      lines,
      overallConfidence: testMode === 'LOW_CONFIDENCE' ? 0.6 : 0.94,
      warnings: [],
    }
  }
}
