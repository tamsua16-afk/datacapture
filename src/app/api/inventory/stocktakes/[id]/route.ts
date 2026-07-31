import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getStocktakeById } from '@/lib/services/stocktakeService'

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
    return NextResponse.json({ data: stocktake })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: error.message } },
      { status: 404 }
    )
  }
}
