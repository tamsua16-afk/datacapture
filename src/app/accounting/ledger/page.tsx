'use client'

import { useState, useEffect } from 'react'

export default function InventoryLedgerPage() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'balances' | 'periods'>('ledger')

  // Filters
  const [search, setSearch] = useState('')
  const [workshopId, setWorkshopId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Data states
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [stockBalances, setStockBalances] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Period creation modal state
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [newPeriodStart, setNewPeriodStart] = useState('')
  const [newPeriodEnd, setNewPeriodEnd] = useState('')

  // Fetch functions
  const fetchLedger = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (workshopId) params.append('workshopId', workshopId)
      if (warehouseId) params.append('warehouseId', warehouseId)
      if (transactionType) params.append('transactionType', transactionType)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/inventory/ledger?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setLedgerEntries(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalances = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (workshopId) params.append('workshopId', workshopId)
      if (warehouseId) params.append('warehouseId', warehouseId)

      const res = await fetch(`/api/inventory/balances?${params.toString()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setStockBalances(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPeriods = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/inventory/periods')
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setPeriods(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger()
    if (activeTab === 'balances') fetchBalances()
    if (activeTab === 'periods') fetchPeriods()
  }, [activeTab, search, workshopId, warehouseId, transactionType, startDate, endDate])

  const handleTogglePeriodLock = async (periodId: string, currentClosedState: boolean) => {
    const actionName = currentClosedState ? 'MỞ KHÓA' : 'KHÓA KỲ'
    if (!confirm(`Bạn có chắc chắn muốn ${actionName} cho kỳ kế toán này?`)) return

    try {
      const res = await fetch('/api/inventory/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_LOCK',
          periodId,
          isClosed: !currentClosedState,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error?.message || 'Không thể thay đổi trạng thái kỳ')
      fetchPeriods()
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`)
    }
  }

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) {
      alert('Vui lòng điền đầy đủ thông tin kỳ kế toán')
      return
    }

    try {
      const res = await fetch('/api/inventory/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          periodName: newPeriodName,
          startDate: newPeriodStart,
          endDate: newPeriodEnd,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error?.message || 'Không thể tạo kỳ kế toán')

      setShowPeriodModal(false)
      setNewPeriodName('')
      setNewPeriodStart('')
      setNewPeriodEnd('')
      fetchPeriods()
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-3 h-8 bg-blue-600 rounded-full inline-block"></span>
            Sổ Tồn Kho & Quản Lý Tồn Chi Tiết
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi nhật ký giao dịch ghi sổ bất biến, số dư tức thời và quản lý khóa kỳ kế toán.
          </p>
        </div>

        {/* Tabs navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📋 Nhật ký ghi sổ (Ledger)
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
              activeTab === 'balances'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📊 Số dư tồn kho (Balances)
          </button>
          <button
            onClick={() => setActiveTab('periods')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
              activeTab === 'periods'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🔒 Kỳ kế toán (Periods)
          </button>
        </div>
      </div>

      {/* Filters bar for Ledger & Balances */}
      {activeTab !== 'periods' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm mã phiếu, mặt hàng, kho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {activeTab === 'ledger' && (
            <>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">-- Tất cả loại giao dịch --</option>
                <option value="PURCHASE_RECEIPT">Nhập mua hàng</option>
                <option value="MATERIAL_ISSUE">Xuất nguyên vật liệu</option>
                <option value="TRANSFER_OUT">Chuyển kho đi</option>
                <option value="TRANSFER_IN">Chuyển kho đến</option>
                <option value="ADJUSTMENT_IN">Điều chỉnh tăng</option>
                <option value="ADJUSTMENT_OUT">Điều chỉnh giảm</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </>
          )}
        </div>
      )}

      {/* Main Tab Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Đang tải dữ liệu tồn kho...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm font-semibold">
            {error}
          </div>
        ) : activeTab === 'ledger' ? (
          /* TAB 1: LEDGER ENTRIES */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5">Thời gian</th>
                  <th className="p-3.5">Mã phiếu</th>
                  <th className="p-3.5">Loại phiếu</th>
                  <th className="p-3.5">Kho hàng</th>
                  <th className="p-3.5">Hàng hóa</th>
                  <th className="p-3.5 text-right">Nhập (In)</th>
                  <th className="p-3.5 text-right">Xuất (Out)</th>
                  <th className="p-3.5 text-right">Tồn lũy kế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Chưa có nhật ký giao dịch ghi sổ nào.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-slate-500">
                        {new Date(row.transactionDate).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                        {row.transactionCode}
                        {row.documentNumber && (
                          <span className="block text-[10px] text-slate-400 font-sans">C/T: {row.documentNumber}</span>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {row.transactionType}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold block text-slate-900 dark:text-white">{row.warehouseName}</span>
                        <span className="text-[10px] text-slate-400">{row.workshopName}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-white block">{row.itemName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Mã: {row.itemCode} ({row.baseUnit})</span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.quantityIn > 0 ? `+${row.quantityIn.toLocaleString('vi-VN')}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {row.quantityOut > 0 ? `-${row.quantityOut.toLocaleString('vi-VN')}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                        {row.runningBalance.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'balances' ? (
          /* TAB 2: STOCK BALANCES */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5">Kho hàng</th>
                  <th className="p-3.5">Mã sản phẩm</th>
                  <th className="p-3.5">Tên vật tư / sản phẩm</th>
                  <th className="p-3.5">ĐVT</th>
                  <th className="p-3.5 text-right">Tồn hiện tại</th>
                  <th className="p-3.5 text-right">Tồn tối thiểu</th>
                  <th className="p-3.5">Trạng thái số dư</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {stockBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Chưa có dữ liệu số dư tồn kho.
                    </td>
                  </tr>
                ) : (
                  stockBalances.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-white block">{b.warehouseName}</span>
                        <span className="text-[10px] text-slate-400">{b.workshopName}</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {b.itemCode}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {b.itemName}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">
                        {b.baseUnit}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-black text-sm ${
                        b.currentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {b.currentBalance.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-500">
                        {b.minimumStock.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5">
                        {b.status === 'NEGATIVE' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            ⚠️ Âm kho ({b.currentBalance})
                          </span>
                        ) : b.status === 'LOW_STOCK' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⚠️ Cảnh báo thiếu tồn
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ Đủ tồn kho
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 3: PERIODS MANAGEMENT */
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Danh sách Kỳ Kế Toán Tồn Kho
                </h3>
                <p className="text-xs text-slate-500">
                  Khi kỳ kế toán bị KHÓA, mọi giao dịch ghi sổ hoặc chỉnh sửa thuộc kỳ đó sẽ bị chặn tuyệt đối.
                </p>
              </div>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer min-h-[44px]"
              >
                + Tạo kỳ kế toán mới
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
                    <th className="p-3.5">Tên kỳ</th>
                    <th className="p-3.5">Phạm vi Xưởng</th>
                    <th className="p-3.5">Ngày bắt đầu</th>
                    <th className="p-3.5">Ngày kết thúc</th>
                    <th className="p-3.5">Trạng thái kỳ</th>
                    <th className="p-3.5">Người thực hiện khóa</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Chưa có kỳ kế toán nào được cấu hình.
                      </td>
                    </tr>
                  ) : (
                    periods.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {p.periodName}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">
                          {p.workshopName}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(p.startDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(p.endDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3.5">
                          {p.isClosed ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              🔒 ĐÃ KHÓA KỲ
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              🔓 ĐANG MỞ KỲ
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {p.closedByName ? `${p.closedByName} (${new Date(p.closedAt).toLocaleDateString('vi-VN')})` : '-'}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleTogglePeriodLock(p.id, p.isClosed)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                              p.isClosed
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {p.isClosed ? '🔓 Mở khóa kỳ' : '🔒 Khóa kỳ ngay'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal create period */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Tạo kỳ kế toán mới
            </h3>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Tên kỳ (Ví dụ: Tháng 07/2026)
                </label>
                <input
                  type="text"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="Kỳ Tháng 07/2026"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={newPeriodStart}
                  onChange={(e) => setNewPeriodStart(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[44px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md min-h-[44px]"
                >
                  Tạo kỳ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
