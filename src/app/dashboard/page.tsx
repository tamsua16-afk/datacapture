'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { DEMO_WORKSHOPS } from '@/config/demo'
import { DashboardData } from '@/lib/services/dashboardService'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import {
  Calendar,
  Filter,
  Download,
  Tv,
  Monitor,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react'

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [workshopId, setWorkshopId] = useState<string>('all')
  const [isTvMode, setIsTvMode] = useState<boolean>(false)

  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        timeRange,
        workshopId,
      })

      const res = await fetch(`/api/dashboard/stats?${queryParams.toString()}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Không thể tải dữ liệu dashboard')
      }

      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      } else {
        throw new Error(json.error || 'Dữ liệu không hợp lệ')
      }
    } catch (err: any) {
      console.error('Fetch dashboard stats error:', err)
      setError(err.message || 'Có lỗi xảy ra khi kết nối máy chủ')
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, workshopId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Xử lý Xuất CSV chuẩn Excel (UTF-8 BOM)
  const handleExportCsv = async () => {
    setIsExporting(true)
    setExportMessage(null)
    try {
      const queryParams = new URLSearchParams()
      if (workshopId && workshopId !== 'all') queryParams.set('workshopId', workshopId)

      const res = await fetch(`/api/inventory/export?${queryParams.toString()}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Xuất CSV thất bại')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `giao-dich-kho-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportMessage({
        type: 'success',
        text: 'Xuất file CSV giao dịch POSTED/EXPORT_READY thành công! (File UTF-8 BOM chuẩn Excel)',
      })

      // Refresh lại dashboard để cập nhật trạng thái phiếu nếu có đổi sang EXPORTED
      fetchStats()
    } catch (err: any) {
      console.error('Export CSV error:', err)
      setExportMessage({
        type: 'error',
        text: err.message || 'Quá trình xuất thất bại. Trạng thái phiếu được giữ nguyên.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 transition-all duration-300 ${isTvMode ? 'scale-[0.98]' : ''}`}>
      {/* ── HEADER & CONTROLS ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
              Dashboard Tổng Hợp Kho & Xưởng
            </h1>
            {isTvMode && (
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full border border-amber-500/40 font-mono flex items-center gap-1">
                <Tv className="w-3.5 h-3.5" /> Full HD TV Mode
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Giám sát thời gian thực KPI phiếu, thời gian xử lý AI, confidence, lỗi OCR & tồn kho
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* TV / Laptop view toggle */}
          <button
            onClick={() => setIsTvMode(!isTvMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isTvMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isTvMode ? <Monitor className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
            {isTvMode ? 'Chế độ Laptop' : 'Chế độ TV Full HD'}
          </button>

          {/* Time Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${timeRange === '7d' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${timeRange === '30d' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              30 ngày
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${timeRange === '90d' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              90 ngày
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${timeRange === 'all' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tất cả
            </button>
          </div>

          {/* Workshop Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <select
              value={workshopId}
              onChange={(e) => setWorkshopId(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none pr-2 cursor-pointer"
            >
              <option value="all">Tất cả xưởng</option>
              {DEMO_WORKSHOPS.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-slate-900 text-slate-200">
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Đang xuất CSV...' : 'Xuất CSV (Excel UTF-8)'}
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ────────────────────────────────────────────────── */}
      {exportMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between border ${
            exportMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {exportMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{exportMessage.text}</span>
          </div>
          <button
            onClick={() => setExportMessage(null)}
            className="text-slate-400 hover:text-white font-mono ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── CONTENT STATES (LOADING, ERROR, EMPTY, SUCCESS) ───────────────────── */}
      {isLoading ? (
        <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-slate-400 text-sm animate-pulse">Đang nạp dữ liệu thống kê từ cơ sở dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h3 className="text-lg font-bold text-slate-200">Không thể tải dữ liệu Dashboard</h3>
          <p className="text-xs text-rose-400 font-mono bg-rose-950/50 p-3 rounded-xl border border-rose-900">{error}</p>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      ) : !data || data.voucherKpis.totalVouchers === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-300">Không có dữ liệu giao dịch nào</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Không tìm thấy phiếu kho nào trong khoảng thời gian hoặc xưởng đã chọn. Vui lòng chọn bộ lọc khác.
          </p>
        </div>
      ) : (
        <DashboardCharts data={data} isTvMode={isTvMode} />
      )}
    </div>
  )
}
