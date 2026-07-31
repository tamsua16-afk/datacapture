import Link from 'next/link'
import { headers } from 'next/headers'
import { UserSwitcher } from '@/components/auth/UserSwitcher'
import { UserRole, USER_ROLE_LABELS } from '@/types/enums'

function getHomeForRole(role?: string): string {
  switch (role) {
    case 'WAREHOUSE_ACCOUNTANT':
    case 'ACCOUNTING_MANAGER':
      return '/accounting/queue'
    case 'ADMIN':
      return '/admin/users'
    case 'VIEWER':
      return '/dashboard'
    default:
      return '/mobile'
  }
}

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; path?: string }>
}) {
  const headersList = await headers()
  const params = await searchParams
  
  const role = (params.role || headersList.get('x-user-role')) as UserRole | undefined
  const path = params.path ?? 'trang này'
  const homeUrl = getHomeForRole(role)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-700/80 flex flex-col items-center">
        {/* Lock Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">403</h1>
        <h2 className="text-xl font-bold text-red-400 mb-3">Truy cập bị từ chối</h2>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Tài khoản của bạn với vai trò{' '}
          <span className="font-semibold text-amber-300">
            {role ? USER_ROLE_LABELS[role] : 'không xác định'}
          </span>{' '}
          không có đủ quyền hạn để truy cập đường dẫn <code className="px-1.5 py-0.5 bg-slate-950 rounded text-red-300 text-xs">{path}</code>.
        </p>

        <div className="w-full flex flex-col gap-3">
          <Link
            href={homeUrl}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Quay lại trang chính
          </Link>

          <div className="pt-4 border-t border-slate-700/60 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">Đang ở chế độ Demo? Đổi vai trò để thử nghiệm:</span>
            <UserSwitcher currentRole={role} />
          </div>
        </div>
      </div>
    </div>
  )
}
