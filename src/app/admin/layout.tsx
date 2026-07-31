import { headers } from 'next/headers'
import Link from 'next/link'
import { UserSwitcher } from '@/components/auth/UserSwitcher'
import { UserRole, USER_ROLE_LABELS } from '@/types/enums'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const userRole = (headersList.get('x-user-role') as UserRole) || 'ADMIN'

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Admin Top Header */}
      <header className="bg-slate-950 text-white px-6 py-3 shadow-md flex items-center justify-between border-b border-red-900/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-lg text-white">
            A
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-red-400">Quản trị Hệ thống (Admin)</h1>
            <p className="text-xs text-slate-400">Data Capture - Ứng dụng số hóa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-950 text-red-300 border border-red-800">
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

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Quản lý danh mục
          </div>

          <Link
            href="/admin/users"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Người dùng & Quyền
          </Link>

          <Link
            href="/admin/workshops"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h5m-5 0V12m0 0h4m-4 0H9" />
            </svg>
            Danh sách Xưởng
          </Link>

          <Link
            href="/admin/warehouses"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            Danh sách Kho
          </Link>

          <Link
            href="/admin/items"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Danh mục Hàng hóa
          </Link>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2 mt-4">
            Cấu hình
          </div>

          <Link
            href="/admin/settings"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cấu hình Hệ thống
          </Link>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
