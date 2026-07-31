import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { confirmStocktakeSession } from '@/lib/services/stocktakeService'

import { authorizeMutation } from '@/lib/auth/permissions'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request)
  const auth = authorizeMutation(session)
  if (!auth.allowed) {
    return NextResponse.json(
      { error: { code: auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: auth.message } },
      { status: auth.status }
    )
  }

  const { id } = await context.params

  try {
    const updated = await confirmStocktakeSession(id, session!)
    return NextResponse.json({ data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: 400 }
    )
  }
}
