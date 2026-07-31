import { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { COOKIE_NAME, SESSION_MAX_AGE } from '@/config/constants'
import { UserRole } from '@/types/enums'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  workshopId: string | null
}

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'demo-secret-change-in-production-must-be-32-chars-minimum'
)

/**
 * Tạo JWT token cho phiên làm việc của người dùng
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    workshopId: user.workshopId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SECRET_KEY)
}

/**
 * Trích xuất và verify JWT token từ NextRequest hoặc Cookie header
 */
export async function getAuthSession(
  request?: NextRequest | Request
): Promise<SessionUser | null> {
  try {
    let token: string | undefined

    if (request && 'cookies' in request && typeof request.cookies.get === 'function') {
      token = request.cookies.get(COOKIE_NAME)?.value
    }

    if (!token && request) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const match = cookieHeader
          .split(';')
          .map(c => c.trim())
          .find(c => c.startsWith(`${COOKIE_NAME}=`))
        if (match) {
          token = match.substring(COOKIE_NAME.length + 1)
        }
      }
    }

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, SECRET_KEY)
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as UserRole,
      workshopId: (payload.workshopId as string) ?? null,
    }
  } catch {
    return null
  }
}
