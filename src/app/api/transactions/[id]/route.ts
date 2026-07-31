import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getTransactionById, submitForAIProcessing, deleteAttachment } from '@/lib/services/transactions'

export async function GET(
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
    const tx = await getTransactionById(id)
    if (!tx) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy phiếu' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: tx })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { action, attachmentId, lines, notes, options } = body

    if (action === 'SUBMIT_AI') {
      const updatedTx = await submitForAIProcessing(id, options)
      return NextResponse.json({ data: updatedTx })
    }

    if (action === 'CONFIRM_TRANSACTION') {
      const { confirmExtractedTransaction } = await import('@/lib/services/transactions')
      const updatedTx = await confirmExtractedTransaction(id, lines || [], notes)
      return NextResponse.json({ data: updatedTx })
    }

    if (action === 'DELETE_ATTACHMENT' && attachmentId) {
      await deleteAttachment(attachmentId, id)
      const updatedTx = await getTransactionById(id)
      return NextResponse.json({ data: updatedTx })
    }

    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Thao tác không hợp lệ' } },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
