import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { approveTransaction, returnTransaction, rejectTransaction } from '@/lib/services/reviewService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  const { id } = await params
  try {
    const body = await request.json()
    const { action, reason, comment } = body

    if (action === 'APPROVE') {
      const result = await approveTransaction(id, session, comment)
      return NextResponse.json({ data: result })
    }

    if (action === 'RETURN') {
      const result = await returnTransaction(id, session, reason)
      return NextResponse.json({ data: result })
    }

    if (action === 'REJECT') {
      const result = await rejectTransaction(id, session, reason)
      return NextResponse.json({ data: result })
    }

    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Hành động không hợp lệ (APPROVE, RETURN, REJECT)' } },
      { status: 400 }
    )
  } catch (error: any) {
    const isPermissionError = error.message?.includes('quyền')
    const isValidationError = error.message?.includes('lý do') || error.message?.includes('không thể')

    const status = isPermissionError ? 403 : isValidationError ? 400 : 500
    const code = isPermissionError ? 'FORBIDDEN' : isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'

    return NextResponse.json(
      { error: { code, message: error.message } },
      { status }
    )
  }
}
