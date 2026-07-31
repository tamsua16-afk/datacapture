import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    )
  }

  return NextResponse.json({ user: session })
}
