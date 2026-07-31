import { headers } from 'next/headers'
import Link from 'next/link'
import { UserSwitcher } from '@/components/auth/UserSwitcher'
import { UserRole, USER_ROLE_LABELS } from '@/types/enums'

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const userRole = (headersList.get('x-user-role') as UserRole) || 'WAREHOUSE_ACCOUNTANT'

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-6 py-3 shadow-md flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
            K
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Kế toán & Kiểm duyệt</h1>
            <p className="text-xs text-slate-400">Data Capture - Ứng dụng số hóa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-blue-400 border border-slate-700">
            {USER_ROLE_LABELS[userRole]}
          </span>
          <UserSwitcher currentRole={userRole} />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Chức năng kế toán
          </div>

          <Link
            href="/accounting/queue"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Hàng đợi kiểm duyệt
          </Link>

          <Link
            href="/accounting/ledger"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Sổ tồn kho chi tiết
          </Link>

          <Link
            href="/accounting/stocktakes"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Kiểm kê & Khớp tồn
          </Link>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2 mt-4">
            Báo cáo
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
            Dashboard tổng hợp
          </Link>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
