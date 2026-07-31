import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { COOKIE_NAME } from '@/config/constants'

const sessionSecretEnv = process.env.SESSION_SECRET
if (process.env.NODE_ENV === 'production' && (!sessionSecretEnv || sessionSecretEnv.length < 32)) {
  throw new Error('Môi trường Production yêu cầu SESSION_SECRET phải được cấu hình và dài tối thiểu 32 ký tự!')
}

const SECRET_KEY = new TextEncoder().encode(
  sessionSecretEnv ?? 'demo-secret-change-in-production-must-be-32-chars-minimum'
)

// Public paths without authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/switch-demo-user',
  '/api/health',
  '/403',
]

// Role-based route access list
const ROUTE_ROLES: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/accounting': ['WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'],
  '/dashboard': ['ACCOUNTING_MANAGER', 'ADMIN', 'VIEWER', 'WORKSHOP_MANAGER'],
  '/mobile': ['WORKSHOP_STAFF', 'WORKSHOP_MANAGER', 'WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  // Allow static files & metadata
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME)
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY)
    const role = payload.role as string

    // Check role-based route permissions
    for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ROLES)) {
      if (pathname.startsWith(routePrefix)) {
        if (!allowedRoles.includes(role)) {
          // Forbidden -> Redirect to 403 page
          const forbiddenUrl = new URL('/403', request.url)
          forbiddenUrl.searchParams.set('role', role)
          forbiddenUrl.searchParams.set('path', pathname)
          return NextResponse.redirect(forbiddenUrl)
        }
        break
      }
    }

    // Pass user metadata to request headers for Server Components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id as string)
    requestHeaders.set('x-user-role', role)
    requestHeaders.set('x-user-workshop', (payload.workshopId as string) ?? '')

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  } catch {
    // Invalid or expired JWT token -> redirect to login
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const middleware = proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
  ],
}
