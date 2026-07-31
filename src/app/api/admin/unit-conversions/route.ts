import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getUnitConversions, createUnitConversion } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId') || undefined

  try {
    const data = await getUnitConversions(itemId)
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
    return NextResponse.json({ error: { message: 'Chỉ Admin mới có quyền tạo quy đổi đơn vị' } }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { itemId, fromUnit, toUnit, conversionFactor, isActive } = body

    if (!fromUnit || !toUnit || !conversionFactor) {
      return NextResponse.json({ error: { message: 'Đơn vị nguồn, Đơn vị đích và Hệ số quy đổi là bắt buộc' } }, { status: 400 })
    }

    const created = await createUnitConversion({ itemId, fromUnit, toUnit, conversionFactor, isActive })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
