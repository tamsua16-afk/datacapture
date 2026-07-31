import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getItemAliases, createItemAlias } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId') || undefined

  try {
    const data = await getItemAliases(itemId)
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
  if (session.role !== 'ADMIN' && session.role !== 'WAREHOUSE_ACCOUNTANT' && session.role !== 'WORKSHOP_MANAGER') {
    return NextResponse.json({ error: { message: 'Không có quyền tạo alias' } }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { itemId, alias, workshopId } = body

    if (!itemId || !alias) {
      return NextResponse.json({ error: { message: 'Mã hàng và Alias là bắt buộc' } }, { status: 400 })
    }

    const created = await createItemAlias({ itemId, alias, workshopId })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
