'use client'

import { useState, useEffect } from 'react'
import { ImageViewer } from './ImageViewer'
import { ReasonModal } from './ReasonModal'

interface DocumentDetailModalProps {
  transactionId: string | null
  onClose: () => void
  onActionComplete: () => void
}

export function DocumentDetailModal({
  transactionId,
  onClose,
  onActionComplete,
}: DocumentDetailModalProps) {
  const [txData, setTxData] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [reasonModalConfig, setReasonModalConfig] = useState<{
    isOpen: boolean
    title: string
    actionType: 'RETURN' | 'REJECT'
  }>({
    isOpen: false,
    title: '',
    actionType: 'RETURN',
  })
  const [processing, setProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchDetail = async () => {
    if (!transactionId) return
    try {
      setLoading(true)
      setErrorMsg('')
      const [txRes, histRes] = await Promise.all([
        fetch(`/api/transactions/${transactionId}`).then((r) => r.json()),
        fetch(`/api/transactions/${transactionId}/history`).then((r) => r.json()),
      ])

      if (txRes.error) throw new Error(txRes.error.message)
      setTxData(txRes.data)
      setHistory(histRes.data || [])
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải chi tiết phiếu kho')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (transactionId) {
      fetchDetail()
    } else {
      setTxData(null)
    }
  }, [transactionId])

  if (!transactionId) return null

  const handleApprove = async () => {
    if (!confirm('Bạn có chắc chắn muốn DUYỆT phiếu này? Trạng thái phiếu sẽ chuyển thành APPROVED.')) {
      return
    }

    try {
      setProcessing(true)
      setErrorMsg('')
      const res = await fetch(`/api/transactions/${transactionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Không thể duyệt phiếu')
      }

      onActionComplete()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReasonSubmit = async (reason: string) => {
    try {
      setProcessing(true)
      const res = await fetch(`/api/transactions/${transactionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reasonModalConfig.actionType,
          reason,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Không thể thực hiện thao tác')
      }

      setReasonModalConfig({ ...reasonModalConfig, isOpen: false })
      onActionComplete()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handlePostLedger = async (allowNegative = false, negativeReason = '') => {
    try {
      setProcessing(true)
      setErrorMsg('')

      const res = await fetch(`/api/transactions/${transactionId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowNegativeStock: allowNegative,
          negativeStockReason: negativeReason,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        // Nếu lỗi âm kho, cho phép duyệt ngoại lệ nếu có quyền
        if (data.error?.message?.includes('âm') && !allowNegative) {
          const reason = prompt(`CẢNH BÁO ÂM KHO: ${data.error.message}\n\nNếu bạn là ACCOUNTING_MANAGER hoặc ADMIN, hãy nhập LÝ DO NGOẠI LỆ để duyệt ghi sổ:`)
          if (reason && reason.trim()) {
            await handlePostLedger(true, reason.trim())
            return
          }
        }
        throw new Error(data.error?.message || 'Không thể ghi sổ tồn kho')
      }

      alert('Ghi sổ tồn kho thành công!')
      onActionComplete()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReversal = async () => {
    const reason = prompt('Nhập lý do tạo phiếu đảo (Reversal) cho phiếu đã ghi sổ này:')
    if (!reason || !reason.trim()) return

    try {
      setProcessing(true)
      setErrorMsg('')

      const res = await fetch(`/api/transactions/${transactionId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Không thể tạo phiếu đảo')
      }

      alert(`Đã tạo và ghi sổ thành công phiếu đảo (${data.data.reversalCode})!`)
      onActionComplete()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setProcessing(false)
    }
  }


  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold tracking-tight">
              {txData?.transactionCode || 'Chi tiết phiếu'}
            </span>
            {txData?.documentNumber && (
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
                Số C/T: {txData.documentNumber}
              </span>
            )}
            {txData?.status && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                txData.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                txData.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                txData.status === 'NEEDS_REVISION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {txData.status}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải thông tin chi tiết...</span>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mb-3">
              !
            </div>
            <p className="text-sm font-semibold text-rose-600 mb-2">{errorMsg}</p>
            <button
              onClick={fetchDetail}
              className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Left Column: Image Viewer (45% width on large screens) */}
            <div className="lg:w-[45%] p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col">
              <ImageViewer
                attachments={txData?.attachments || []}
                className="w-full h-full min-h-[400px]"
              />
            </div>

            {/* Right Column: Data Form & Controls (55% width) */}
            <div className="lg:w-[55%] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
              {/* Tab Navigation */}
              <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Thông tin & Dòng hàng hóa ({txData?.lines?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Lịch sử thao tác ({history.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'details' ? (
                  <div className="space-y-6">
                    {/* Metadata Header Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Loại phiếu:</span>
                        <span className="font-bold text-slate-800 dark:text-white">{txData?.transactionType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Xưởng:</span>
                        <span className="font-bold text-slate-800 dark:text-white">{txData?.workshopName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Kho liên quan:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {txData?.sourceWarehouseName || txData?.destinationWarehouseName || 'Mặc định'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Người lập:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">{txData?.senderName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Ngày lập:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {txData?.transactionDate ? new Date(txData.transactionDate).toLocaleDateString('vi-VN') : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Độ tin cậy AI:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {txData?.overallConfidence ? `${Math.round(txData.overallConfidence * 100)}%` : '100%'}
                        </span>
                      </div>
                    </div>

                    {/* Rejection/Return Reason Alert if available */}
                    {txData?.rejectionReason && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs">
                        <span className="font-bold block mb-1">💬 Lý do từ chối/trả lại trước đó:</span>
                        <p>{txData.rejectionReason}</p>
                      </div>
                    )}

                    {/* Transaction Items Table */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Chi tiết các dòng hàng & Dự kiến tồn kho
                      </h4>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold">
                            <tr>
                              <th className="p-3 w-10">STT</th>
                              <th className="p-3">Tên hàng trích xuất</th>
                              <th className="p-3">Mã/Tên hàng xác nhận</th>
                              <th className="p-3 text-center">ĐVT</th>
                              <th className="p-3 text-right">Số lượng</th>
                              <th className="p-3 text-right bg-blue-50/50 dark:bg-blue-950/20">Tồn hiện tại</th>
                              <th className="p-3 text-right bg-amber-50/50 dark:bg-amber-950/20">Tồn dự kiến</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {txData?.lines?.map((line: any, index: number) => {
                              const qty = Number(line.confirmedQuantity ?? line.extractedQuantity ?? 0)
                              const isReceipt = ['PURCHASE_RECEIPT', 'OTHER_RECEIPT', 'PRODUCTION_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING_BALANCE'].includes(txData.transactionType)
                              // Mock/calculated balance
                              const mockCurrentStock = line.currentStock ?? 100
                              const expectedStock = isReceipt ? mockCurrentStock + qty : mockCurrentStock - qty
                              const isNegative = expectedStock < 0

                              return (
                                <tr key={line.id || index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                  <td className="p-3 font-mono font-bold text-slate-400">{index + 1}</td>
                                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                    {line.rawItemName}
                                  </td>
                                  <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">
                                    {line.confirmedItemId || line.suggestedItemId || (
                                      <span className="text-amber-500 font-normal italic">Chưa ánh xạ</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                                    {line.confirmedUnit || line.extractedUnit || '-'}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                    {qty.toLocaleString('vi-VN')}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                                    {mockCurrentStock.toLocaleString('vi-VN')}
                                  </td>
                                  <td className={`p-3 text-right font-mono font-bold bg-amber-50/30 dark:bg-amber-950/10 ${
                                    isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                  }`}>
                                    {expectedStock.toLocaleString('vi-VN')}
                                    {isNegative && (
                                      <span className="block text-[10px] text-rose-500 font-sans font-normal">
                                        ⚠️ Âm kho
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Approval History Timeline */
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Nhật ký phê duyệt & Thao tác phiếu
                    </h4>
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">Chưa có ghi nhận lịch sử kiểm duyệt nào.</p>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6 py-2">
                        {history.map((h, i) => (
                          <div key={h.id || i} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 ${
                              h.action === 'APPROVE' ? 'border-emerald-500 bg-emerald-500' :
                              h.action === 'REJECT' ? 'border-rose-500 bg-rose-500' :
                              'border-amber-500 bg-amber-500'
                            }`} />
                            <div className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-900 dark:text-white">{h.actorName || 'Người dùng'}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono">
                                  {h.actorRole}
                                </span>
                                <span className="text-slate-400 text-[11px] ml-auto">
                                  {new Date(h.createdAt).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">
                                Thao tác: <span className="uppercase">{h.action}</span> ({h.fromStatus} → {h.toStatus})
                              </p>
                              {h.comment && (
                                <p className="mt-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 italic">
                                  "{h.comment}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  <span>Trạng thái: <strong className="text-slate-800 dark:text-white">{txData?.status}</strong></span>
                </div>

                <div className="flex items-center gap-3">
                  {txData?.status === 'APPROVED' && (
                    <button
                      onClick={() => handlePostLedger(false)}
                      disabled={processing}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center gap-1.5"
                    >
                      ⚡ Ghi sổ tồn kho (POST)
                    </button>
                  )}

                  {txData?.status === 'POSTED' && (
                    <button
                      onClick={handleReversal}
                      disabled={processing}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center gap-1.5"
                    >
                      ↺ Tạo phiếu đảo (Reversal)
                    </button>
                  )}

                  {!['APPROVED', 'POSTED'].includes(txData?.status) && (
                    <>
                      <button
                        onClick={() =>
                          setReasonModalConfig({
                            isOpen: true,
                            title: 'Trả lại phiếu kho',
                            actionType: 'RETURN',
                          })
                        }
                        disabled={processing || ['REJECTED'].includes(txData?.status)}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
                      >
                        ↩ Trả lại (Sửa đổi)
                      </button>

                      <button
                        onClick={() =>
                          setReasonModalConfig({
                            isOpen: true,
                            title: 'Từ chối phiếu kho',
                            actionType: 'REJECT',
                          })
                        }
                        disabled={processing || ['REJECTED'].includes(txData?.status)}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
                      >
                        ✕ Từ chối
                      </button>

                      <button
                        onClick={handleApprove}
                        disabled={processing || ['REJECTED'].includes(txData?.status)}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center gap-1.5"
                      >
                        ✓ Phê duyệt phiếu
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reason Modal for Return or Reject */}
      <ReasonModal
        isOpen={reasonModalConfig.isOpen}
        title={reasonModalConfig.title}
        actionType={reasonModalConfig.actionType}
        onClose={() => setReasonModalConfig({ ...reasonModalConfig, isOpen: false })}
        onSubmit={handleReasonSubmit}
      />
    </div>
  )
}
