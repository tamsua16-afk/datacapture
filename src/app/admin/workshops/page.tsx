'use client'

import { useState, useEffect } from 'react'

interface Workshop {
  id: string
  code: string
  name: string
  address: string | null
  managerName: string | null
  isActive: boolean
  warehouseCount: number
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWs, setEditingWs] = useState<Workshop | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formManager, setFormManager] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchWorkshops = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/workshops')
      const json = await res.json()
      if (json.data) setWorkshops(json.data)
      else if (json.error) setError(json.error.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkshops()
  }, [])

  const openCreateModal = () => {
    setEditingWs(null)
    setFormCode('')
    setFormName('')
    setFormAddress('')
    setFormManager('')
    setFormIsActive(true)
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (ws: Workshop) => {
    setEditingWs(ws)
    setFormCode(ws.code)
    setFormName(ws.name)
    setFormAddress(ws.address || '')
    setFormManager(ws.managerName || '')
    setFormIsActive(ws.isActive)
    setError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        code: formCode,
        name: formName,
        address: formAddress,
        managerName: formManager,
        isActive: formIsActive,
      }

      const url = editingWs ? `/api/admin/workshops/${editingWs.id}` : '/api/admin/workshops'
      const method = editingWs ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Có lỗi xảy ra khi lưu')
      }

      setToast({
        type: 'success',
        message: editingWs ? `Đã cập nhật xưởng ${formCode}` : `Đã tạo xưởng ${formCode}`,
      })
      setIsModalOpen(false)
      fetchWorkshops()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (ws: Workshop) => {
    try {
      const res = await fetch(`/api/admin/workshops/${ws.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ws.isActive }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({
        type: 'success',
        message: ws.isActive ? `Đã khóa xưởng ${ws.code}` : `Đã mở khóa xưởng ${ws.code}`,
      })
      fetchWorkshops()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  const handleDelete = async (ws: Workshop) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa xưởng "${ws.name}" (${ws.code}) không?`)) return

    try {
      const res = await fetch(`/api/admin/workshops/${ws.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: `Đã xóa xưởng ${ws.code}` })
      fetchWorkshops()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/80 dark:border-red-800 dark:text-red-200'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs underline font-bold cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            Quản lý Danh sách Xưởng
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý các cơ sở sản xuất, mã xưởng duy nhất, quản đốc và trạng thái hoạt động.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Xưởng mới
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Đang tải dữ liệu xưởng...</div>
        ) : workshops.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Chưa có xưởng nào trong hệ thống.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Mã xưởng</th>
                  <th className="px-6 py-4">Tên xưởng</th>
                  <th className="px-6 py-4">Địa chỉ</th>
                  <th className="px-6 py-4">Quản đốc</th>
                  <th className="px-6 py-4 text-center">Số kho thuộc</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {workshops.map((ws) => (
                  <tr key={ws.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {ws.code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{ws.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{ws.address || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{ws.managerName || '—'}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">
                        {ws.warehouseCount} kho
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(ws)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                          ws.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800'
                        }`}
                      >
                        {ws.isActive ? '● Hoạt động' : '🔒 Đã khóa'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(ws)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium min-h-[44px] flex items-center gap-1 cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(ws)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium min-h-[44px] flex items-center gap-1 cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingWs ? `Cập nhật Xưởng: ${editingWs.code}` : 'Thêm Xưởng sản xuất mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Mã Xưởng (Unique) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="VD: XD-DAI-MO"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Tên Xưởng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Xưởng Đại Mỗ"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="VD: Nam Từ Liêm, Hà Nội"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Tên Quản đốc
                </label>
                <input
                  type="text"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[44px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Kích hoạt hoạt động (is_active = true)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm min-h-[44px] cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Xưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
