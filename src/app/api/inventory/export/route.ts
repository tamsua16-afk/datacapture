import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { exportTransactionsToCsv } from '@/lib/services/exportService'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workshopId = searchParams.get('workshopId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const txIdsParam = searchParams.get('transactionIds')
    const transactionIds = txIdsParam ? txIdsParam.split(',') : undefined

    let effectiveWorkshopId = workshopId
    if (['WORKSHOP_STAFF', 'WORKSHOP_MANAGER'].includes(session.role) && session.workshopId) {
      effectiveWorkshopId = session.workshopId
    }

    const result = await exportTransactionsToCsv(session, {
      workshopId: effectiveWorkshopId,
      startDate,
      endDate,
      transactionIds,
    })

    const response = new NextResponse(result.csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="giao-dich-kho-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })

    return response
  } catch (error: any) {
    console.error('API /api/inventory/export error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi xuất CSV giao dịch' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { workshopId, startDate, endDate, transactionIds } = body

    let effectiveWorkshopId = workshopId
    if (['WORKSHOP_STAFF', 'WORKSHOP_MANAGER'].includes(session.role) && session.workshopId) {
      effectiveWorkshopId = session.workshopId
    }

    const result = await exportTransactionsToCsv(session, {
      workshopId: effectiveWorkshopId,
      startDate,
      endDate,
      transactionIds,
    })

    return new NextResponse(result.csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="giao-dich-kho-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('API POST /api/inventory/export error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi xuất CSV giao dịch' },
      { status: 500 }
    )
  }
}
