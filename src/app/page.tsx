import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_NAME } from '@/config/constants'

/**
 * Root page – redirect theo session.
 * Nếu chưa đăng nhập → /login
 * Nếu đã đăng nhập → redirect theo role
 */
export default async function RootPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  if (!session) {
    redirect('/login')
  }

  // Session hợp lệ → về trang chủ mobile (sẽ bị chặn bởi middleware nếu cần)
  redirect('/mobile')
}
