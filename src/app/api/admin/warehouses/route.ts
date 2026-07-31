import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getWarehouses, createWarehouse } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const workshopId = searchParams.get('workshopId') || undefined

  try {
    const data = await getWarehouses(workshopId)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: { message: 'Chỉ Admin mới có quyền tạo kho mới' } }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { workshopId, code, name, warehouseType, isActive } = body

    if (!workshopId || !code || !name) {
      return NextResponse.json({ error: { message: 'Xưởng, Mã kho và Tên kho là bắt buộc' } }, { status: 400 })
    }

    const warehouse = await createWarehouse({ workshopId, code, name, warehouseType, isActive })
    return NextResponse.json({ data: warehouse }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
