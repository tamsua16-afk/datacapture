import { GoogleGenAI } from '@google/genai'
import type { AIExtractionProvider, AIExtractionOptions, AIExtractionResult } from './types'
import { parseAndValidateAIResponse } from './schemas'
import { AI_PROMPT_VERSION, GEMINI_MODEL } from '@/config/constants'

export class GeminiExtractionProvider implements AIExtractionProvider {
  readonly providerName = 'GEMINI' as const
  readonly modelName: string

  constructor(modelName?: string) {
    // Model name obtained from GEMINI_MODEL constant / process.env.GEMINI_MODEL
    this.modelName = modelName || GEMINI_MODEL
  }

  async extractFromImage(options: AIExtractionOptions): Promise<AIExtractionResult> {
    const startTime = Date.now()
    const promptVersion = options.promptVersion || AI_PROMPT_VERSION
    const timeoutMs = options.timeoutMs || 30000
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

    if (!apiKey) {
      return {
        success: false,
        provider: this.providerName,
        model: this.modelName,
        promptVersion,
        processingTimeMs: Date.now() - startTime,
        errorMessage: 'GEMINI_API_KEY không được cấu hình trong môi trường',
        isValidationError: false,
      }
    }

    const ai = new GoogleGenAI({ apiKey })

    // Max 2 retries = total 3 attempts
    const maxRetries = 2
    let attempt = 0
    let lastError: any = null

    while (attempt <= maxRetries) {
      attempt++
      try {
        const result = await this.executeSingleCall(ai, options, timeoutMs)

        // If execution succeeded or encountered non-retryable validation error, return result immediately
        if (result.success || result.isValidationError) {
          return {
            success: result.success ?? false,
            provider: result.provider ?? this.providerName,
            model: result.model ?? this.modelName,
            promptVersion,
            processingTimeMs: Date.now() - startTime,
            data: result.data,
            rawResponse: result.rawResponse,
            tokenUsage: result.tokenUsage,
            errorMessage: result.errorMessage,
            isValidationError: result.isValidationError,
          }
        }

        // Retryable error (network error, transient server error)
        lastError = result.errorMessage
      } catch (err: any) {
        lastError = err.message || 'Lỗi kết nối tới Gemini API'
      }

      // Pause briefly before retrying if attempts remain
      if (attempt <= maxRetries) {
        await new Promise((res) => setTimeout(res, 1000 * attempt))
      }
    }

    return {
      success: false,
      provider: this.providerName,
      model: this.modelName,
      promptVersion,
      processingTimeMs: Date.now() - startTime,
      errorMessage: `Thử lại ${maxRetries} lần thất bại: ${lastError}`,
      isValidationError: false,
    }
  }

  private async executeSingleCall(
    ai: GoogleGenAI,
    options: AIExtractionOptions,
    timeoutMs: number
  ): Promise<Partial<AIExtractionResult>> {
    // Construct Prompt
    const systemPrompt = `
Bạn là hệ thống OCR & AI Extraction cho ứng dụng Quản lý Xưởng Data Capture.
Nhiệm vụ: Trích xuất chính xác dữ liệu chứng từ kho (phiếu nhập, xuất, chuyển kho, kiểm kê) từ hình ảnh.

YÊU CẦU ĐẦU RA:
Trả về duy nhất 1 chuỗi JSON tuân thủ đúng schema sau (không thêm Markdown codeblock hoặc bất kỳ văn bản giải thích nào ngoài JSON):

{
  "documentType": "RECEIPT" | "ISSUE" | "TRANSFER" | "STOCKTAKE" | "UNKNOWN",
  "documentNumber": "Số chứng từ/Hóa đơn nếu có",
  "transactionDate": "YYYY-MM-DD",
  "workshopName": "Tên xưởng",
  "sourceWarehouse": "Kho xuất/nguồn",
  "destinationWarehouse": "Kho nhập/đích",
  "senderName": "Tên người giao/gửi",
  "receiverName": "Tên người nhận",
  "lines": [
    {
      "lineNumber": 1,
      "rawItemName": "Tên hàng hóa nguyên bản trên ảnh",
      "suggestedItemCode": "Mã hàng nếu nhận diện rõ",
      "unit": "Đơn vị tính",
      "quantity": 100,
      "batchNumber": "Số lô nếu có",
      "confidence": {
        "item": 0.95,
        "unit": 0.95,
        "quantity": 0.95
      }
    }
  ],
  "overallConfidence": 0.95,
  "warnings": []
}

QUY TẮC BẮT BUỘC:
1. Trường không rõ thông tin phải trả về null.
2. Không tự nghĩ ra mã hàng mới nếu không khớp.
3. Điểm confidence nằm trong khoảng 0.0 đến 1.0.
`

    // Prepare image payload
    let imageBase64 = options.imageBase64
    if (!imageBase64 && options.imageBuffer) {
      imageBase64 = options.imageBuffer.toString('base64')
    }

    if (!imageBase64) {
      return {
        success: false,
        errorMessage: 'Không có dữ liệu ảnh (imageBuffer/imageBase64)',
        isValidationError: true,
      }
    }

    const mimeType = options.mimeType || 'image/jpeg'

    const contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: systemPrompt },
        ],
      },
    ]

    // Create timeout Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`API Timeout sau ${timeoutMs}ms`)), timeoutMs)
    })

    // Execute call with timeout race
    const callPromise = ai.models.generateContent({
      model: this.modelName,
      contents: contents as any,
      config: {
        responseMimeType: 'application/json',
      },
    })

    const response: any = await Promise.race([callPromise, timeoutPromise])

    const textOutput = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      return {
        success: false,
        errorMessage: 'Gemini trả về phản hồi rỗng',
        isValidationError: false,
      }
    }

    // Validate JSON response using Zod schema
    const validated = parseAndValidateAIResponse(textOutput)

    const tokenUsage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : null

    return {
      success: validated.success,
      data: validated.data,
      rawResponse: validated.rawResponse,
      provider: this.providerName,
      model: this.modelName,
      tokenUsage,
      errorMessage: validated.error || null,
      isValidationError: validated.isValidationError || false,
    }
  }
}
