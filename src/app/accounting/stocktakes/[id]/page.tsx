'use client'

import React, { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { StocktakePrintView } from '@/components/stocktake/StocktakePrintView'
import { STOCKTAKE_STATUS_LABELS } from '@/types/enums'

interface StocktakeLine {
  id: string
  stocktakeId: string
  itemId: string | null
  itemCode: string | null
  itemName: string | null
  rawItemName: string
  baseUnit: string | null
  bookQuantity: number
  countedQuantity: number
  differenceQuantity: number
  differencePercentage: number
  status: string
  explanation: string | null
  createdAt: string
  updatedAt: string
}

interface StocktakeDetail {
  id: string
  code: string
  workshopId: string
  workshopName: string
  workshopCode: string
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  stocktakeDate: string
  status: string
  createdBy: string
  createdByName: string
  confirmedBy: string | null
  confirmedByName: string | null
  createdAt: string
  lines: StocktakeLine[]
}

interface ItemOption {
  id: string
  code: string
  name: string
  baseUnit: string
}

export default function StocktakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: stocktakeId } = use(params)

  const [stocktake, setStocktake] = useState<StocktakeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Master items list for manual mapping dropdown
  const [masterItems, setMasterItems] = useState<ItemOption[]>([])
  const [filterTab, setFilterTab] = useState<'ALL' | 'MATCH' | 'SURPLUS' | 'SHORTAGE' | 'UNIDENTIFIED' | 'EXPLAINED'>('ALL')

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Action status message & proposal results
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [proposals, setProposals] = useState<any[] | null>(null)
  const [extracting, setExtracting] = useState(false)

  // Fetch Stocktake Details
  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Không thể tải chi tiết đợt kiểm kê')
      }
      setStocktake(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [stocktakeId])

  // Fetch Master Items
  useEffect(() => {
    async function loadMasterItems() {
      try {
        const res = await fetch('/api/master-data/items')
        const data = await res.json()
        if (data.data) setMasterItems(data.data)
      } catch (err) {
        console.error('Lỗi tải danh mục vật tư:', err)
      }
    }
    loadMasterItems()
    fetchDetail()
  }, [fetchDetail])

  // Handlers for Line Editing
  const handleMapItem = async (lineId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}/lines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MAP_ITEM', lineId, itemId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi ánh xạ mã hàng')

      setStocktake(data.data)
      setActionMessage({ type: 'success', text: 'Đã ánh xạ mã hàng thành công' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  const handleUpdateCountedQty = async (lineId: string, countedQty: number) => {
    try {
      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}/lines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_COUNTED_QTY', lineId, countedQuantity: countedQty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi cập nhật số kiểm kê')

      setStocktake(data.data)
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  const handleUpdateExplanation = async (lineId: string, explanation: string) => {
    try {
      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}/lines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_EXPLANATION', lineId, explanation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi lưu giải trình')

      setStocktake(data.data)
      setActionMessage({ type: 'success', text: 'Đã lưu giải trình nguyên nhân' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  // Trigger Mock AI extraction
  const handleMockAIExtract = async () => {
    setExtracting(true)
    setActionMessage(null)
    try {
      // Mock extracted lines from sample physical count sheet
      const sampleLines = [
        { rawItemName: 'Xi Măng Hoàng Thạch PCB40', countedQuantity: 48, itemCode: 'CEMENT-01' },
        { rawItemName: 'Cát vàng Sông Lô', countedQuantity: 105, itemCode: 'SAND-01' },
        { rawItemName: 'Thép phi 12 Việt Nhật', countedQuantity: 28, itemCode: 'STEEL-12' },
        { rawItemName: 'Vật tư lạ chưa dán tem barcode XYZ', countedQuantity: 5 },
      ]

      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: sampleLines }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi trích xuất AI')

      setStocktake(data.data)
      setActionMessage({ type: 'success', text: 'Trích xuất dữ liệu bảng kiểm kê bằng AI thành công!' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message })
    } finally {
      setExtracting(false)
    }
  }

  // Confirm Stocktake Session (Accountant)
  const handleConfirmStocktake = async () => {
    if (!confirm('Bạn có chắc chắn muốn XÁC NHẬN đợt kiểm kê này?')) return

    setActionMessage(null)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}/confirm`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Không thể xác nhận đợt kiểm kê')

      setStocktake(data.data)
      setActionMessage({ type: 'success', text: 'Đã xác nhận đợt kiểm kê thành công!' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  // Create Adjustment Proposal (Only Drafts)
  const handleCreateProposal = async () => {
    if (!confirm('Hệ thống sẽ tạo phiếu đề xuất điều chỉnh tăng/giảm ở TRẠNG THÁI NHÁP (DRAFT). Bạn có muốn tiếp tục?')) return

    setActionMessage(null)
    setProposals(null)
    try {
      const res = await fetch(`/api/inventory/stocktakes/${stocktakeId}/adjustment-proposal`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi tạo đề xuất điều chỉnh')

      setProposals(data.data?.proposals || [])
      setActionMessage({
        type: 'success',
        text: 'Đã tạo phiếu đề xuất điều chỉnh nháp thành công! (Lưu ý: Các phiếu chưa được ghi sổ tự động)',
      })
      fetchDetail()
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Đang tải chi tiết kiểm kê...</div>
  }

  if (error || !stocktake) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-red-500 font-bold">{error || 'Không tìm thấy thông tin đợt kiểm kê'}</p>
        <Link href="/accounting/stocktakes" className="text-blue-600 underline text-sm">
          Quay lại danh sách kiểm kê
        </Link>
      </div>
    )
  }

  // Summary Counters
  const totalCount = stocktake.lines.length
  const matchCount = stocktake.lines.filter((l) => l.status === 'MATCH').length
  const surplusCount = stocktake.lines.filter((l) => l.status === 'SURPLUS').length
  const shortageCount = stocktake.lines.filter((l) => l.status === 'SHORTAGE').length
  const unmappedCount = stocktake.lines.filter((l) => !l.itemId || l.status === 'UNIDENTIFIED').length
  const explainedCount = stocktake.lines.filter((l) => l.status === 'EXPLAINED').length

  // Filtered lines by Tab
  const displayLines = stocktake.lines.filter((l) => {
    if (filterTab === 'ALL') return true
    if (filterTab === 'MATCH') return l.status === 'MATCH'
    if (filterTab === 'SURPLUS') return l.status === 'SURPLUS'
    if (filterTab === 'SHORTAGE') return l.status === 'SHORTAGE'
    if (filterTab === 'UNIDENTIFIED') return !l.itemId || l.status === 'UNIDENTIFIED'
    if (filterTab === 'EXPLAINED') return l.status === 'EXPLAINED'
    return true
  })

  const isReadOnly = ['CONFIRMED', 'ADJUSTED'].includes(stocktake.status)

  return (
    <div className="p-6 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/accounting/stocktakes"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stocktake.code}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                stocktake.status === 'CONFIRMED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : stocktake.status === 'ADJUSTED'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {STOCKTAKE_STATUS_LABELS[stocktake.status as keyof typeof STOCKTAKE_STATUS_LABELS] || stocktake.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Đợt kiểm kê & đối chiếu số dư tồn kho
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mock AI Extract Button */}
          {!isReadOnly && (
            <button
              onClick={handleMockAIExtract}
              disabled={extracting}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {extracting ? 'AI đang trích xuất...' : 'Trích xuất bằng AI'}
            </button>
          )}

          {/* Confirm Button */}
          {stocktake.status !== 'CONFIRMED' && stocktake.status !== 'ADJUSTED' && (
            <button
              onClick={handleConfirmStocktake}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Kế toán xác nhận
            </button>
          )}

          {/* Create Proposal Button */}
          {stocktake.status !== 'ADJUSTED' && (
            <button
              onClick={handleCreateProposal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Tạo đề xuất điều chỉnh
            </button>
          )}

          {/* CSV Export */}
          <a
            href={`/api/inventory/stocktakes/${stocktakeId}/export`}
            download
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 min-h-[40px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Xuất CSV
          </a>

          {/* Print Button */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In biên bản
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Proposals Created Notice */}
      {proposals && proposals.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="font-bold flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Đã tạo {proposals.length} phiếu kho đề xuất điều chỉnh nháp (Chưa tự động ghi sổ):
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {proposals.map((p: any) => (
              <li key={p.id}>
                Phiếu <strong className="font-mono">{p.code}</strong> ({p.type === 'ADJUSTMENT_IN' ? 'Điều chỉnh Tăng' : 'Điều chỉnh Giảm'}) - Gồm {p.itemCount} mặt hàng - Trạng thái: <strong>{p.status}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fixed Scope Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Xưởng sản xuất</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">{stocktake.workshopName}</span>
          <span className="text-xs font-mono text-slate-400">Code: {stocktake.workshopCode}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Kho kiểm kê</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">{stocktake.warehouseName}</span>
          <span className="text-xs font-mono text-slate-400">Code: {stocktake.warehouseCode}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Ngày kiểm kê (Cố định tồn quá khứ)</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-1 block">
            {new Date(stocktake.stocktakeDate).toLocaleDateString('vi-VN')}
          </span>
          <span className="text-xs text-slate-400">Snapshot as of timestamp</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Người tạo & Xác nhận</span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 block">Tạo bởi: {stocktake.createdByName}</span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">
            Xác nhận: {stocktake.confirmedByName || 'Chưa xác nhận'}
          </span>
        </div>
      </div>

      {/* Summary Stat Badges & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilterTab('MATCH')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTab === 'MATCH'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            Khớp ({matchCount})
          </button>
          <button
            onClick={() => setFilterTab('SURPLUS')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTab === 'SURPLUS'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
            }`}
          >
            Thừa (+{surplusCount})
          </button>
          <button
            onClick={() => setFilterTab('SHORTAGE')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTab === 'SHORTAGE'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
            }`}
          >
            Thiếu (-{shortageCount})
          </button>
          <button
            onClick={() => setFilterTab('UNIDENTIFIED')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTab === 'UNIDENTIFIED'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
            }`}
          >
            Chưa ánh xạ ({unmappedCount})
          </button>
          {explainedCount > 0 && (
            <button
              onClick={() => setFilterTab('EXPLAINED')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterTab === 'EXPLAINED'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
              }`}
            >
              Đã giải trình ({explainedCount})
            </button>
          )}
        </div>
      </div>

      {/* Main Stocktake Lines Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                <th className="py-3.5 px-4 w-48">Mã & Ánh xạ Hàng hóa</th>
                <th className="py-3.5 px-4">Tên hàng / Mô tả trích xuất</th>
                <th className="py-3.5 px-4 w-20 text-center">ĐVT</th>
                <th className="py-3.5 px-4 w-28 text-right">Tồn sổ sách</th>
                <th className="py-3.5 px-4 w-32 text-right">Số thực tế</th>
                <th className="py-3.5 px-4 w-28 text-right">Chênh lệch</th>
                <th className="py-3.5 px-4 w-24 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 min-w-[220px]">Giải trình nguyên nhân (Xưởng trưởng)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {displayLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không có dòng đối chiếu nào trong tab này.
                  </td>
                </tr>
              ) : (
                displayLines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                      {idx + 1}
                    </td>

                    {/* Code & Item Mapping Selector */}
                    <td className="py-3.5 px-4">
                      {line.itemId ? (
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{line.itemCode}</span>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ Đã ánh xạ</div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            ⚠️ Chưa ánh xạ
                          </span>
                          {!isReadOnly && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) handleMapItem(line.id, e.target.value)
                              }}
                              className="w-full text-xs p-1.5 bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-slate-700 rounded-lg outline-none"
                            >
                              <option value="">-- Ánh xạ mã hàng --</option>
                              {masterItems.map((mi) => (
                                <option key={mi.id} value={mi.id}>
                                  {mi.code} - {mi.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Item Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {line.itemName || line.rawItemName}
                      </div>
                      {line.itemName && line.rawItemName !== line.itemName && (
                        <div className="text-xs text-slate-400">Trích xuất: "{line.rawItemName}"</div>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-3.5 px-4 text-center text-xs text-slate-600 dark:text-slate-400">
                      {line.baseUnit || '---'}
                    </td>

                    {/* Book Quantity (Snapshot at stocktakeDate) */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {line.bookQuantity.toLocaleString('vi-VN')}
                    </td>

                    {/* Counted Quantity Input */}
                    <td className="py-3.5 px-4 text-right">
                      {isReadOnly ? (
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {line.countedQuantity.toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          defaultValue={line.countedQuantity}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val) && val !== line.countedQuantity) {
                              handleUpdateCountedQty(line.id, val)
                            }
                          }}
                          className="w-24 text-right font-mono font-bold px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </td>

                    {/* Difference & Percentage */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-mono font-bold ${
                        line.differenceQuantity > 0 ? 'text-blue-600 dark:text-blue-400' : line.differenceQuantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {line.differenceQuantity > 0 ? `+${line.differenceQuantity}` : line.differenceQuantity}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {line.differencePercentage.toFixed(1)}%
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        line.status === 'MATCH'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : line.status === 'SURPLUS'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : line.status === 'SHORTAGE'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : line.status === 'EXPLAINED'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {line.status}
                      </span>
                    </td>

                    {/* Explanation Input */}
                    <td className="py-3.5 px-4">
                      {isReadOnly ? (
                        <div className="text-xs text-slate-700 dark:text-slate-300 italic">
                          {line.explanation || 'Không có giải trình'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nhập lý do chênh lệch..."
                          defaultValue={line.explanation || ''}
                          onBlur={(e) => {
                            if (e.target.value !== (line.explanation || '')) {
                              handleUpdateExplanation(line.id, e.target.value)
                            }
                          }}
                          className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print View Modal */}
      {showPrintModal && stocktake && (
        <StocktakePrintView
          stocktake={{
            code: stocktake.code,
            workshopName: stocktake.workshopName,
            workshopCode: stocktake.workshopCode,
            warehouseName: stocktake.warehouseName,
            warehouseCode: stocktake.warehouseCode,
            stocktakeDate: stocktake.stocktakeDate,
            status: stocktake.status,
            createdByName: stocktake.createdByName,
            confirmedByName: stocktake.confirmedByName,
            lines: stocktake.lines,
          }}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  )
}
