import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getWorkshops } from '@/lib/services/masterData'

/**
 * GET /api/workshops
 * Trả về danh sách xưởng có quyền truy cập theo vai trò:
 * - WORKSHOP_STAFF / WORKSHOP_MANAGER: chỉ xưởng của mình
 * - Các role khác (ACCOUNTANT, ACCOUNTING_MANAGER, ADMIN, VIEWER): tất cả xưởng active
 */
export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  try {
    const all = await getWorkshops()
    const active = all.filter((w) => w.isActive)

    // Nhân viên xưởng & xưởng trưởng chỉ thấy xưởng của mình
    if (
      (session.role === 'WORKSHOP_STAFF' || session.role === 'WORKSHOP_MANAGER') &&
      session.workshopId
    ) {
      const own = active.filter((w) => w.id === session.workshopId)
      return NextResponse.json({ data: own })
    }

    return NextResponse.json({ data: active })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 })
  }
}
