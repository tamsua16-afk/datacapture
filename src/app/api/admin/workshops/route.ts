import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getWorkshops, createWorkshop } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  try {
    const data = await getWorkshops()
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
    return NextResponse.json({ error: { message: 'Chỉ Admin mới có quyền tạo xưởng mới' } }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { code, name, address, managerName, isActive } = body

    if (!code || !name) {
      return NextResponse.json({ error: { message: 'Mã xưởng và Tên xưởng là bắt buộc' } }, { status: 400 })
    }

    const workshop = await createWorkshop({ code, name, address, managerName, isActive })
    return NextResponse.json({ data: workshop }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
