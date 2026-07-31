'use client'

import { useState, useEffect } from 'react'

export function UnmappedItemsQueue() {
  const [unmappedLines, setUnmappedLines] = useState<any[]>([])
  const [masterItems, setMasterItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mappingState, setMappingState] = useState<Record<string, { itemId: string; createAlias: boolean }>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [queueRes, itemsRes] = await Promise.all([
        fetch('/api/transactions/unmapped-items').then((r) => r.json()),
        fetch('/api/master-data/items').then((r) => r.json()),
      ])

      setUnmappedLines(queueRes.data || [])
      setMasterItems(itemsRes.data || [])
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Không thể tải hàng đợi mã hàng' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleMap = async (lineId: string) => {
    const state = mappingState[lineId]
    if (!state || !state.itemId) {
      setMsg({ type: 'error', text: 'Vui lòng chọn sản phẩm trong danh mục để ánh xạ' })
      return
    }

    try {
      setProcessingId(lineId)
      setMsg(null)
      const res = await fetch('/api/transactions/unmapped-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId,
          targetItemId: state.itemId,
          createAlias: state.createAlias ?? true,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Lỗi khi ánh xạ mã hàng')
      }

      setMsg({ type: 'success', text: 'Ánh xạ mã hàng thành công!' })
      // Refresh
      fetchData()
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hàng đợi ánh xạ mã hàng ({unmappedLines.length})
            </h3>
            <p className="text-xs text-slate-500">
              Danh sách tên vật tư/hàng hóa AI trích xuất chưa được liên kết với mã hàng chuẩn trong hệ thống
            </p>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            🔄 Tải lại
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Đang tải danh sách mã hàng chờ ánh xạ...
          </div>
        ) : unmappedLines.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              Không có mặt hàng nào chưa ánh xạ!
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tất cả vật tư từ AI trích xuất đã được liên kết chính xác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Tên hàng AI trích xuất</th>
                  <th className="p-4">Mã phiếu / Xưởng</th>
                  <th className="p-4">ĐVT / Số lượng</th>
                  <th className="p-4">Mã hàng chuẩn trong danh mục</th>
                  <th className="p-4 text-center">Lưu Alias</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {unmappedLines.map((line) => {
                  const state = mappingState[line.id] || { itemId: '', createAlias: true }
                  return (
                    <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {line.rawItemName}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          Confidence: {Math.round(line.itemConfidence * 100)}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                          {line.transactionCode}
                        </span>
                        <span className="text-slate-400 text-[11px]">{line.workshopName}</span>
                      </td>
                      <td className="p-4 font-mono">
                        {line.extractedQuantity} {line.extractedUnit || ''}
                      </td>
                      <td className="p-4 min-w-[220px]">
                        <select
                          value={state.itemId}
                          onChange={(e) =>
                            setMappingState({
                              ...mappingState,
                              [line.id]: { ...state, itemId: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Chọn mã hàng danh mục --</option>
                          {masterItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              [{item.code}] {item.name} ({item.baseUnit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={state.createAlias ?? true}
                          onChange={(e) =>
                            setMappingState({
                              ...mappingState,
                              [line.id]: { ...state, createAlias: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleMap(line.id)}
                          disabled={processingId === line.id || !state.itemId}
                          className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all disabled:opacity-40 cursor-pointer min-h-[44px]"
                        >
                          {processingId === line.id ? 'Đang lưu...' : 'Ánh xạ'}
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
    </div>
  )
}
