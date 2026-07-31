import type { Metadata } from 'next'
import { DEMO_USERS } from '@/config/demo'
import { USER_ROLE_LABELS } from '@/types/enums'

export const metadata: Metadata = {
  title: 'Quản lý Người dùng & Quyền',
  description: 'Danh sách người dùng và phân quyền hệ thống',
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản lý Người dùng & Quyền</h1>
          <p className="text-sm text-slate-500">Danh sách tài khoản hệ thống trong Chế độ Demo</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Họ và tên</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Vai trò</th>
              <th className="py-3 px-4">Xưởng</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {DEMO_USERS.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{user.fullName}</td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">{user.workshopId ?? 'Tất cả xưởng'}</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="text-xs font-semibold text-slate-400 cursor-not-allowed" disabled>
                    Chỉnh sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
