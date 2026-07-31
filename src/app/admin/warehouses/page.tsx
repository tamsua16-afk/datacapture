'use client'

import { useState, useEffect } from 'react'

interface Warehouse {
  id: string
  workshopId: string
  workshopName: string
  workshopCode: string
  code: string
  name: string
  warehouseType: string
  isActive: boolean
}

interface WorkshopOption {
  id: string
  code: string
  name: string
}

const WAREHOUSE_TYPES: Record<string, string> = {
  RAW_MATERIAL: 'Kho Nguyên vật liệu',
  SEMI_FINISHED: 'Kho Bán thành phẩm',
  FINISHED_GOODS: 'Kho Thành phẩm',
  TOOLS: 'Kho Công cụ - Dụng cụ',
  GENERAL: 'Kho Chung',
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([])
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null)
  const [formWorkshopId, setFormWorkshopId] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('GENERAL')
  const [formIsActive, setFormIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [whRes, wsRes] = await Promise.all([
        fetch(`/api/admin/warehouses${selectedWorkshop ? `?workshopId=${selectedWorkshop}` : ''}`),
        fetch('/api/admin/workshops'),
      ])
      const whJson = await whRes.json()
      const wsJson = await wsRes.json()

      if (whJson.data) setWarehouses(whJson.data)
      if (wsJson.data) setWorkshops(wsJson.data)
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedWorkshop])

  const openCreateModal = () => {
    setEditingWh(null)
    setFormWorkshopId(workshops[0]?.id || '')
    setFormCode('')
    setFormName('')
    setFormType('RAW_MATERIAL')
    setFormIsActive(true)
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (wh: Warehouse) => {
    setEditingWh(wh)
    setFormWorkshopId(wh.workshopId)
    setFormCode(wh.code)
    setFormName(wh.name)
    setFormType(wh.warehouseType)
    setFormIsActive(wh.isActive)
    setError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        workshopId: formWorkshopId,
        code: formCode,
        name: formName,
        warehouseType: formType,
        isActive: formIsActive,
      }

      const url = editingWh ? `/api/admin/warehouses/${editingWh.id}` : '/api/admin/warehouses'
      const method = editingWh ? 'PUT' : 'POST'

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
        message: editingWh ? `Đã cập nhật kho ${formCode}` : `Đã tạo kho ${formCode}`,
      })
      setIsModalOpen(false)
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (wh: Warehouse) => {
    try {
      const res = await fetch(`/api/admin/warehouses/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !wh.isActive }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({
        type: 'success',
        message: wh.isActive ? `Đã khóa kho ${wh.code}` : `Đã mở khóa kho ${wh.code}`,
      })
      fetchData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  const handleDelete = async (wh: Warehouse) => {
    if (!confirm(`Bạn có chắc muốn xóa kho "${wh.name}" (${wh.code}) không?`)) return

    try {
      const res = await fetch(`/api/admin/warehouses/${wh.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: `Đã xóa kho ${wh.code}` })
      fetchData()
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
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            Quản lý Danh sách Kho
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý các kho thuộc từng xưởng, loại kho (NVL, TP, CC-DC) và mã kho duy nhất.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Workshop Filter */}
          <select
            value={selectedWorkshop}
            onChange={(e) => setSelectedWorkshop(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none min-h-[44px]"
          >
            <option value="">Tất cả các Xưởng</option>
            {workshops.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.code} - {ws.name}
              </option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm Kho mới
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Đang tải danh sách kho...</div>
        ) : warehouses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Chưa có kho nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Mã kho</th>
                  <th className="px-6 py-4">Tên kho</th>
                  <th className="px-6 py-4">Xưởng trực thuộc</th>
                  <th className="px-6 py-4">Loại kho</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {warehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                      {wh.code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{wh.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {wh.workshopCode}
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-400 text-xs">{wh.workshopName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {WAREHOUSE_TYPES[wh.warehouseType] || wh.warehouseType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(wh)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                          wh.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800'
                        }`}
                      >
                        {wh.isActive ? '● Hoạt động' : '🔒 Đã khóa'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(wh)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium min-h-[44px] cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(wh)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium min-h-[44px] cursor-pointer"
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
                {editingWh ? `Cập nhật Kho: ${editingWh.code}` : 'Thêm Kho mới'}
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
                  Xưởng quản lý <span className="text-red-500">*</span>
                </label>
                <select
                  value={formWorkshopId}
                  onChange={(e) => setFormWorkshopId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[44px]"
                >
                  {workshops.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.code} - {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Mã Kho (Unique) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="VD: KHO-DM-NVL"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Tên Kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Kho Nguyên vật liệu Đại Mỗ"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Loại Kho
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[44px]"
                >
                  {Object.entries(WAREHOUSE_TYPES).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label} ({val})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="whIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
                <label htmlFor="whIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
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
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm min-h-[44px] cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
