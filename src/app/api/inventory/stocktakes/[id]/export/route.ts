import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { exportStocktakeCSV, getStocktakeById } from '@/lib/services/stocktakeService'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  const { id } = await context.params

  try {
    const stocktake = await getStocktakeById(id)
    const csvContent = await exportStocktakeCSV(id)

    const filename = `bien_ban_kiem_ke_${stocktake.code}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: 400 }
    )
  }
}
