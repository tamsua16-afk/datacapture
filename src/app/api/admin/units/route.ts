import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getUnits, createUnit } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  try {
    const data = await getUnits()
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
    return NextResponse.json({ error: { message: 'Chỉ Admin mới có quyền tạo đơn vị tính' } }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { code, name, description, isActive } = body

    if (!code || !name) {
      return NextResponse.json({ error: { message: 'Mã đơn vị và Tên đơn vị là bắt buộc' } }, { status: 400 })
    }

    const created = await createUnit({ code, name, description, isActive })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
