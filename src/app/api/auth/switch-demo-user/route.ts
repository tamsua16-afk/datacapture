import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { COOKIE_NAME, SESSION_MAX_AGE, IS_DEMO_MODE } from '@/config/constants'
import { DEMO_USERS } from '@/config/demo'
import { createSessionToken } from '@/lib/auth/session'

const switchUserSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  // User switcher chỉ hoạt động trong demo mode
  if (!IS_DEMO_MODE) {
    return NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Tính năng chuyển nhanh tài khoản chỉ hoạt động khi ở Chế độ Demo (DEMO_MODE=true)',
        },
      },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const parsed = switchUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email không hợp lệ' } },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const demoUser = DEMO_USERS.find(u => u.email === email)

    if (!demoUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tài khoản demo không tồn tại' } },
        { status: 404 }
      )
    }

    const sessionUser = {
      id: demoUser.id,
      email: demoUser.email,
      fullName: demoUser.fullName,
      role: demoUser.role,
      workshopId: demoUser.workshopId,
    }

    const token = await createSessionToken(sessionUser)

    let redirectUrl = '/mobile'
    if (['WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER'].includes(demoUser.role)) {
      redirectUrl = '/accounting/queue'
    } else if (demoUser.role === 'ADMIN') {
      redirectUrl = '/admin/users'
    } else if (demoUser.role === 'VIEWER') {
      redirectUrl = '/dashboard'
    }

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      redirectUrl,
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[AUTH] Switch demo user error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Không thể chuyển đổi tài khoản' } },
      { status: 500 }
    )
  }
}
