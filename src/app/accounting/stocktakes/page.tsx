'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { STOCKTAKE_STATUS_LABELS } from '@/types/enums'

interface StocktakeItem {
  id: string
  code: string
  workshopId: string
  workshopName: string
  warehouseId: string
  warehouseName: string
  stocktakeDate: string
  status: string
  createdBy: string
  createdByName: string
  totalItems: number
  matchedItems: number
  surplusItems: number
  shortageItems: number
  unmappedItems: number
  createdAt: string
}

interface Workshop {
  id: string
  code: string
  name: string
}

interface Warehouse {
  id: string
  code: string
  name: string
  workshopId: string
}

export default function StocktakesListPage() {
  const [stocktakes, setStocktakes] = useState<StocktakeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createWorkshopId, setCreateWorkshopId] = useState('')
  const [createWarehouseId, setCreateWarehouseId] = useState('')
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Fetch Master Data
  useEffect(() => {
    async function fetchMasterData() {
      try {
        const [wsRes, whRes] = await Promise.all([
          fetch('/api/workshops').then((r) => r.json()),
          fetch('/api/admin/warehouses').then((r) => r.json()),
        ])
        if (wsRes.data) setWorkshops(wsRes.data)
        if (whRes.data) setWarehouses(whRes.data)
      } catch (err) {
        console.error('Lỗi tải danh mục master data:', err)
      }
    }
    fetchMasterData()
  }, [])

  // Fetch Stocktakes list
  const fetchStocktakes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedWorkshop) params.set('workshopId', selectedWorkshop)
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse)
      if (selectedStatus) params.set('status', selectedStatus)
      if (search) params.set('search', search)

      const res = await fetch(`/api/inventory/stocktakes?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Lỗi tải danh sách kiểm kê')
      }

      setStocktakes(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedWorkshop, selectedWarehouse, selectedStatus, search])

  useEffect(() => {
    fetchStocktakes()
  }, [fetchStocktakes])

  // Handle Create Stocktake
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createWorkshopId || !createWarehouseId || !createDate) {
      setCreateError('Vui lòng điền đầy đủ Xưởng, Kho và Ngày kiểm kê')
      return
    }

    setCreateLoading(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/inventory/stocktakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId: createWorkshopId,
          warehouseId: createWarehouseId,
          stocktakeDate: new Date(createDate).toISOString(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Không thể tạo đợt kiểm kê')
      }

      setIsModalOpen(false)
      fetchStocktakes()
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  const filteredWarehousesForCreate = warehouses.filter(
    (wh) => !createWorkshopId || wh.workshopId === createWorkshopId
  )

  const filteredWarehousesForFilter = warehouses.filter(
    (wh) => !selectedWorkshop || wh.workshopId === selectedWorkshop
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kiểm kê & Khớp tồn kho (Stocktake & Reconciliation)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tạo đợt kiểm kê, trích xuất dữ liệu, đối chiếu số dư sổ sách và tạo đề xuất điều chỉnh nháp.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 min-h-[44px] cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo đợt kiểm kê mới
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mã đợt / Kho</label>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm min-h-[40px] focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Workshop Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Xưởng sản xuất</label>
          <select
            value={selectedWorkshop}
            onChange={(e) => {
              setSelectedWorkshop(e.target.value)
              setSelectedWarehouse('')
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm min-h-[40px] outline-none"
          >
            <option value="">-- Tất cả xưởng --</option>
            {workshops.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.code} - {ws.name}
              </option>
            ))}
          </select>
        </div>

        {/* Warehouse Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kho kiểm kê</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm min-h-[40px] outline-none"
          >
            <option value="">-- Tất cả kho --</option>
            {filteredWarehousesForFilter.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.code} - {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Trạng thái</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm min-h-[40px] outline-none"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="DRAFT">Nháp</option>
            <option value="IN_PROGRESS">Đang kiểm kê</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="ADJUSTED">Đã tạo điều chỉnh</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <button
            onClick={() => {
              setSelectedWorkshop('')
              setSelectedWarehouse('')
              setSelectedStatus('')
              setSearch('')
            }}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl min-h-[40px] transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Stocktakes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Đang tải danh sách kiểm kê...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-semibold">{error}</div>
        ) : stocktakes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Không có đợt kiểm kê nào phù hợp với điều kiện tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Mã đợt</th>
                  <th className="py-3.5 px-4">Ngày kiểm</th>
                  <th className="py-3.5 px-4">Xưởng & Kho</th>
                  <th className="py-3.5 px-4">Thống kê chênh lệch</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Người tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stocktakes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {new Date(item.stocktakeDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.warehouseName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.workshopName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Tong: {item.totalItems}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Khop: {item.matchedItems}
                        </span>
                        {item.surplusItems > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Thua: +{item.surplusItems}
                          </span>
                        )}
                        {item.shortageItems > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            Thieu: -{item.shortageItems}
                          </span>
                        )}
                        {item.unmappedItems > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Chua anh xa: {item.unmappedItems}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : item.status === 'ADJUSTED'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {STOCKTAKE_STATUS_LABELS[item.status as keyof typeof STOCKTAKE_STATUS_LABELS] || item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {item.createdByName}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/accounting/stocktakes/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                      >
                        Chi tiết đối chiếu
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create Stocktake Session */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tạo đợt kiểm kê mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Chọn Xưởng sản xuất <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createWorkshopId}
                  onChange={(e) => {
                    setCreateWorkshopId(e.target.value)
                    setCreateWarehouseId('')
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="">-- Chọn Xưởng --</option>
                  {workshops.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.code} - {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Chọn Kho kiểm kê <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createWarehouseId}
                  onChange={(e) => setCreateWarehouseId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="">-- Chọn Kho --</option>
                  {filteredWarehousesForCreate.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.code} - {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3. Ngày kiểm kê (Cố định mốc tồn quá khứ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * Số dư tồn trên sổ sách (`book quantity`) sẽ được chốt tại đúng mốc thời gian ngày kiểm kê này.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Đang khởi tạo...' : 'Tạo đợt kiểm kê'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
