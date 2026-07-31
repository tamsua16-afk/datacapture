import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getUnmappedItemsQueue, mapUnmappedItem } from '@/lib/services/reviewService'

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const workshopId = searchParams.get('workshopId') || undefined

  try {
    const queue = await getUnmappedItemsQueue(workshopId)
    return NextResponse.json({ data: queue })
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
    const { lineId, targetItemId, createAlias } = body

    if (!lineId || !targetItemId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Thiếu lineId hoặc targetItemId' } },
        { status: 400 }
      )
    }

    const result = await mapUnmappedItem(lineId, targetItemId, Boolean(createAlias), session)
    return NextResponse.json({ data: result })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
