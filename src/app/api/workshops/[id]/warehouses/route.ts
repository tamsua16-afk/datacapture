import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getWarehouses } from '@/lib/services/masterData'

/**
 * GET /api/workshops/[id]/warehouses
 * Trả về danh sách kho thuộc xưởng theo workshopId.
 * RBAC: nhân viên xưởng chỉ được xem kho của xưởng mình.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  const workshopId = params.id

  // Nhân viên xưởng / xưởng trưởng không được xem kho của xưởng khác
  if (
    (session.role === 'WORKSHOP_STAFF' || session.role === 'WORKSHOP_MANAGER') &&
    session.workshopId &&
    session.workshopId !== workshopId
  ) {
    return NextResponse.json({ error: { message: 'Không có quyền xem kho của xưởng khác' } }, { status: 403 })
  }

  try {
    const all = await getWarehouses(workshopId)
    const active = all.filter((wh) => wh.isActive)
    return NextResponse.json({ data: active })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 })
  }
}
