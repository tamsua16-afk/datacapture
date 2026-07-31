import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { saveDraftTransaction, getMobileTransactions } from '@/lib/services/transactions'

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  try {
    const transactions = await getMobileTransactions(session.id, session.workshopId)
    return NextResponse.json({ data: transactions })
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
    const {
      id,
      transactionType,
      workshopId,
      sourceWarehouseId,
      destinationWarehouseId,
      documentNumber,
      transactionDate,
      notes,
    } = body

    if (!transactionType || !workshopId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Thiếu thông tin bắt buộc: loại phiếu và xưởng',
          },
        },
        { status: 400 }
      )
    }

    const tx = await saveDraftTransaction({
      id,
      transactionType,
      workshopId,
      sourceWarehouseId,
      destinationWarehouseId,
      documentNumber,
      transactionDate,
      notes,
      senderUserId: session.id,
    })

    return NextResponse.json({ data: tx })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
