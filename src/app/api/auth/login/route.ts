import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { COOKIE_NAME, SESSION_MAX_AGE, IS_DEMO_MODE } from '@/config/constants'
import { DEMO_USERS } from '@/config/demo'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'demo-secret-change-in-production-must-be-32-chars-minimum'
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' } },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // ── Demo Mode Auth ────────────────────────────────────────────────────────
    if (IS_DEMO_MODE) {
      const demoUser = DEMO_USERS.find(
        u => u.email === email && u.password === password
      )

      if (!demoUser) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Email hoặc mật khẩu không đúng' } },
          { status: 401 }
        )
      }

      const sessionUser = {
        id: demoUser.id,
        email: demoUser.email,
        fullName: demoUser.fullName,
        role: demoUser.role,
        workshopId: demoUser.workshopId,
      }

      const token = await new SignJWT(sessionUser)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(SECRET_KEY)

      const response = NextResponse.json({ user: sessionUser })
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      })

      return response
    }

    // ── Production Auth (Supabase) ────────────────────────────────────────────
    // TODO: Implement Supabase auth in Milestone 1
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: 'Chế độ production chưa được cấu hình. Dùng DEMO_MODE=true.' } },
      { status: 501 }
    )
  } catch (err) {
    console.error('[AUTH] Login error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại' } },
      { status: 500 }
    )
  }
}
