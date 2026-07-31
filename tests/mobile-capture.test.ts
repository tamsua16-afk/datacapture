import { describe, it, expect } from 'vitest'
import {
  validateUploadFile,
  calculateSHA256,
  generateSignedUrlToken,
  verifySignedUrlToken,
  checkDuplicateFileHash,
} from '@/lib/services/storage'
import {
  saveDraftTransaction,
  getTransactionById,
  addAttachmentToTransaction,
  submitForAIProcessing,
} from '@/lib/services/transactions'

describe('Milestone 3: Mobile Capture & Attachment Management', () => {
  const mockUserId = 'demo-staff-001'
  const mockWorkshopId = 'demo-workshop-001'

  describe('1. Kiểm tra định dạng tệp & dung lượng upload', () => {
    it('Chấp nhận các định dạng hợp lệ JPG, PNG, WEBP, PDF trong giới hạn 20MB', () => {
      const validJpg = validateUploadFile(5 * 1024 * 1024, 'image/jpeg', 'chung_tu_01.jpg')
      expect(validJpg.isValid).toBe(true)

      const validPng = validateUploadFile(2 * 1024 * 1024, 'image/png', 'hoa_don.png')
      expect(validPng.isValid).toBe(true)

      const validPdf = validateUploadFile(15 * 1024 * 1024, 'application/pdf', 'phieu_giao_hang.pdf')
      expect(validPdf.isValid).toBe(true)
    })

    it('Từ chối các định dạng không được hỗ trợ như .exe, .txt, .docx', () => {
      const invalidExe = validateUploadFile(1024, 'application/x-msdownload', 'malware.exe')
      expect(invalidExe.isValid).toBe(false)
      expect(invalidExe.error).toContain('Định dạng tệp không được hỗ trợ')

      const invalidTxt = validateUploadFile(1024, 'text/plain', 'note.txt')
      expect(invalidTxt.isValid).toBe(false)
    })

    it('Từ chối tệp vượt quá dung lượng tối đa (20MB)', () => {
      const oversized = validateUploadFile(25 * 1024 * 1024, 'image/jpeg', 'heavy_raw_image.jpg')
      expect(oversized.isValid).toBe(false)
      expect(oversized.error).toContain('Dung lượng tệp quá lớn')
    })
  })

  describe('2. Tính mã băm SHA-256 & Phát hiện ảnh trùng (DUP-02)', () => {
    it('Tính SHA-256 hash chuẩn xác và đồng nhất cho cùng một nội dung file', () => {
      const buffer1 = Buffer.from('Noi dung phieu giao hang xi mang PCB40 2026')
      const buffer2 = Buffer.from('Noi dung phieu giao hang xi mang PCB40 2026')
      const bufferDifferent = Buffer.from('Noi dung khac')

      const hash1 = calculateSHA256(buffer1)
      const hash2 = calculateSHA256(buffer2)
      const hashDiff = calculateSHA256(bufferDifferent)

      expect(hash1).toBe(hash2)
      expect(hash1).not.toBe(hashDiff)
      expect(hash1).toHaveLength(64) // SHA-256 hex string standard length
    })
  })

  describe('3. Mã hóa & Xác thực Signed URL (Private Storage)', () => {
    it('Sinh signed token và xác thực thành công khi token chưa hết hạn', () => {
      const attachmentId = 'att-test-991'
      const { token } = generateSignedUrlToken(attachmentId, 3600) // Hạn 1 giờ

      const isValid = verifySignedUrlToken(attachmentId, token)
      expect(isValid).toBe(true)
    })

    it('Từ chối token nếu đã hết hạn hoặc bị chỉnh sửa chữ ký', () => {
      const attachmentId = 'att-test-992'
      const { token } = generateSignedUrlToken(attachmentId, -10) // Đã hết hạn cách đây 10s

      const isValidExpired = verifySignedUrlToken(attachmentId, token)
      expect(isValidExpired).toBe(false)

      const tamperedToken = `${token}tampered`
      const isValidTampered = verifySignedUrlToken(attachmentId, tamperedToken)
      expect(isValidTampered).toBe(false)
    })
  })

  describe('4. Quy trình Tạo phiếu nháp DRAFT & Xử lý AI', () => {
    it('Tạo phiếu nháp DRAFT thành công và cập nhật khi đính kèm ảnh', async () => {
      const draft = await saveDraftTransaction({
        transactionType: 'PURCHASE_RECEIPT',
        workshopId: mockWorkshopId,
        documentNumber: 'HD-TEST-101',
        senderUserId: mockUserId,
      })

      expect(draft).not.toBeNull()
      expect(draft?.status).toBe('DRAFT')
      expect(draft?.transactionCode).toMatch(/^NK-/)

      // Thêm ảnh đính kèm
      const att = await addAttachmentToTransaction({
        transactionId: draft!.id,
        storagePath: `attachments/${draft!.id}/sample.jpg`,
        originalFilename: 'sample.jpg',
        mimeType: 'image/jpeg',
        fileSize: 102400,
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploadedBy: mockUserId,
      })

      expect(att.id).toBeDefined()

      // Trạng thái phiếu phải chuyển thành IMAGE_UPLOADED
      const updatedTx = await getTransactionById(draft!.id)
      expect(updatedTx?.status).toBe('IMAGE_UPLOADED')
      expect(updatedTx?.attachments).toHaveLength(1)
    })

    it('Chuyển trạng thái sang AI_PROCESSING và trích xuất dữ liệu AI thành công', async () => {
      const draft = await saveDraftTransaction({
        transactionType: 'MATERIAL_ISSUE',
        workshopId: mockWorkshopId,
        senderUserId: mockUserId,
      })

      const aiResult = await submitForAIProcessing(draft!.id)
      expect(aiResult?.status).toBe('AI_EXTRACTED')
      expect(aiResult?.lines).toHaveLength(2)
      expect(aiResult?.lines[0].rawItemName).toContain('Xi măng')
    })
  })
})
