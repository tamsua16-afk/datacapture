import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { quickSearchMasterData } from '@/lib/services/masterData'

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req)
  if (!session) {
    return NextResponse.json({ error: { message: 'Chưa đăng nhập' } }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  try {
    const results = await quickSearchMasterData(q)
    return NextResponse.json({ data: results })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 })
  }
}
