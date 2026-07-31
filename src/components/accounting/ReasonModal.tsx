'use client'

import { useState } from 'react'

interface ReasonModalProps {
  isOpen: boolean
  title: string
  actionType: 'RETURN' | 'REJECT'
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}

export function ReasonModal({
  isOpen,
  title,
  actionType,
  onClose,
  onSubmit,
}: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanReason = reason.trim()
    if (!cleanReason) {
      setError('Vui lòng nhập lý do cụ thể.')
      return
    }

    try {
      setLoading(true)
      setError('')
      await onSubmit(cleanReason)
      setReason('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi thực hiện thao tác.')
    } finally {
      setLoading(false)
    }
  }

  const isReject = actionType === 'REJECT'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
            isReject ? 'bg-rose-500' : 'bg-amber-500'
          }`}>
            {isReject ? '✕' : '↩'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500">Bắt buộc nhập lý do xử lý phiếu này</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              placeholder={
                isReject
                  ? 'Ví dụ: Phiếu chụp không rõ nét, trùng số chứng từ, thiếu chữ ký...'
                  : 'Ví dụ: Đơn vị tính bị nhầm, cần bổ sung mã hàng chính xác...'
              }
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer min-h-[44px] flex items-center gap-2 ${
                isReject
                  ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                  : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
              }`}
            >
              {loading ? 'Đang xử lý...' : isReject ? 'Xác nhận Từ chối' : 'Xác nhận Trả lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
