import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getReviewQueue, ReviewQueueFilter } from '@/lib/services/reviewService'

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
  const status = searchParams.get('status') || undefined
  const riskLevel = searchParams.get('riskLevel') || undefined
  const transactionType = searchParams.get('transactionType') || undefined
  const search = searchParams.get('search') || undefined
  const sortBy = (searchParams.get('sortBy') as any) || 'risk'
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  try {
    const filters: ReviewQueueFilter = {
      workshopId,
      status,
      riskLevel,
      transactionType,
      search,
      sortBy,
      startDate,
      endDate,
    }

    const queue = await getReviewQueue(filters)
    return NextResponse.json({ data: queue })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
