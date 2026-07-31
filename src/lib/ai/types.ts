import type { AIProvider, DocumentType } from '@/types/enums'
import type { AIExtractedData, TokenUsage } from '@/types/models'

export interface AIExtractionOptions {
  imageBuffer?: Buffer
  imageBase64?: string
  mimeType?: string
  documentType?: DocumentType
  promptVersion?: string
  timeoutMs?: number
  testMode?: 'VALID' | 'MISSING_FIELDS' | 'NON_JSON' | 'TIMEOUT' | 'UNMAPPED_ITEM' | 'LOW_CONFIDENCE' | 'ZERO_QUANTITY'
}

export interface AIExtractionResult {
  success: boolean
  data?: AIExtractedData
  rawResponse?: Record<string, unknown>
  provider: AIProvider
  model: string
  promptVersion: string
  processingTimeMs: number
  tokenUsage?: TokenUsage | null
  errorMessage?: string | null
  isValidationError?: boolean
}

export interface AIExtractionProvider {
  readonly providerName: AIProvider
  readonly modelName: string
  extractFromImage(options: AIExtractionOptions): Promise<AIExtractionResult>
}
