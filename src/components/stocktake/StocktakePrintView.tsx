'use client'

import React from 'react'

interface StocktakeLinePrintItem {
  id: string
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
}

interface StocktakePrintViewProps {
  stocktake: {
    code: string
    workshopName: string
    workshopCode: string
    warehouseName: string
    warehouseCode: string
    stocktakeDate: string
    status: string
    createdByName: string
    confirmedByName: string | null
    lines: StocktakeLinePrintItem[]
  }
  onClose: () => void
}

export function StocktakePrintView({ stocktake, onClose }: StocktakePrintViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(num)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start">
      {/* Controls Bar (hidden when printing) */}
      <div className="print:hidden bg-slate-900 text-white w-full max-w-4xl p-4 rounded-t-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span className="font-semibold text-sm">Xem trước biên bản in kiểm kê ({stocktake.code})</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In biên bản (Print)
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors min-h-[40px] cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white text-slate-900 w-full max-w-4xl p-8 rounded-b-2xl print:rounded-none shadow-2xl print:shadow-none print:p-0 print:w-full print:max-w-none">
        {/* Header */}
        <div className="border-b border-slate-300 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
              CÔNG TY CỔ PHẦN ĐẦU TƯ XÂY DỰNG
            </h2>
            <p className="text-sm text-slate-600">{stocktake.workshopName} ({stocktake.workshopCode})</p>
            <p className="text-xs text-slate-500">Kho kiểm kê: {stocktake.warehouseName} ({stocktake.warehouseCode})</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">BIÊN BẢN KIỂM KÊ Kho</h1>
            <p className="text-xs font-mono font-semibold text-slate-600 mt-1">Mã phiếu: {stocktake.code}</p>
            <p className="text-xs text-slate-500">Ngày kiểm: {new Date(stocktake.stocktakeDate).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* General Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-slate-300">
          <div>
            <span className="font-semibold text-slate-700">Xưởng sản xuất:</span> {stocktake.workshopName}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Kho quản lý:</span> {stocktake.warehouseName}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Người lập bản kiểm:</span> {stocktake.createdByName}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Người xác nhận:</span> {stocktake.confirmedByName || 'Chưa xác nhận'}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Trạng thái phiếu:</span> <span className="font-bold uppercase">{stocktake.status}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Tổng mặt hàng kiểm kê:</span> {stocktake.lines.length} mặt hàng
          </div>
        </div>

        {/* Table of Variance */}
        <table className="w-full text-xs border-collapse border border-slate-300 mb-8">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-200 text-slate-800 font-bold border-b border-slate-300 text-center">
              <th className="border border-slate-300 p-2 w-10">STT</th>
              <th className="border border-slate-300 p-2 w-24">Mã hàng</th>
              <th className="border border-slate-300 p-2 text-left">Tên vật tư / Sản phẩm</th>
              <th className="border border-slate-300 p-2 w-16">ĐVT</th>
              <th className="border border-slate-300 p-2 w-20 text-right">Tồn sổ sách</th>
              <th className="border border-slate-300 p-2 w-20 text-right">Số thực tế</th>
              <th className="border border-slate-300 p-2 w-20 text-right">Chênh lệch</th>
              <th className="border border-slate-300 p-2 w-16 text-right">%</th>
              <th className="border border-slate-300 p-2 w-20">Trạng thái</th>
              <th className="border border-slate-300 p-2 text-left">Giải trình nguyên nhân</th>
            </tr>
          </thead>
          <tbody>
            {stocktake.lines.map((line, idx) => (
              <tr key={line.id} className="border-b border-slate-300 hover:bg-slate-50">
                <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                <td className="border border-slate-300 p-2 text-center font-mono font-semibold">
                  {line.itemCode || '---'}
                </td>
                <td className="border border-slate-300 p-2 font-medium">
                  {line.itemName || line.rawItemName}
                </td>
                <td className="border border-slate-300 p-2 text-center">{line.baseUnit || '---'}</td>
                <td className="border border-slate-300 p-2 text-right font-mono">{formatNumber(line.bookQuantity)}</td>
                <td className="border border-slate-300 p-2 text-right font-mono font-bold">{formatNumber(line.countedQuantity)}</td>
                <td className={`border border-slate-300 p-2 text-right font-mono font-bold ${
                  line.differenceQuantity > 0 ? 'text-blue-700' : line.differenceQuantity < 0 ? 'text-red-700' : 'text-slate-700'
                }`}>
                  {line.differenceQuantity > 0 ? `+${formatNumber(line.differenceQuantity)}` : formatNumber(line.differenceQuantity)}
                </td>
                <td className="border border-slate-300 p-2 text-right font-mono">
                  {line.differencePercentage.toFixed(1)}%
                </td>
                <td className="border border-slate-300 p-2 text-center font-semibold">
                  {line.status}
                </td>
                <td className="border border-slate-300 p-2 text-slate-700 italic">
                  {line.explanation || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures Footer */}
        <div className="grid grid-cols-3 gap-6 text-center text-xs mt-12 pt-6 border-t border-slate-200 print:border-slate-300">
          <div>
            <p className="font-bold text-slate-900">NGƯỜI KẾ TOÁN KHO</p>
            <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký & ghi rõ họ tên)</p>
            <div className="h-20"></div>
            <p className="font-semibold text-slate-800">{stocktake.confirmedByName || '................................'}</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">XƯỞNG TRƯỞNG</p>
            <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký & ghi rõ họ tên)</p>
            <div className="h-20"></div>
            <p className="font-semibold text-slate-800">................................</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">NGƯỜI LẬP BIÊN BẢN</p>
            <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký & ghi rõ họ tên)</p>
            <div className="h-20"></div>
            <p className="font-semibold text-slate-800">{stocktake.createdByName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
