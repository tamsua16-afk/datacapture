'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IS_DEMO_MODE } from '@/config/constants'
import { DEMO_USERS, DEMO_WORKSHOPS } from '@/config/demo'
import { USER_ROLE_LABELS, UserRole } from '@/types/enums'

interface UserSwitcherProps {
  currentEmail?: string
  currentRole?: UserRole
  className?: string
}

export function UserSwitcher({ currentEmail, currentRole, className = '' }: UserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Không hiển thị nếu không ở Chế độ Demo
  if (!IS_DEMO_MODE) {
    return null
  }

  const handleSwitchUser = async (email: string) => {
    if (email === currentEmail || isLoading) return
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/switch-demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (res.ok && data.redirectUrl) {
        setIsOpen(false)
        router.push(data.redirectUrl)
        router.refresh()
      } else {
        alert(data.error?.message ?? 'Đã xảy ra lỗi khi chuyển người dùng')
      }
    } catch {
      alert('Không thể kết nối đến máy chủ')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/80 rounded-xl shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all cursor-pointer min-h-[44px]"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-800 dark:text-amber-300 font-bold">DEMO:</span>
          <span>{currentRole ? USER_ROLE_LABELS[currentRole] : 'Đổi vai trò'}</span>
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-72 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">
              Chuyển nhanh tài khoản Demo
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {DEMO_USERS.map((user) => {
                const isSelected = user.email === currentEmail
                const workshop = DEMO_WORKSHOPS.find(w => w.id === user.workshopId)

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user.email)}
                    disabled={isLoading}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex flex-col gap-0.5 min-h-[44px] ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {user.fullName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {USER_ROLE_LABELS[user.role]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{user.email}</span>
                      {workshop && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {workshop.name}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
