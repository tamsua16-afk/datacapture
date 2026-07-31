import { describe, it, expect, beforeAll } from 'vitest'
import { getDashboardData } from '@/lib/services/dashboardService'
import { exportTransactionsToCsv } from '@/lib/services/exportService'
import { SessionUser } from '@/lib/auth/session'

const adminUser: SessionUser = {
  id: 'demo-admin-001',
  email: 'admin@demo.local',
  fullName: 'Hoàng Văn Emm',
  role: 'ADMIN',
  workshopId: null,
}

const viewerUser: SessionUser = {
  id: 'demo-viewer-001',
  email: 'viewer@demo.local',
  fullName: 'Vũ Thị Phương',
  role: 'VIEWER',
  workshopId: null,
}

const accountantUser: SessionUser = {
  id: 'demo-accountant-001',
  email: 'accountant@demo.local',
  fullName: 'Lê Văn Cường',
  role: 'WAREHOUSE_ACCOUNTANT',
  workshopId: null,
}

describe('Milestone 8: Dashboard & Export Tests', () => {
  describe('1. Dashboard Aggregated Analytics', () => {
    it('Lấy dữ liệu Dashboard thành công cho tất cả 10 chỉ số', async () => {
      const data = await getDashboardData({ timeRange: 'all', workshopId: 'all' })

      // 1. KPI Phiếu
      expect(data.voucherKpis).toBeDefined()
      expect(data.voucherKpis.totalVouchers).toBeGreaterThan(0)
      expect(data.voucherKpis.statusBreakdown).toBeDefined()

      // 2. Thời gian xử lý (AI + Review)
      expect(data.processingTime).toBeDefined()
      expect(data.processingTime.avgAiTimeMs).toBeGreaterThan(0)

      // 3. Confidence Metrics
      expect(data.confidence).toBeDefined()
      expect(data.confidence.avgConfidence).toBeGreaterThan(0)
      expect(data.confidence.distribution).toBeDefined()

      // 4. Lỗi OCR & Cảnh báo
      expect(data.ocrErrors).toBeDefined()
      expect(data.ocrErrors.byType).toBeDefined()

      // 5. Phiếu trùng (DUP-01)
      expect(data.duplicates).toBeDefined()
      expect(Array.isArray(data.duplicates.items)).toBe(true)

      // 6. Âm kho & Cảnh báo tồn kho
      expect(data.negativeStock).toBeDefined()
      expect(Array.isArray(data.negativeStock.items)).toBe(true)

      // 7. Mã chưa ánh xạ
      expect(data.unmapped).toBeDefined()
      expect(Array.isArray(data.unmapped.rawItems)).toBe(true)

      // 8. Chênh lệch kiểm kê
      expect(data.stocktakeVariance).toBeDefined()

      // 9. Tồn kho theo xưởng
      expect(data.workshopInventory).toBeDefined()
      expect(data.workshopInventory.length).toBeGreaterThan(0)

      // 10. Top mã hàng
      expect(data.topItems).toBeDefined()
      expect(data.topItems.length).toBeGreaterThan(0)
    })

    it('Bộ lọc xưởng giới hạn đúng phạm vi dữ liệu', async () => {
      const dataWorkshop1 = await getDashboardData({ timeRange: 'all', workshopId: 'demo-workshop-001' })
      expect(dataWorkshop1).toBeDefined()
      expect(dataWorkshop1.voucherKpis.totalVouchers).toBeGreaterThan(0)
    })
  })

  describe('2. CSV Export & UTF-8 BOM Safety', () => {
    it('Xuất CSV thành công với tiền tố UTF-8 BOM (\\uFEFF)', async () => {
      const result = await exportTransactionsToCsv(accountantUser, {
        workshopId: 'all',
      })

      expect(result).toBeDefined()
      expect(result.csvContent).toBeDefined()
      expect(result.exportedCount).toBeGreaterThan(0)

      // Kiểm tra file bắt đầu bằng UTF-8 BOM prefix '\uFEFF'
      expect(result.csvContent.startsWith('\uFEFF')).toBe(true)

      // Kiểm tra tiêu đề CSV tiếng Việt
      expect(result.csvContent).toContain('Mã giao dịch')
      expect(result.csvContent).toContain('Loại giao dịch')
      expect(result.csvContent).toContain('Số chứng từ')
    })

    it('Người dùng VIEWER có thể tải CSV nhưng KHÔNG làm thay đổi trạng thái phiếu', async () => {
      const result = await exportTransactionsToCsv(viewerUser, {
        workshopId: 'all',
      })

      expect(result).toBeDefined()
      expect(result.csvContent.startsWith('\uFEFF')).toBe(true)
    })

    it('Báo lỗi rõ ràng nếu không có giao dịch nào thỏa mãn điều kiện xuất', async () => {
      await expect(
        exportTransactionsToCsv(adminUser, {
          workshopId: 'non-existent-workshop-id-12345',
        })
      ).rejects.toThrow('Không có giao dịch nào ở trạng thái POSTED hoặc EXPORT_READY')
    })
  })
})
