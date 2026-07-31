import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getItems, createItem } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const group = searchParams.get('group') || undefined
  const activeOnly = searchParams.get('activeOnly') === 'true'
  const search = searchParams.get('search') || undefined

  try {
    const data = await getItems({ group, activeOnly, search })
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
    return NextResponse.json({ error: { message: 'Chỉ Admin mới có quyền tạo mã hàng mới' } }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { code, name, itemGroup, baseUnit, minimumStock, maximumStock, isActive, aliases, isAiGenerated } = body

    if (!code || !name || !baseUnit) {
      return NextResponse.json({ error: { message: 'Mã hàng, Tên hàng và Đơn vị tính cơ sở là bắt buộc' } }, { status: 400 })
    }

    const item = await createItem(
      { code, name, itemGroup, baseUnit, minimumStock, maximumStock, isActive, aliases },
      Boolean(isAiGenerated)
    )
    return NextResponse.json({ data: item }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
