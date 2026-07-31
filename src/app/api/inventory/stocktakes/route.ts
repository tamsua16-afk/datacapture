import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { listStocktakes, createStocktakeSession } from '@/lib/services/stocktakeService'

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
  const status = searchParams.get('status') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const search = searchParams.get('search') || undefined

  try {
    const stocktakes = await listStocktakes({
      workshopId,
      warehouseId,
      status,
      startDate,
      endDate,
      search,
    })
    return NextResponse.json({ data: stocktakes })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { workshopId, warehouseId, stocktakeDate, code, notes } = body

    if (!workshopId || !warehouseId || !stocktakeDate) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng chọn Xưởng, Kho và Ngày kiểm kê' } },
        { status: 400 }
      )
    }

    const stocktake = await createStocktakeSession(
      { workshopId, warehouseId, stocktakeDate, code, notes },
      session
    )

    return NextResponse.json({ data: stocktake }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: 400 }
    )
  }
}
