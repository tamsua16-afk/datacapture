'use client'

import { useState, useEffect } from 'react'

interface QuickSearchResult {
  items: Array<{ id: string; code: string; name: string; baseUnit: string; minimumStock: number; isActive: boolean }>
  workshops: Array<{ id: string; code: string; name: string; isActive: boolean }>
  warehouses: Array<{ id: string; code: string; name: string; workshopName: string; isActive: boolean }>
  units: Array<{ id: string; code: string; name: string; isActive: boolean }>
}

export function QuickSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<QuickSearchResult | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/master-data/quick-search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.data) {
          setResults(data.data)
        }
      } catch (err) {
        console.error('Lỗi khi tra cứu nhanh:', err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  if (!isOpen) return null

  const totalResults =
    (results?.items.length || 0) +
    (results?.workshops.length || 0) +
    (results?.warehouses.length || 0) +
    (results?.units.length || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Search Box */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhanh Hàng hóa, Alias, Xưởng, Kho, Đơn vị tính (không cần dấu)..."
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-base font-medium min-h-[44px]"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-1 hover:bg-slate-300 min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Xóa
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold px-2 py-1 min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            Đóng [Esc]
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Đang tìm kiếm...</span>
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-8 text-slate-400">
              Không tìm thấy kết quả nào khớp với <span className="font-semibold text-slate-700 dark:text-slate-200">"{query}"</span>
            </div>
          )}

          {!query && (
            <div className="text-center py-10 text-slate-400 text-sm">
              💡 Nhập mã hàng, tên hàng, alias (ví dụ: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-red-600 font-mono">xm40</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-red-600 font-mono">cat vang</code>), tên xưởng hoặc tên kho để tra cứu tức thì.
            </div>
          )}

          {!loading && results && (
            <>
              {/* 1. Hàng hóa */}
              {results.items.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 flex items-center justify-between">
                    <span>Hàng hóa ({results.items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 bg-white dark:bg-slate-800/60 flex items-center justify-between transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                              {item.code}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{item.name}</span>
                            {!item.isActive && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                Đã khóa
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            ĐVT: <span className="font-medium text-slate-700 dark:text-slate-300">{item.baseUnit}</span> | Tồn tối thiểu: {item.minimumStock}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Xưởng */}
              {results.workshops.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                    Xưởng ({results.workshops.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.workshops.map((ws) => (
                      <div
                        key={ws.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-800/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {ws.code}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{ws.name}</span>
                        </div>
                        {!ws.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Đã khóa</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Kho */}
              {results.warehouses.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                    Kho ({results.warehouses.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.warehouses.map((wh) => (
                      <div
                        key={wh.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-white dark:bg-slate-800/60 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              {wh.code}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{wh.name}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">Thuộc {wh.workshopName}</div>
                        </div>
                        {!wh.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Đã khóa</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Đơn vị tính */}
              {results.units.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                    Đơn vị tính ({results.units.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.units.map((u) => (
                      <div
                        key={u.id}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-medium flex items-center gap-2"
                      >
                        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{u.code}</span>
                        <span className="text-slate-700 dark:text-slate-300">({u.name})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
