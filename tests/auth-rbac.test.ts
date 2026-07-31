import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { DEMO_USERS } from '@/config/demo'
import { createSessionToken } from '@/lib/auth/session'
import { canAccessRoute, hasPermission, authorizeMutation, canAccessWorkshopData } from '@/lib/auth/permissions'
import { resolveEffectiveWorkshopId } from '@/lib/auth/rls'
import { proxy } from '@/proxy'

describe('Milestone 1: Authentication & Role-based Access Control (RBAC)', () => {
  const staffUser = DEMO_USERS.find(u => u.role === 'WORKSHOP_STAFF')! // Nhân viên Xưởng Đại Mỗ (demo-workshop-001)
  const accountantUser = DEMO_USERS.find(u => u.role === 'WAREHOUSE_ACCOUNTANT')!
  const viewerUser = DEMO_USERS.find(u => u.role === 'VIEWER')!

  const daiMoWorkshopId = 'demo-workshop-001'
  const haDongWorkshopId = 'demo-workshop-002'

  describe('1. Phân quyền dữ liệu xưởng (Row Level Security)', () => {
    it('Nhân viên Xưởng Đại Mỗ không xem được phiếu Xưởng Hà Đông', () => {
      const session = {
        id: staffUser.id,
        email: staffUser.email,
        fullName: staffUser.fullName,
        role: staffUser.role,
        workshopId: daiMoWorkshopId,
      }

      // Kiểm tra quyền truy cập dữ liệu xưởng Hà Đông
      const canAccessHaDong = canAccessWorkshopData(session, haDongWorkshopId)
      expect(canAccessHaDong).toBe(false)

      // Kiểm tra xem xưởng của chính mình có xem được không
      const canAccessDaiMo = canAccessWorkshopData(session, daiMoWorkshopId)
      expect(canAccessDaiMo).toBe(true)
    })
  })

  describe('2. Phân quyền Mutation cho Viewer', () => {
    it('Viewer không tạo hoặc sửa được dữ liệu (bị từ chối 403)', () => {
      const session = {
        id: viewerUser.id,
        email: viewerUser.email,
        fullName: viewerUser.fullName,
        role: viewerUser.role,
        workshopId: null,
      }

      // Kiểm tra authorizeMutation
      const authResult = authorizeMutation(session)
      expect(authResult.allowed).toBe(false)
      expect(authResult.status).toBe(403)
      expect(authResult.message).toContain('Viewer chỉ có quyền xem')

      // Kiểm tra các permission cụ thể
      expect(hasPermission('VIEWER', 'CREATE_TRANSACTION')).toBe(false)
      expect(hasPermission('VIEWER', 'UPDATE_TRANSACTION')).toBe(false)
      expect(hasPermission('VIEWER', 'APPROVE_TRANSACTION')).toBe(false)

      // Kiểm tra quyền VIEW vẫn cho phép
      expect(hasPermission('VIEWER', 'VIEW_TRANSACTION')).toBe(true)
    })
  })

  describe('3. Bảo vệ Route theo vai trò', () => {
    it('Nhân viên không truy cập được trang quản trị (/admin)', async () => {
      // 1. Kiểm tra permission helper
      const staffCanAccessAdmin = canAccessRoute('WORKSHOP_STAFF', '/admin/users')
      expect(staffCanAccessAdmin).toBe(false)

      // 2. Kiểm tra proxy middleware chặn request thực tế
      const token = await createSessionToken({
        id: staffUser.id,
        email: staffUser.email,
        fullName: staffUser.fullName,
        role: 'WORKSHOP_STAFF',
        workshopId: daiMoWorkshopId,
      })

      const req = new NextRequest('http://localhost:3000/admin/users', {
        headers: {
          cookie: `xdc-session=${token}`,
        },
      })

      const res = await proxy(req)
      expect(res.status).toBe(307) // Next.js redirect HTTP status
      expect(res.headers.get('location')).toContain('/403')
    })
  })

  describe('4. Quyền của Kế toán', () => {
    it('Kế toán truy cập được hàng đợi kiểm duyệt (/accounting/queue)', async () => {
      // 1. Kiểm tra permission helper
      const accountantCanAccessQueue = canAccessRoute('WAREHOUSE_ACCOUNTANT', '/accounting/queue')
      expect(accountantCanAccessQueue).toBe(true)

      expect(hasPermission('WAREHOUSE_ACCOUNTANT', 'VIEW_QUEUE')).toBe(true)

      // 2. Kiểm tra proxy middleware cho phép request
      const token = await createSessionToken({
        id: accountantUser.id,
        email: accountantUser.email,
        fullName: accountantUser.fullName,
        role: 'WAREHOUSE_ACCOUNTANT',
        workshopId: null,
      })

      const req = new NextRequest('http://localhost:3000/accounting/queue', {
        headers: {
          cookie: `xdc-session=${token}`,
        },
      })

      const res = await proxy(req)
      // Cho phép tiếp tục: Không bị redirect đến 403 hoặc login
      expect(res.headers.get('location')).toBeNull()
      expect(res.status).toBe(200)
    })
  })

  describe('5. Chống bypass workshop_id từ Client', () => {
    it('Client không thể thay workshop_id để vượt quyền', () => {
      const session = {
        id: staffUser.id,
        email: staffUser.email,
        fullName: staffUser.fullName,
        role: staffUser.role,
        workshopId: daiMoWorkshopId, // Server gán xưởng Đại Mỗ
      }

      // Giả lập client cố tình gửi workshop_id = Xưởng Hà Đông trong request body/query
      const clientProvidedWorkshopId = haDongWorkshopId

      const rlsResult = resolveEffectiveWorkshopId(session, clientProvidedWorkshopId)

      // Server từ chối việc thay thế workshop_id
      expect(rlsResult.allowed).toBe(false)
      expect(rlsResult.error?.status).toBe(403)
      expect(rlsResult.error?.message).toContain('Bypass workshop_id bị chặn')

      // Nếu client không gửi workshopId, server tự động gán workshopId từ session
      const defaultRlsResult = resolveEffectiveWorkshopId(session, null)
      expect(defaultRlsResult.allowed).toBe(true)
      expect(defaultRlsResult.effectiveWorkshopId).toBe(daiMoWorkshopId)
    })
  })
})
