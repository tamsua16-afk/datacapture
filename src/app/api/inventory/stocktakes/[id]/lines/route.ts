import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import {
  mapStocktakeLineItem,
  updateStocktakeLineCountedQty,
  updateStocktakeLineExplanation,
} from '@/lib/services/stocktakeService'

export async function PATCH(
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
    const body = await request.json()
    const { action, lineId, itemId, countedQuantity, explanation } = body

    if (!lineId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Thiếu lineId' } },
        { status: 400 }
      )
    }

    if (action === 'MAP_ITEM') {
      if (!itemId) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng chọn mã hàng để ánh xạ' } },
          { status: 400 }
        )
      }
      const updated = await mapStocktakeLineItem(id, lineId, itemId, session)
      return NextResponse.json({ data: updated })
    }

    if (action === 'UPDATE_COUNTED_QTY') {
      if (countedQuantity === undefined || countedQuantity === null || countedQuantity < 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Số lượng kiểm kê không hợp lệ' } },
          { status: 400 }
        )
      }
      const updated = await updateStocktakeLineCountedQty(id, lineId, Number(countedQuantity), session)
      return NextResponse.json({ data: updated })
    }

    if (action === 'UPDATE_EXPLANATION') {
      const updated = await updateStocktakeLineExplanation(id, lineId, String(explanation || ''), session)
      return NextResponse.json({ data: updated })
    }

    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Action không hợp lệ (MAP_ITEM, UPDATE_COUNTED_QTY, UPDATE_EXPLANATION)' } },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: 400 }
    )
  }
}
