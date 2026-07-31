import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getInventoryPeriods, createInventoryPeriod, togglePeriodLock } from '@/lib/services/ledgerService'

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

  try {
    const periods = await getInventoryPeriods(workshopId)
    return NextResponse.json({ data: periods })
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
    const { action, periodId, isClosed, periodName, startDate, endDate, workshopId } = body

    if (action === 'TOGGLE_LOCK') {
      const result = await togglePeriodLock(periodId, Boolean(isClosed), session)
      return NextResponse.json({ data: result })
    }

    if (action === 'CREATE') {
      const result = await createInventoryPeriod({
        periodName,
        startDate,
        endDate,
        workshopId: workshopId || null,
      }, session)
      return NextResponse.json({ data: result })
    }

    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Action không hợp lệ (TOGGLE_LOCK, CREATE)' } },
      { status: 400 }
    )
  } catch (error: any) {
    const isPermissionError = error.message?.includes('quyền')
    const status = isPermissionError ? 403 : 400
    const code = isPermissionError ? 'FORBIDDEN' : 'VALIDATION_ERROR'

    return NextResponse.json(
      { error: { code, message: error.message } },
      { status }
    )
  }
}
