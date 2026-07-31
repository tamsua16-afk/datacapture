import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { createReversalTransaction } from '@/lib/services/ledgerService'

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
    const { reason } = body

    const result = await createReversalTransaction(id, session, reason)
    return NextResponse.json({ data: result })
  } catch (error: any) {
    const message = error.message || 'Lỗi xử lý tạo phiếu đảo'
    const isPermissionError = message.includes('quyền')
    const isValidationError = message.includes('bắt buộc') || message.includes('POSTED')

    const status = isPermissionError ? 403 : isValidationError ? 400 : 500
    const code = isPermissionError ? 'FORBIDDEN' : isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'

    return NextResponse.json(
      { error: { code, message } },
      { status }
    )
  }
}
