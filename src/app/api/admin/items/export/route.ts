import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { exportItemsToCsv } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  try {
    const csvString = await exportItemsToCsv()
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="danh_muc_hang_hoa_${Date.now()}.csv"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 })
  }
}
