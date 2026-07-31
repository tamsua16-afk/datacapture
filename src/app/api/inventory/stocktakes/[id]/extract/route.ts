import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { processStocktakeExtraction } from '@/lib/services/stocktakeService'

export async function POST(
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
    const { lines } = body

    if (!Array.isArray(lines)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu danh mục kiểm kê không hợp lệ' } },
        { status: 400 }
      )
    }

    const updatedStocktake = await processStocktakeExtraction(id, lines, session)
    return NextResponse.json({ data: updatedStocktake })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: 400 }
    )
  }
}
