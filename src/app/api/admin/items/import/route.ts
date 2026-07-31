import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { importItemsFromCsv } from '@/lib/services/masterData'

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: { message: 'Chỉ Admin mới có quyền Import CSV' } }, { status: 403 })
  }

  try {
    const csvContent = await req.text()
    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: { message: 'Nội dung file CSV trống' } }, { status: 400 })
    }

    const result = await importItemsFromCsv(csvContent)
    return NextResponse.json({ data: result })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 400 })
  }
}
