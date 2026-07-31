import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getLedgerEntries } from '@/lib/services/ledgerService'

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
  const itemId = searchParams.get('itemId') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const transactionType = searchParams.get('transactionType') || undefined
  const search = searchParams.get('search') || undefined
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined

  try {
    const entries = await getLedgerEntries({
      workshopId,
      warehouseId,
      itemId,
      startDate,
      endDate,
      transactionType,
      search,
      limit,
      offset,
    })

    return NextResponse.json({ data: entries })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
