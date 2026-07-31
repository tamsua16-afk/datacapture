import { z } from 'zod'
import type { AIExtractedData } from '@/types/models'

export const ConfidenceScoreSchema = z.object({
  item: z.number().min(0).max(1),
  unit: z.number().min(0).max(1),
  quantity: z.number().min(0).max(1),
})

export const AIExtractedLineSchema = z.object({
  lineNumber: z.number().int().min(1),
  rawItemName: z.string().min(1, 'Tên mặt hàng không được để trống'),
  suggestedItemCode: z.string().nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null),
  quantity: z.number().nullable().optional().default(null),
  batchNumber: z.string().nullable().optional().default(null),
  confidence: ConfidenceScoreSchema,
})

export const AIWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export const DocumentTypeEnumSchema = z.enum([
  'RECEIPT',
  'ISSUE',
  'TRANSFER',
  'STOCKTAKE',
  'UNKNOWN',
])

export const AIExtractedDataSchema = z.object({
  documentType: DocumentTypeEnumSchema,
  documentNumber: z.string().nullable().optional().default(null),
  transactionDate: z.string().nullable().optional().default(null),
  workshopName: z.string().nullable().optional().default(null),
  sourceWarehouse: z.string().nullable().optional().default(null),
  destinationWarehouse: z.string().nullable().optional().default(null),
  senderName: z.string().nullable().optional().default(null),
  receiverName: z.string().nullable().optional().default(null),
  lines: z.array(AIExtractedLineSchema).min(1, 'Phiếu phải có ít nhất 1 dòng hàng'),
  overallConfidence: z.number().min(0).max(1),
  warnings: z.array(AIWarningSchema).default([]),
})

export function parseAndValidateAIResponse(jsonText: string): {
  success: boolean
  data?: AIExtractedData
  rawResponse?: Record<string, unknown>
  error?: string
  isValidationError?: boolean
} {
  try {
    const rawObj = JSON.parse(jsonText)
    const result = AIExtractedDataSchema.safeParse(rawObj)

    if (!result.success) {
      const formattedErrors = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
      return {
        success: false,
        rawResponse: typeof rawObj === 'object' && rawObj !== null ? rawObj : { text: jsonText },
        error: `JSON Validation Error: ${formattedErrors}`,
        isValidationError: true,
      }
    }

    return {
      success: true,
      data: result.data as AIExtractedData,
      rawResponse: rawObj,
    }
  } catch (parseErr: any) {
    return {
      success: false,
      rawResponse: { rawText: jsonText },
      error: `JSON Syntax Error: AI trả text không phải JSON (${parseErr.message})`,
      isValidationError: true,
    }
  }
}
