'use client'

import { useState, useEffect } from 'react'
import { DocumentDetailModal } from '@/components/accounting/DocumentDetailModal'
import { UnmappedItemsQueue } from '@/components/accounting/UnmappedItemsQueue'
import type { RiskLevel } from '@/types/review'
import { RISK_LABELS } from '@/types/review'

export default function AccountingQueuePage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'unmapped'>('queue')
  const [queue, setQueue] = useState<any[]>([])
  const [workshops, setWorkshops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  // Filters state
  const [search, setSearch] = useState('')
  const [workshopId, setWorkshopId] = useState('')
  const [status, setStatus] = useState('PENDING_REVIEW')
  const [riskLevel, setRiskLevel] = useState('ALL')
  const [transactionType, setTransactionType] = useState('')
  const [sortBy, setSortBy] = useState('risk')

  const fetchWorkshops = async () => {
    try {
      const res = await fetch('/api/workshops')
      const data = await res.json()
      if (data.data) setWorkshops(data.data)
    } catch {}
  }

  const fetchQueue = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (workshopId) params.set('workshopId', workshopId)
      if (status) params.set('status', status)
      if (riskLevel) params.set('riskLevel', riskLevel)
      if (transactionType) params.set('transactionType', transactionType)
      if (sortBy) params.set('sortBy', sortBy)

      const res = await fetch(`/api/transactions/review-queue?${params.toString()}`)
      const data = await res.json()
      setQueue(data.data || [])
    } catch (err) {
      console.error('Failed to fetch review queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkshops()
  }, [])

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchQueue()
    }
  }, [activeTab, workshopId, status, riskLevel, transactionType, sortBy])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchQueue()
  }

  const getRiskBadgeStyle = (risk: RiskLevel) => {
    switch (risk) {
      case 'NEGATIVE_STOCK':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      case 'DUPLICATE':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      case 'UNMAPPED_ITEM':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
      case 'UNIT_MISMATCH':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
      case 'LOW_CONFIDENCE':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
      case 'LONG_WAIT':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Hàng đợi kiểm duyệt chứng từ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kiểm tra thông tin trích xuất AI, mức rủi ro, dự kiến tồn kho và phê duyệt chứng từ
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'queue'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📋 Danh sách phiếu chờ
          </button>
          <button
            onClick={() => setActiveTab('unmapped')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'unmapped'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🔗 Hàng đợi ánh xạ mã hàng
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo mã phiếu, số chứng từ, ghi chú..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Workshop Filter */}
              <select
                value={workshopId}
                onChange={(e) => setWorkshopId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả xưởng</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {/* Risk Filter */}
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-semibold text-amber-600 dark:text-amber-400"
              >
                <option value="ALL">Mức rủi ro: Tất cả</option>
                <option value="NEGATIVE_STOCK">🔴 1. Âm kho</option>
                <option value="DUPLICATE">🟠 2. Trùng phiếu</option>
                <option value="UNMAPPED_ITEM">🟡 3. Chưa ánh xạ mã hàng</option>
                <option value="UNIT_MISMATCH">🟡 4. Sai đơn vị</option>
                <option value="LOW_CONFIDENCE">🔵 5. Confidence thấp</option>
                <option value="LONG_WAIT">🟣 6. Chờ lâu (&gt;24h)</option>
                <option value="NORMAL">⚪ 7. Bình thường</option>
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Trạng thái: Tất cả</option>
                <option value="PENDING_REVIEW">Chờ kiểm duyệt (PENDING_REVIEW)</option>
                <option value="USER_CONFIRMED">Xưởng đã xác nhận (USER_CONFIRMED)</option>
                <option value="NEEDS_REVISION">Cần chỉnh sửa (NEEDS_REVISION)</option>
                <option value="APPROVED">Đã duyệt (APPROVED)</option>
                <option value="REJECTED">Đã từ chối (REJECTED)</option>
              </select>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="risk">Sắp xếp: Ưu tiên Rủi ro (Cao → Thấp)</option>
                <option value="newest">Sắp xếp: Mới nhất</option>
                <option value="oldest">Sắp xếp: Cũ nhất</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all cursor-pointer min-h-[44px]"
              >
                Lọc dữ liệu
              </button>
            </form>
          </div>

          {/* Queue List / Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Đang tải danh sách hàng đợi kiểm duyệt...
              </div>
            ) : queue.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="text-3xl mb-2">📥</div>
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                  Không có phiếu nào trong hàng đợi
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Thử thay đổi bộ lọc hoặc kiểm tra lại các xưởng.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Ưu tiên Rủi ro</th>
                      <th className="p-4">Mã phiếu / Số chứng từ</th>
                      <th className="p-4">Loại phiếu</th>
                      <th className="p-4">Xưởng lập</th>
                      <th className="p-4 text-center">Số lượng hàng</th>
                      <th className="p-4 text-center">Độ tin cậy AI</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {queue.map((tx) => {
                      const primaryRisk = tx.riskAssessment?.primaryRisk as RiskLevel
                      const badgeStyle = getRiskBadgeStyle(primaryRisk)

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          onClick={() => setSelectedTxId(tx.id)}
                        >
                          {/* Risk Level Badges */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}>
                              {RISK_LABELS[primaryRisk] || primaryRisk}
                            </span>

                            {/* Additional risk badges if any */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tx.riskAssessment?.riskFlags?.slice(1).map((flag: RiskLevel) => (
                                <span
                                  key={flag}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                >
                                  {RISK_LABELS[flag]}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Code & Doc Number */}
                          <td className="p-4">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 block text-sm">
                              {tx.transactionCode}
                            </span>
                            {tx.documentNumber ? (
                              <span className="text-slate-400 font-mono text-[11px]">
                                C/T: {tx.documentNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Không số C/T</span>
                            )}
                          </td>

                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                            {tx.transactionType}
                          </td>

                          <td className="p-4">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {tx.workshopName}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {tx.senderName || 'Nhân viên xưởng'}
                            </span>
                          </td>

                          <td className="p-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {tx.lineCount} dòng ({tx.attachmentCount} ảnh)
                          </td>

                          <td className="p-4 text-center font-mono font-bold">
                            <span className={tx.overallConfidence && tx.overallConfidence < 0.8 ? 'text-amber-500' : 'text-emerald-500'}>
                              {tx.overallConfidence ? `${Math.round(tx.overallConfidence * 100)}%` : '100%'}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              tx.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              tx.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                              tx.status === 'NEEDS_REVISION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {tx.status}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTxId(tx.id)
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow transition-all cursor-pointer min-h-[44px]"
                            >
                              Xem & Phê duyệt
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab Unmapped Items Queue */
        <UnmappedItemsQueue />
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
        onActionComplete={() => {
          fetchQueue()
        }}
      />
    </div>
  )
}
