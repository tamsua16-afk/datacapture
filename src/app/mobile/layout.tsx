import { headers } from 'next/headers'
import Link from 'next/link'
import { UserSwitcher } from '@/components/auth/UserSwitcher'
import { UserRole, USER_ROLE_LABELS } from '@/types/enums'
import { DEMO_WORKSHOPS } from '@/config/demo'

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const userRole = (headersList.get('x-user-role') as UserRole) || 'WORKSHOP_STAFF'
  const workshopId = headersList.get('x-user-workshop')
  const workshop = DEMO_WORKSHOPS.find(w => w.id === workshopId)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col relative pb-20">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-blue-700 dark:bg-slate-800 text-white px-4 py-3 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-blue-200 dark:text-blue-400">
                {workshop ? workshop.name : 'Data Capture - Ứng dụng số hóa'}
              </div>
              <h1 className="text-base font-bold leading-tight flex items-center gap-2">
                Mobile Capture
                <span className="text-[10px] bg-blue-800 dark:bg-blue-900 px-1.5 py-0.5 rounded-md text-blue-100">
                  {USER_ROLE_LABELS[userRole]}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <UserSwitcher currentRole={userRole} />
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  title="Đăng xuất"
                  className="p-2 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-blue-600 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4">{children}</main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 z-30 w-full max-w-md bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-2 flex items-center justify-around shadow-lg">
          <Link
            href="/mobile"
            className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-h-[44px] min-w-[44px] justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[11px] font-medium">Trang chủ</span>
          </Link>

          <Link
            href="/mobile/transactions/new"
            className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-h-[44px] min-w-[44px] justify-center"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center -mt-5 shadow-md border-2 border-white dark:border-slate-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[11px] font-medium">Tạo phiếu</span>
          </Link>

          <Link
            href="/mobile/transactions"
            className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-h-[44px] min-w-[44px] justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[11px] font-medium">Danh sách</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
