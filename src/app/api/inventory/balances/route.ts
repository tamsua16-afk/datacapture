import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getStockBalances } from '@/lib/services/ledgerService'

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const workshopId = searchParams.get('workshopId') || undefined
  const warehouseId = searchParams.get('warehouseId') || undefined
  const itemGroup = searchParams.get('itemGroup') || undefined
  const search = searchParams.get('search') || undefined

  try {
    const balances = await getStockBalances({
      workshopId,
      warehouseId,
      itemGroup,
      search,
    })

    return NextResponse.json({ data: balances })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
