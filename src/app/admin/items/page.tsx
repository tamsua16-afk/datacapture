'use client'

import { useState, useEffect } from 'react'
import { QuickSearchModal } from '@/components/master-data/QuickSearchModal'

interface Item {
  id: string
  code: string
  name: string
  itemGroup: string
  baseUnit: string
  minimumStock: number
  maximumStock: number | null
  isActive: boolean
  aliases: string[]
}

interface Unit {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
}

interface UnitConversion {
  id: string
  itemId: string | null
  itemCode: string | null
  itemName: string | null
  fromUnit: string
  toUnit: string
  conversionFactor: number
  isActive: boolean
}

interface ItemAlias {
  id: string
  itemId: string
  itemCode: string
  itemName: string
  alias: string
  normalizedAlias: string
  confirmedCount: number
}

const ITEM_GROUPS: Record<string, string> = {
  CEMENT: 'Xi măng',
  SAND: 'Cát',
  STONE: 'Đá',
  STEEL: 'Thép',
  ADDITIVE: 'Phụ gia',
  FINISHED: 'Thành phẩm',
  OTHER: 'Khác',
}

export default function ItemsPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'thresholds' | 'aliases' | 'units' | 'importExport'>('items')

  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [conversions, setConversions] = useState<UnitConversion[]>([])
  const [aliases, setAliases] = useState<ItemAlias[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false)

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formItemCode, setFormItemCode] = useState('')
  const [formItemName, setFormItemName] = useState('')
  const [formItemGroup, setFormItemGroup] = useState('OTHER')
  const [formItemBaseUnit, setFormItemBaseUnit] = useState('kg')
  const [formItemMinStock, setFormItemMinStock] = useState(0)
  const [formItemMaxStock, setFormItemMaxStock] = useState<string>('')
  const [formItemIsActive, setFormItemIsActive] = useState(true)
  const [formItemAliasesStr, setFormItemAliasesStr] = useState('')
  const [itemError, setItemError] = useState<string | null>(null)

  // Alias Modal state
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false)
  const [formAliasItemId, setFormAliasItemId] = useState('')
  const [formAliasText, setFormAliasText] = useState('')

  // Unit Modal state
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [formUnitCode, setFormUnitCode] = useState('')
  const [formUnitName, setFormUnitName] = useState('')
  const [formUnitDesc, setFormUnitDesc] = useState('')

  // Conversion Modal state
  const [isConvModalOpen, setIsConvModalOpen] = useState(false)
  const [formConvItemId, setFormConvItemId] = useState('')
  const [formConvFromUnit, setFormConvFromUnit] = useState('bao')
  const [formConvToUnit, setFormConvToUnit] = useState('kg')
  const [formConvFactor, setFormConvFactor] = useState(50)

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState<{ importedCount: number; errors: string[] } | null>(null)

  const fetchItemsData = async () => {
    setLoading(true)
    try {
      let url = `/api/admin/items?`
      if (selectedGroup) url += `group=${selectedGroup}&`
      if (search) url += `search=${encodeURIComponent(search)}`

      const [itemsRes, unitsRes, convsRes, aliasesRes] = await Promise.all([
        fetch(url),
        fetch('/api/admin/units'),
        fetch('/api/admin/unit-conversions'),
        fetch('/api/admin/aliases'),
      ])

      const itemsJson = await itemsRes.json()
      const unitsJson = await unitsRes.json()
      const convsJson = await convsRes.json()
      const aliasesJson = await aliasesRes.json()

      if (itemsJson.data) setItems(itemsJson.data)
      if (unitsJson.data) setUnits(unitsJson.data)
      if (convsJson.data) setConversions(convsJson.data)
      if (aliasesJson.data) setAliases(aliasesJson.data)
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItemsData()
  }, [selectedGroup, search])

  // Open Item Modal
  const openCreateItemModal = () => {
    setEditingItem(null)
    setFormItemCode('')
    setFormItemName('')
    setFormItemGroup('CEMENT')
    setFormItemBaseUnit('kg')
    setFormItemMinStock(0)
    setFormItemMaxStock('')
    setFormItemIsActive(true)
    setFormItemAliasesStr('')
    setItemError(null)
    setIsItemModalOpen(true)
  }

  const openEditItemModal = (item: Item) => {
    setEditingItem(item)
    setFormItemCode(item.code)
    setFormItemName(item.name)
    setFormItemGroup(item.itemGroup)
    setFormItemBaseUnit(item.baseUnit)
    setFormItemMinStock(item.minimumStock)
    setFormItemMaxStock(item.maximumStock !== null ? item.maximumStock.toString() : '')
    setFormItemIsActive(item.isActive)
    setFormItemAliasesStr(item.aliases.join(', '))
    setItemError(null)
    setIsItemModalOpen(true)
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setItemError(null)

    try {
      const payload = {
        code: formItemCode,
        name: formItemName,
        itemGroup: formItemGroup,
        baseUnit: formItemBaseUnit,
        minimumStock: Number(formItemMinStock) || 0,
        maximumStock: formItemMaxStock.trim() ? Number(formItemMaxStock) : null,
        isActive: formItemIsActive,
        aliases: formItemAliasesStr ? formItemAliasesStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
        isAiGenerated: false,
      }

      const url = editingItem ? `/api/admin/items/${editingItem.id}` : '/api/admin/items'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Có lỗi xảy ra')
      }

      setToast({
        type: 'success',
        message: editingItem ? `Đã cập nhật hàng hóa ${formItemCode}` : `Đã thêm mã hàng ${formItemCode}`,
      })
      setIsItemModalOpen(false)
      fetchItemsData()
    } catch (err: any) {
      setItemError(err.message)
    }
  }

  const toggleItemStatus = async (item: Item) => {
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({
        type: 'success',
        message: item.isActive ? `Đã khóa mã hàng ${item.code}` : `Đã mở khóa mã hàng ${item.code}`,
      })
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  const handleDeleteItem = async (item: Item) => {
    if (!confirm(`Bạn có chắc muốn xóa mã hàng "${item.name}" (${item.code}) không?`)) return
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: `Đã xóa mã hàng ${item.code}` })
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  // Alias Save
  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: formAliasItemId, alias: formAliasText }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: `Đã thêm Alias "${formAliasText}"` })
      setIsAliasModalOpen(false)
      setFormAliasText('')
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  const handleDeleteAlias = async (id: string, aliasStr: string) => {
    if (!confirm(`Xóa alias "${aliasStr}"?`)) return
    try {
      const res = await fetch(`/api/admin/aliases/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: `Đã xóa alias "${aliasStr}"` })
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  // Unit Save
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formUnitCode, name: formUnitName, description: formUnitDesc }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: `Đã thêm đơn vị tính "${formUnitCode}"` })
      setIsUnitModalOpen(false)
      setFormUnitCode('')
      setFormUnitName('')
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  // Conversion Save
  const handleSaveConversion = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/unit-conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: formConvItemId || null,
          fromUnit: formConvFromUnit,
          toUnit: formConvToUnit,
          conversionFactor: Number(formConvFactor),
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message)

      setToast({ type: 'success', message: 'Đã thêm quy đổi đơn vị' })
      setIsConvModalOpen(false)
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    }
  }

  // CSV Import/Export
  const handleExportCsv = () => {
    window.open('/api/admin/items/export', '_blank')
  }

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return
    setImporting(true)
    setImportReport(null)

    try {
      const text = await csvFile.text()
      const res = await fetch('/api/admin/items/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
      const json = await res.json()

      if (!res.ok || json.error) throw new Error(json.error?.message)

      setImportReport(json.data)
      setToast({ type: 'success', message: `Đã import thành công ${json.data.importedCount} mã hàng` })
      fetchItemsData()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <QuickSearchModal isOpen={isQuickSearchOpen} onClose={() => setIsQuickSearchOpen(false)} />

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/80 dark:border-red-800 dark:text-red-200'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs underline font-bold cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span>
            Quản lý Danh mục Hàng hóa & Master Data
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý vật tư, mã hàng duy nhất, alias không dấu, quy đổi đơn vị tính, ngưỡng tồn kho & CSV.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsQuickSearchOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 transition-all min-h-[44px] flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Tìm nhanh (Ctrl+K)
          </button>

          <button
            onClick={openCreateItemModal}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm Mã hàng mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'items'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          📦 Danh mục Hàng hóa ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'thresholds'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          ⚠️ Ngưỡng cảnh báo tồn
        </button>
        <button
          onClick={() => setActiveTab('aliases')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'aliases'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          🏷️ Alias tên hàng ({aliases.length})
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'units'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          📐 Đơn vị tính & Quy đổi ({units.length})
        </button>
        <button
          onClick={() => setActiveTab('importExport')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'importExport'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          📥 Import / Export CSV
        </button>
      </div>

      {/* Tab 1: ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <input
              type="text"
              placeholder="Lọc mã hàng, tên hàng hoặc alias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none min-h-[44px]"
            >
              <option value="">Tất cả Nhóm hàng</option>
              {Object.entries(ITEM_GROUPS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Đang tải danh mục hàng hóa...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Không tìm thấy mã hàng nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Mã hàng</th>
                      <th className="px-6 py-4">Tên hàng hóa</th>
                      <th className="px-6 py-4">Nhóm hàng</th>
                      <th className="px-6 py-4">ĐVT cơ sở</th>
                      <th className="px-6 py-4">Tồn tối thiểu</th>
                      <th className="px-6 py-4">Aliases</th>
                      <th className="px-6 py-4 text-center">Trạng thái</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-purple-700 dark:text-purple-400">
                          {item.code}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {ITEM_GROUPS[item.itemGroup] || item.itemGroup}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{item.baseUnit}</td>
                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{item.minimumStock}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.aliases.length > 0 ? (
                              item.aliases.map((al, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                >
                                  {al}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleItemStatus(item)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800'
                            }`}
                          >
                            {item.isActive ? '● Hoạt động' : '🔒 Đã khóa'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditItemModal(item)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium min-h-[44px] cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium min-h-[44px] cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: THRESHOLDS */}
      {activeTab === 'thresholds' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cấu hình Ngưỡng cảnh báo Tồn kho (Min - Max Stock)</h2>
          <p className="text-sm text-slate-500">
            Hệ thống sẽ tự động đưa ra cảnh báo khi tồn kho giảm xuống dưới ngưỡng Tồn tối thiểu hoặc vượt quá Tồn tối đa.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">{item.code}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.baseUnit}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-1">{item.name}</h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Tồn tối thiểu:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{item.minimumStock} {item.baseUnit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tồn tối đa:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {item.maximumStock !== null ? `${item.maximumStock} ${item.baseUnit}` : 'Không giới hạn'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: ALIASES */}
      {activeTab === 'aliases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Danh sách Alias Hàng hóa</h2>
              <p className="text-xs text-slate-500">
                Tất cả Alias được tự động chuẩn hóa chữ thường, loại bỏ dấu tiếng Việt và khoảng trắng để tra cứu chính xác.
              </p>
            </div>
            <button
              onClick={() => {
                setFormAliasItemId(items[0]?.id || '')
                setFormAliasText('')
                setIsAliasModalOpen(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl min-h-[44px] cursor-pointer"
            >
              + Thêm Alias mới
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Mã hàng</th>
                  <th className="px-6 py-4">Tên hàng hóa</th>
                  <th className="px-6 py-4">Alias gốc</th>
                  <th className="px-6 py-4">Alias chuẩn hóa (Normalized)</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {aliases.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-mono font-bold text-purple-600">{al.itemCode}</td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{al.itemName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{al.alias}</td>
                    <td className="px-6 py-4 font-mono text-xs bg-slate-50 dark:bg-slate-800/50 text-purple-700 dark:text-purple-300">
                      {al.normalizedAlias}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteAlias(al.id, al.alias)}
                        className="text-xs text-red-600 hover:underline min-h-[44px] cursor-pointer font-medium"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: UNITS & CONVERSIONS */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Units Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Đơn vị tính chuẩn</h2>
              <button
                onClick={() => setIsUnitModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-2 rounded-xl min-h-[44px] cursor-pointer"
              >
                + Thêm ĐVT
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {units.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {u.code}
                    </span>
                    <span className="ml-2 font-medium text-slate-800 dark:text-slate-200 text-sm">{u.name}</span>
                    {u.description && <p className="text-xs text-slate-400 mt-0.5">{u.description}</p>}
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Hoạt động</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Factors */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Bảng Quy đổi Đơn vị tính</h2>
              <button
                onClick={() => setIsConvModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3 py-2 rounded-xl min-h-[44px] cursor-pointer"
              >
                + Thêm Quy đổi
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {conversions.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      1 {c.fromUnit} = {c.conversionFactor} {c.toUnit}
                    </span>
                    <p className="text-xs text-slate-400">
                      Phạm vi: {c.itemCode ? `Áp dụng riêng cho [${c.itemCode}] ${c.itemName}` : 'Áp dụng Toàn hệ thống'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-1 rounded">
                    x{c.conversionFactor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: IMPORT / EXPORT CSV */}
      {activeTab === 'importExport' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📤</span> Export Danh mục Hàng hóa
            </h2>
            <p className="text-sm text-slate-500">
              Xuất toàn bộ danh mục mã hàng, đơn vị tính, ngưỡng tồn kho và alias ra file CSV tiêu chuẩn UTF-8.
            </p>
            <button
              onClick={handleExportCsv}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm min-h-[44px] cursor-pointer flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tải xuống CSV Danh mục Hàng
            </button>
          </div>

          {/* Import Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📥</span> Import Danh mục Hàng từ CSV
            </h2>
            <p className="text-sm text-slate-500">
              Tải lên file CSV chứa danh sách mã hàng mới. Hệ thống sẽ tự động kiểm tra trùng mã hàng và khởi tạo Alias.
            </p>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                required
              />
              <button
                type="submit"
                disabled={importing || !csvFile}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm min-h-[44px] cursor-pointer"
              >
                {importing ? 'Đang Import...' : 'Bắt đầu Import CSV'}
              </button>
            </form>

            {importReport && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✅ Đã thêm thành công {importReport.importedCount} mã hàng mới.
                </div>
                {importReport.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-600">❌ Chi tiết lỗi ({importReport.errors.length}):</div>
                    <ul className="text-xs text-red-500 list-disc list-inside max-h-32 overflow-y-auto space-y-0.5">
                      {importReport.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Item Add / Edit */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingItem ? `Cập nhật Mã hàng: ${editingItem.code}` : 'Thêm Mã Hàng hóa mới'}
              </h2>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {itemError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {itemError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Mã Hàng (Unique) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formItemCode}
                    onChange={(e) => setFormItemCode(e.target.value.toUpperCase())}
                    placeholder="VD: XM-PCB40"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Nhóm Hàng hóa
                  </label>
                  <select
                    value={formItemGroup}
                    onChange={(e) => setFormItemGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                  >
                    {Object.entries(ITEM_GROUPS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Tên Hàng hóa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  placeholder="VD: Xi măng PCB40"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    ĐVT cơ sở <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formItemBaseUnit}
                    onChange={(e) => setFormItemBaseUnit(e.target.value)}
                    placeholder="VD: kg, m3, cái"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Tồn tối thiểu
                  </label>
                  <input
                    type="number"
                    value={formItemMinStock}
                    onChange={(e) => setFormItemMinStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Tồn tối đa
                  </label>
                  <input
                    type="number"
                    value={formItemMaxStock}
                    onChange={(e) => setFormItemMaxStock(e.target.value)}
                    placeholder="Để trống"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Alias (Tên viết tắt/khác, ngăn cách bởi phẩy)
                </label>
                <input
                  type="text"
                  value={formItemAliasesStr}
                  onChange={(e) => setFormItemAliasesStr(e.target.value)}
                  placeholder="VD: XM40, Xi mang 40, ximang40"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="itemIsActive"
                  checked={formItemIsActive}
                  onChange={(e) => setFormItemIsActive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="itemIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Kích hoạt hoạt động (is_active = true)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 min-h-[44px] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm min-h-[44px] cursor-pointer"
                >
                  Lưu Mã Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Alias */}
      {isAliasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thêm Alias Tên Hàng mới</h2>

            <form onSubmit={handleSaveAlias} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Chọn Mã Hàng
                </label>
                <select
                  value={formAliasItemId}
                  onChange={(e) => setFormAliasItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                  required
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.code}] {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Tên gọi Alias
                </label>
                <input
                  type="text"
                  value={formAliasText}
                  onChange={(e) => setFormAliasText(e.target.value)}
                  placeholder="VD: xi măng 40"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAliasModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold min-h-[44px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold min-h-[44px]"
                >
                  Lưu Alias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Unit */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thêm Đơn vị tính chuẩn</h2>
            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Mã ĐVT (Unique)
                </label>
                <input
                  type="text"
                  value={formUnitCode}
                  onChange={(e) => setFormUnitCode(e.target.value.toLowerCase())}
                  placeholder="VD: kg, cuon, chai"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Tên ĐVT đầy đủ
                </label>
                <input
                  type="text"
                  value={formUnitName}
                  onChange={(e) => setFormUnitName(e.target.value)}
                  placeholder="VD: Kilôgam"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Mô tả
                </label>
                <input
                  type="text"
                  value={formUnitDesc}
                  onChange={(e) => setFormUnitDesc(e.target.value)}
                  placeholder="Ghi chú thêm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none min-h-[44px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold min-h-[44px]"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold min-h-[44px]">
                  Lưu ĐVT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Conversion */}
      {isConvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thêm Quy đổi Đơn vị tính</h2>
            <form onSubmit={handleSaveConversion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Mặt hàng áp dụng (Để trống nếu quy đổi toàn hệ thống)
                </label>
                <select
                  value={formConvItemId}
                  onChange={(e) => setFormConvItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[44px]"
                >
                  <option value="">-- Tất cả hàng hóa --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.code}] {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    ĐVT Nguồn
                  </label>
                  <input
                    type="text"
                    value={formConvFromUnit}
                    onChange={(e) => setFormConvFromUnit(e.target.value)}
                    placeholder="bao"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-mono min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Hệ số (x)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formConvFactor}
                    onChange={(e) => setFormConvFactor(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-mono min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    ĐVT Đích
                  </label>
                  <input
                    type="text"
                    value={formConvToUnit}
                    onChange={(e) => setFormConvToUnit(e.target.value)}
                    placeholder="kg"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold min-h-[44px]"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold min-h-[44px]">
                  Lưu Quy đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
