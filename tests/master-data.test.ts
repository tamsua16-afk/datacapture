import { describe, it, expect, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { createSessionToken } from '@/lib/auth/session'
import { normalizeAlias, removeVietnameseTones, isAliasMatching } from '@/lib/utils/normalize'
import {
  createWorkshop,
  createWarehouse,
  createItem,
  createUnit,
  createItemAlias,
  getItems,
  deleteWorkshop,
  deleteWarehouse,
  deleteItem,
  quickSearchMasterData,
} from '@/lib/services/masterData'

import { POST as createWorkshopRoute } from '@/app/api/admin/workshops/route'
import { POST as createWarehouseRoute } from '@/app/api/admin/warehouses/route'
import { POST as createItemRoute } from '@/app/api/admin/items/route'

describe('Milestone 2: Master Data Tests', () => {

  describe('1. Duplicate Code Prevention (Mã duy nhất)', () => {
    it('Từ chối tạo Xưởng trùng mã (Duplicate Workshop Code)', async () => {
      const uniqueCode = `TEST-WS-DUP-${Date.now()}`
      await createWorkshop({ code: uniqueCode, name: 'Xưởng Test 1' })

      await expect(
        createWorkshop({ code: uniqueCode, name: 'Xưởng Trùng Mã' })
      ).rejects.toThrow(`Mã xưởng "${uniqueCode}" đã tồn tại trong hệ thống`)
    })

    it('Từ chối tạo Kho trùng mã (Duplicate Warehouse Code)', async () => {
      const ws = await createWorkshop({ code: `WS-WH-DUP-${Date.now()}`, name: 'Xưởng Test Wh' })
      const whCode = `TEST-WH-DUP-${Date.now()}`

      await createWarehouse({ workshopId: ws.id, code: whCode, name: 'Kho Test 1' })

      await expect(
        createWarehouse({ workshopId: ws.id, code: whCode, name: 'Kho Trùng Mã' })
      ).rejects.toThrow(`Mã kho "${whCode}" đã tồn tại trong hệ thống`)
    })

    it('Từ chối tạo Mã hàng trùng (Duplicate Item Code)', async () => {
      const itemCode = `TEST-ITEM-DUP-${Date.now()}`
      await createItem({ code: itemCode, name: 'Vật tư 1', baseUnit: 'kg' })

      await expect(
        createItem({ code: itemCode, name: 'Vật tư Trùng Mã', baseUnit: 'kg' })
      ).rejects.toThrow(`Mã hàng "${itemCode}" đã tồn tại trong hệ thống`)
    })

    it('Từ chối tạo Đơn vị tính trùng mã (Duplicate Unit Code)', async () => {
      const unitCode = `unitdup${Date.now()}`
      await createUnit({ code: unitCode, name: 'Tên 1' })

      await expect(
        createUnit({ code: unitCode, name: 'Tên Trùng' })
      ).rejects.toThrow(`Đơn vị tính "${unitCode}" đã tồn tại trong hệ thống`)
    })
  })

  describe('2. Inactive Item & Soft Delete Prevention (Khóa & Không xóa cứng)', () => {
    it('Lọc chính xác các mục bị khóa khi dùng activeOnly = true', async () => {
      const activeCode = `ITEM-ACT-${Date.now()}`
      const inactiveCode = `ITEM-INACT-${Date.now()}`

      await createItem({ code: activeCode, name: 'Hàng Đang HĐ', baseUnit: 'kg', isActive: true })
      await createItem({ code: inactiveCode, name: 'Hàng Đã Khóa', baseUnit: 'kg', isActive: false })

      const activeItems = await getItems({ activeOnly: true })
      const foundActive = activeItems.find(i => i.code === activeCode)
      const foundInactive = activeItems.find(i => i.code === inactiveCode)

      expect(foundActive).toBeDefined()
      expect(foundInactive).toBeUndefined()
    })

    it('Từ chối xóa cứng Xưởng / Kho đã phát sinh giao dịch', async () => {
      // demo-workshop-001 đã có 5 kho và giao dịch trong seed
      await expect(deleteWorkshop('demo-workshop-001')).rejects.toThrow(
        /Không thể xóa cứng Xưởng đã phát sinh dữ liệu/
      )

      // demo-wh-001 đã có sổ tồn kho trong seed
      await expect(deleteWarehouse('demo-wh-001')).rejects.toThrow(
        /Không thể xóa cứng Kho đã phát sinh dữ liệu/
      )
    })

    it('Từ chối xóa cứng Mã hàng đã phát sinh chi tiết giao dịch', async () => {
      // item-001 đã có dòng giao dịch trong seed
      await expect(deleteItem('item-001')).rejects.toThrow(
        /Không thể xóa cứng Mã hàng đã xuất hiện trong giao dịch/
      )
    })
  })

  describe('3. Alias Normalization & Matching (Chuẩn hóa Alias & Tìm kiếm)', () => {
    it('Loại bỏ dấu tiếng Việt và chuẩn hóa khoảng trắng', () => {
      const input = '   Xi   măng   PCB40  '
      const normalized = normalizeAlias(input)
      expect(normalized).toBe('xi mang pcb40')

      expect(removeVietnameseTones('Cát vàng sàng tinh')).toBe('Cat vang sang tinh')
    })

    it('Khớp alias không phân biệt chữ hoa, dấu và khoảng trắng', () => {
      expect(isAliasMatching('Xi măng PCB40', 'xi mang pcb40')).toBe(true)
      expect(isAliasMatching('  CAT  VANG ', 'cát vàng')).toBe(true)
      expect(isAliasMatching('THÉP D10', 'thep d10')).toBe(true)
    })

    it('Tra cứu nhanh (quick search) tìm đúng theo từ khóa alias không dấu', async () => {
      const item = await createItem({ code: `XM-PCB40`, name: 'Xi măng PCB40', baseUnit: 'bao' }).catch(() => null)
      const items = await getItems({ search: 'XM-PCB40' })
      const targetItem = item || (Array.isArray(items) ? items[0] : (items as any)?.data?.[0])
      if (targetItem) {
        await createItemAlias({ itemId: targetItem.id, alias: 'xm40' }).catch(() => null)
      }
      const searchResult = await quickSearchMasterData('xm40')
      const foundItem = searchResult.items.find(i => i.code === 'XM-PCB40')
      expect(foundItem).toBeDefined()
    })
  })

  describe('4. Governance / RBAC & AI Rules (Quyền quản trị & Quy tắc AI)', () => {
    it('ADMIN được tạo Master Data, các role khác bị từ chối 403', async () => {
      const staffToken = await createSessionToken({
        id: 'demo-staff-001',
        email: 'staff@demo.local',
        fullName: 'Staff Test',
        role: 'WORKSHOP_STAFF',
        workshopId: 'demo-workshop-001',
      })

      const adminToken = await createSessionToken({
        id: 'demo-admin-001',
        email: 'admin@demo.local',
        fullName: 'Admin Test',
        role: 'ADMIN',
        workshopId: null,
      })

      // Staff gọi API tạo xưởng -> 403
      const staffReq = new NextRequest('http://localhost:3000/api/admin/workshops', {
        method: 'POST',
        headers: {
          cookie: `xdc-session=${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: `WS-STAFF-${Date.now()}`, name: 'Xưởng Staff' }),
      })
      const staffRes = await createWorkshopRoute(staffReq)
      expect(staffRes.status).toBe(403)

      // Admin gọi API tạo xưởng -> 201
      const adminReq = new NextRequest('http://localhost:3000/api/admin/workshops', {
        method: 'POST',
        headers: {
          cookie: `xdc-session=${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: `WS-ADM-${Date.now()}`, name: 'Xưởng Admin' }),
      })
      const adminRes = await createWorkshopRoute(adminReq)
      expect(adminRes.status).toBe(201)
    })

    it('RULE BẮT BUỘC: AI không được tự động tạo mã hàng mới', async () => {
      await expect(
        createItem(
          { code: `AI-AUTO-${Date.now()}`, name: 'Hàng AI gợi ý', baseUnit: 'kg' },
          true // isAiGenerated = true
        )
      ).rejects.toThrow('AI không được tự động tạo mã hàng mới')
    })
  })
})
