'use client'

import React from 'react'
import * as echarts from 'echarts'
import { ReactECharts } from './ReactECharts'
import { DashboardData } from '@/lib/services/dashboardService'
import {
  FileText,
  Clock,
  Zap,
  AlertTriangle,
  Copy,
  AlertCircle,
  Link2,
  BarChart2,
  Building2,
  TrendingUp,
} from 'lucide-react'

interface DashboardChartsProps {
  data: DashboardData
  isTvMode?: boolean
}

export function DashboardCharts({ data, isTvMode = false }: DashboardChartsProps) {
  const {
    voucherKpis,
    processingTime,
    confidence,
    ocrErrors,
    duplicates,
    negativeStock,
    unmapped,
    stocktakeVariance,
    workshopInventory,
    topItems,
  } = data

  // 1. Voucher Status Chart (Donut)
  const statusChartOption: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '0%', textStyle: { color: '#94a3b8', fontSize: 11 } },
    series: [
      {
        name: 'Trạng thái phiếu',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
        data: Object.entries(voucherKpis.statusBreakdown).map(([status, count]) => {
          const colors: Record<string, string> = {
            DRAFT: '#64748b',
            PENDING_REVIEW: '#f59e0b',
            NEEDS_REVISION: '#eab308',
            APPROVED: '#3b82f6',
            POSTED: '#10b981',
            EXPORT_READY: '#14b8a6',
            EXPORTED: '#06b6d4',
            REJECTED: '#ef4444',
            CANCELLED: '#475569',
          }
          const labels: Record<string, string> = {
            DRAFT: 'Nháp',
            PENDING_REVIEW: 'Chờ duyệt',
            NEEDS_REVISION: 'Cần bổ sung',
            APPROVED: 'Đã duyệt',
            POSTED: 'Đã ghi sổ',
            EXPORT_READY: 'Sẵn sàng xuất',
            EXPORTED: 'Đã xuất',
            REJECTED: 'Từ chối',
            CANCELLED: 'Hủy',
          }
          return {
            name: labels[status] || status,
            value: count,
            itemStyle: { color: colors[status] || '#94a3b8' },
          }
        }),
      },
    ],
  }

  // 2. Processing Time Chart (Dual Line/Bar)
  const processingTimeOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#94a3b8' } },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: processingTime.processingTimeTrend.map((t) => t.date.slice(5)),
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'AI (ms)',
        nameTextStyle: { color: '#38bdf8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      {
        type: 'value',
        name: 'Duyệt (phút)',
        nameTextStyle: { color: '#f59e0b' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'AI Time (ms)',
        type: 'bar',
        barWidth: '40%',
        data: processingTime.processingTimeTrend.map((t) => t.aiMs),
        itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Duyệt (phút)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: processingTime.processingTimeTrend.map((t) => t.reviewMinutes),
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 3 },
      },
    ],
  }

  // 3. Confidence Distribution (Pie)
  const confidenceOption: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} phiếu ({d}%)' },
    legend: { bottom: '0%', textStyle: { color: '#94a3b8', fontSize: 11 } },
    series: [
      {
        name: 'Confidence AI',
        type: 'pie',
        radius: '65%',
        center: ['50%', '45%'],
        data: [
          { value: confidence.distribution.high, name: 'Cao (≥90%)', itemStyle: { color: '#10b981' } },
          { value: confidence.distribution.medium, name: 'Trung bình (75-89%)', itemStyle: { color: '#f59e0b' } },
          { value: confidence.distribution.low, name: 'Thấp (<75%)', itemStyle: { color: '#ef4444' } },
        ],
      },
    ],
  }

  // 4. OCR Error Types (Bar)
  const ocrErrorOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Mã chưa ánh xạ', 'Sai đơn vị', 'Số lượng sai', 'Conf thấp', 'Số lượng bất thường'],
      axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 15 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        type: 'bar',
        data: [
          ocrErrors.byType.needsMapping,
          ocrErrors.byType.unitMismatch,
          ocrErrors.byType.quantityInvalid,
          ocrErrors.byType.lowConfidence,
          ocrErrors.byType.abnormalQty,
        ],
        itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }

  // 8. Stocktake Variance Chart
  const stocktakeOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#94a3b8' } },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Khớp', 'Thừa', 'Thiếu', 'Chưa xác định'],
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Số lượng dòng',
        type: 'bar',
        barWidth: '50%',
        data: [
          { value: stocktakeVariance.matchedLines, itemStyle: { color: '#10b981' } },
          { value: stocktakeVariance.surplusLines, itemStyle: { color: '#38bdf8' } },
          { value: stocktakeVariance.shortageLines, itemStyle: { color: '#ef4444' } },
          { value: stocktakeVariance.unidentifiedLines, itemStyle: { color: '#a855f7' } },
        ],
      },
    ],
  }

  // 9. Workshop Inventory Chart
  const workshopInvOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { textStyle: { color: '#94a3b8' } },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: workshopInventory.map((w) => w.workshopName),
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Tổng sản lượng tồn',
        type: 'bar',
        barWidth: '40%',
        data: workshopInventory.map((w) => w.totalQuantity),
        itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }

  // 10. Top Items Chart (Horizontal Bar)
  const topItemsOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '6%', bottom: '5%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: [...topItems].reverse().map((i) => i.itemCode),
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        type: 'bar',
        data: [...topItems].reverse().map((i) => ({
          value: i.totalQuantity,
          name: i.itemName,
        })),
        itemStyle: { color: '#14b8a6', borderRadius: [0, 4, 4, 0] },
      },
    ],
  }

  return (
    <div className={`space-y-6 ${isTvMode ? 'text-sm' : ''}`}>
      {/* ── TOP KPI OVERVIEW CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Vouchers */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng phiếu kho</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{voucherKpis.totalVouchers}</div>
          <div className="text-xs text-slate-400 flex justify-between">
            <span>Đã ghi sổ: <strong className="text-emerald-400">{voucherKpis.postedCount}</strong></span>
            <span>Chờ: <strong className="text-amber-400">{voucherKpis.pendingCount}</strong></span>
          </div>
        </div>

        {/* AI Processing Time */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời gian AI</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400">
            {(processingTime.avgAiTimeMs / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-slate-400">Duyệt TB: <strong className="text-amber-400">{processingTime.avgReviewTimeMinutes} phút</strong></div>
        </div>

        {/* Confidence score */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Confidence AI</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {(confidence.avgConfidence * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-400">Phiếu tin cậy thấp: <strong className="text-rose-400">{confidence.lowConfidenceCount}</strong></div>
        </div>

        {/* OCR Errors */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Lỗi & Cảnh báo OCR</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{ocrErrors.totalErrorLines}</div>
          <div className="text-xs text-slate-400">Dòng cần xử lý lại</div>
        </div>

        {/* Negative Stock */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tồn kho âm</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{negativeStock.negativeCount}</div>
          <div className="text-xs text-slate-400">Dưới định mức: <strong className="text-yellow-300">{negativeStock.lowStockCount}</strong></div>
        </div>

        {/* Duplicate Vouchers */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Phiếu nghi trùng</span>
            <Copy className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{duplicates.duplicateCount}</div>
          <div className="text-xs text-slate-400">DUP-01 flag</div>
        </div>
      </div>

      {/* ── CHARTS SECTION 1: VOUCHERS, AI TIME, CONFIDENCE, OCR ERRORS ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Voucher Status */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Phiếu kho theo trạng thái
            </h3>
          </div>
          <div className="h-60">
            <ReactECharts option={statusChartOption} />
          </div>
        </div>

        {/* 2. Processing Time */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Thời gian xử lý AI & Duyệt
            </h3>
          </div>
          <div className="h-60">
            <ReactECharts option={processingTimeOption} />
          </div>
        </div>

        {/* 3. Confidence Level */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Phân bố điểm Confidence
            </h3>
          </div>
          <div className="h-60">
            <ReactECharts option={confidenceOption} />
          </div>
        </div>

        {/* 4. OCR Error Types */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Phân loại lỗi OCR & Cảnh báo
            </h3>
          </div>
          <div className="h-60">
            <ReactECharts option={ocrErrorOption} />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: SPECIAL ALERT TABLES (DUPLICATES, NEGATIVE STOCK, UNMAPPED) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 5. Duplicate Vouchers Card List */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Copy className="w-4 h-4 text-purple-400" />
              Cảnh báo Phiếu trùng (DUP-01)
            </h3>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
              {duplicates.duplicateCount} phiếu
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
            {duplicates.items.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Không phát hiện phiếu nghi trùng nào.</p>
            ) : (
              duplicates.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1"
                >
                  <div className="flex justify-between font-mono font-semibold text-slate-200">
                    <span className="text-purple-300">{item.transactionCode}</span>
                    <span className="text-rose-400 font-bold">{(item.duplicateScore * 100).toFixed(0)}% trùng</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Số CT: {item.documentNumber || 'N/A'}</span>
                    <span>{item.workshopName}</span>
                  </div>
                  {item.notes && <div className="text-amber-400 text-[11px] truncate">{item.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 6. Negative & Low Stock Alerts */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Cảnh báo Tồn âm & Dưới định mức
            </h3>
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
              {negativeStock.negativeCount} âm
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
            {negativeStock.items.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Không có mặt hàng nào tồn âm hoặc thiếu.</p>
            ) : (
              negativeStock.items.map((item) => (
                <div
                  key={`${item.itemId}-${item.warehouseName}`}
                  className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200 font-mono">{item.itemCode} - {item.itemName}</div>
                    <div className="text-[11px] text-slate-400">{item.workshopName} • {item.warehouseName}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-bold ${item.isNegative ? 'text-rose-400' : 'text-amber-400'}`}>
                      {item.currentBalance.toLocaleString('vi-VN')}
                    </div>
                    <div className="text-[10px] text-slate-400">Tối thiểu: {item.minimumStock.toLocaleString('vi-VN')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 7. Unmapped Item Codes */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-teal-400" />
              Mã hàng chưa ánh xạ
            </h3>
            <span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono">
              {unmapped.unmappedCount} mã
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
            {unmapped.rawItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Tất cả mã hàng đã được ánh xạ chuẩn.</p>
            ) : (
              unmapped.rawItems.map((raw, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">{raw.rawItemName}</div>
                    <div className="text-[11px] text-slate-400">ĐVT gốc: {raw.extractedUnit || 'N/A'} • {raw.lastSeenWorkshop}</div>
                  </div>
                  <div className="bg-slate-800 text-teal-300 font-mono px-2 py-1 rounded-md text-[11px] font-semibold">
                    {raw.occurrences} lần
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── CHARTS SECTION 3: STOCKTAKE VARIANCE, WORKSHOP INVENTORY, TOP ITEMS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 8. Stocktake Variance */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Chênh lệch kiểm kê thực tế
            </h3>
            <span className="text-xs text-slate-400">{stocktakeVariance.totalStocktakes} đợt kiểm kê</span>
          </div>
          <div className="h-60">
            <ReactECharts option={stocktakeOption} />
          </div>
          <div className="flex justify-around text-xs border-t border-slate-700/50 pt-2 font-mono">
            <span className="text-sky-400">Thừa: +{stocktakeVariance.totalSurplusQty}</span>
            <span className="text-rose-400">Thiếu: -{stocktakeVariance.totalShortageQty}</span>
          </div>
        </div>

        {/* 9. Inventory per Workshop */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Tồn kho theo Xưởng
            </h3>
          </div>
          <div className="h-60">
            <ReactECharts option={workshopInvOption} />
          </div>
        </div>

        {/* 10. Top Moved Items */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              Top mã hàng luân chuyển cao nhất
            </h3>
          </div>
          <div className="h-60">
            <ReactECharts option={topItemsOption} />
          </div>
        </div>
      </div>
    </div>
  )
}
