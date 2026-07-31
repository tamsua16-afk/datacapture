'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export interface WorkshopOption {
  id: string
  code: string
  name: string
}

export interface WarehouseOption {
  id: string
  workshopId: string
  code: string
  name: string
  warehouseType: string
}

export interface ImageFileItem {
  id: string
  file?: File
  originalFilename: string
  mimeType: string
  fileSize: number
  previewUrl: string
  rotation: number // 0, 90, 180, 270
  fileHash?: string
  signedUrl?: string
  isDuplicate?: boolean
  duplicateTransactionId?: string
  uploadProgress: number // 0 to 100
  uploadStatus: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  errorMessage?: string
}

const DOCUMENT_TYPES = [
  {
    id: 'PURCHASE_RECEIPT',
    label: 'Nhập kho',
    subtitle: 'Phiếu nhập mua, nhập khác, nguyên vật liệu',
    icon: '📥',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    id: 'MATERIAL_ISSUE',
    label: 'Xuất kho',
    subtitle: 'Phiếu xuất nguyên vật liệu, thành phẩm',
    icon: '📤',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    id: 'TRANSFER_OUT',
    label: 'Chuyển kho',
    subtitle: 'Chuyển nguyên vật liệu/thành phẩm giữa các kho',
    icon: '🔄',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    id: 'STOCKTAKE',
    label: 'Kiểm kê',
    subtitle: 'Phiếu kiểm kê số lượng tồn kho thực tế',
    icon: '📋',
    color: '#047857',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
]

const MAX_SIZE_MB = 20
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export default function CaptureWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type')

  // Wizard Step (1 to 6)
  const [step, setStep] = useState<number>(1)

  // Form State
  const [transactionType, setTransactionType] = useState<string>('PURCHASE_RECEIPT')
  const [workshopId, setWorkshopId] = useState<string>('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('')
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string>('')
  const [documentNumber, setDocumentNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [transactionId, setTransactionId] = useState<string | null>(null)

  // Options Data
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [isLoadingMasterData, setIsLoadingMasterData] = useState<boolean>(true)

  // Image Upload State
  const [images, setImages] = useState<ImageFileItem[]>([])
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  // Auto Save & Leave Blocker
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Chưa lưu')
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // Submission State
  const [isSubmittingAI, setIsSubmittingAI] = useState<boolean>(false)
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize query param type
  useEffect(() => {
    if (initialType === 'RECEIPT') setTransactionType('PURCHASE_RECEIPT')
    else if (initialType === 'ISSUE') setTransactionType('MATERIAL_ISSUE')
    else if (initialType === 'TRANSFER') setTransactionType('TRANSFER_OUT')
    else if (initialType === 'STOCKTAKE') setTransactionType('STOCKTAKE')
  }, [initialType])

  // Fetch Workshops theo RBAC
  useEffect(() => {
    async function loadWorkshops() {
      try {
        setIsLoadingMasterData(true)
        const res = await fetch('/api/workshops')
        if (res.ok) {
          const data = await res.json()
          const list: WorkshopOption[] = data.data ?? []
          setWorkshops(list)
          if (list.length > 0) {
            setWorkshopId(list[0].id)
          }
        } else {
          console.error('Lỗi tải danh sách xưởng:', res.status)
        }
      } catch (err) {
        console.error('Lỗi tải danh mục xưởng:', err)
      } finally {
        setIsLoadingMasterData(false)
      }
    }
    loadWorkshops()
  }, [])

  // Fetch Warehouses khi workshopId thay đổi
  useEffect(() => {
    if (!workshopId) return
    async function loadWarehouses() {
      try {
        const res = await fetch(`/api/workshops/${workshopId}/warehouses`)
        if (res.ok) {
          const data = await res.json()
          const list: WarehouseOption[] = data.data ?? []
          setWarehouses(list)
          if (list.length > 0) {
            setSourceWarehouseId(list[0].id)
            setDestinationWarehouseId(list.length > 1 ? list[1].id : list[0].id)
          } else {
            setSourceWarehouseId('')
            setDestinationWarehouseId('')
          }
        } else {
          console.error('Lỗi tải danh sách kho:', res.status)
        }
      } catch (err) {
        console.error('Lỗi tải danh mục kho:', err)
      }
    }
    loadWarehouses()
  }, [workshopId])

  // Compute SHA-256 Client Side
  const computeSHA256Client = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Handle File Selection
  const handleFilesAdded = useCallback(async (filesList: FileList | File[]) => {
    setErrorMessage(null)
    const newItems: ImageFileItem[] = []

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i]

      // Format check
      if (!ALLOWED_TYPES.includes(file.type)) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext || '')) {
          setErrorMessage(`Tệp "${file.name}" không hợp lệ. Chỉ hỗ trợ JPG, PNG, WEBP và PDF.`)
          continue
        }
      }

      // Size check
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMessage(`Tệp "${file.name}" quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Giới hạn tối đa ${MAX_SIZE_MB}MB.`)
        continue
      }

      const previewUrl = file.type === 'application/pdf'
        ? '/pdf-placeholder.png'
        : URL.createObjectURL(file)

      const hash = await computeSHA256Client(file)

      newItems.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file,
        originalFilename: file.name,
        mimeType: file.type || 'image/jpeg',
        fileSize: file.size,
        previewUrl,
        rotation: 0,
        fileHash: hash,
        uploadProgress: 0,
        uploadStatus: 'PENDING',
      })
    }

    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems])
      setIsDirty(true)
    }
  }, [])

  // Rotate image (+90 deg)
  const handleRotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    )
    setIsDirty(true)
  }

  // Delete image
  const handleDeleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
    setIsDirty(true)
  }

  // Save Draft to Server / localStorage
  const handleSaveDraft = async (quiet = false) => {
    if (!workshopId) {
      if (!quiet) setErrorMessage('Vui lòng chọn xưởng trước khi lưu nháp.')
      return
    }

    try {
      if (!quiet) setAutoSaveStatus('Đang lưu...')
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transactionId,
          transactionType,
          workshopId,
          sourceWarehouseId,
          destinationWarehouseId,
          documentNumber,
          notes,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.data?.id) {
          setTransactionId(json.data.id)
        }
        const timeStr = new Date().toLocaleTimeString('vi-VN')
        setAutoSaveStatus(`Đã tự động lưu nháp (${timeStr})`)
        setIsDirty(false)
        if (!quiet) setErrorMessage(null)
      } else {
        if (!quiet) setAutoSaveStatus('Lỗi lưu nháp')
      }
    } catch (err) {
      console.error('Lưu nháp thất bại:', err)
      if (!quiet) setAutoSaveStatus('Lỗi kết nối')
    }
  }

  // Auto save debounce effect
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => {
      handleSaveDraft(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [isDirty, transactionType, workshopId, sourceWarehouseId, destinationWarehouseId, documentNumber, notes])

  // Window beforeunload blocker for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || images.some((img) => img.uploadStatus === 'PENDING')) {
        e.preventDefault()
        e.returnValue = 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời trang?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, images])

  // Upload single file with progress and retry support
  const uploadSingleFile = async (item: ImageFileItem, targetTxId: string): Promise<ImageFileItem> => {
    if (!item.file) return item

    // Set uploading state
    setImages((prev) =>
      prev.map((img) =>
        img.id === item.id ? { ...img, uploadStatus: 'UPLOADING', uploadProgress: 30 } : img
      )
    )

    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('transactionId', targetTxId)

      // Simulated upload progress steps
      setImages((prev) =>
        prev.map((img) =>
          img.id === item.id ? { ...img, uploadProgress: 70 } : img
        )
      )

      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`)
      }

      const json = await res.json()
      const data = json.data

      const updated: ImageFileItem = {
        ...item,
        uploadStatus: 'SUCCESS',
        uploadProgress: 100,
        signedUrl: data.signedUrl,
        isDuplicate: data.isDuplicate,
        duplicateTransactionId: data.duplicateTransactionId,
      }

      setImages((prev) => prev.map((img) => (img.id === item.id ? updated : img)))
      return updated
    } catch (err: any) {
      const failed: ImageFileItem = {
        ...item,
        uploadStatus: 'ERROR',
        uploadProgress: 0,
        errorMessage: err.message || 'Lỗi kết nối khi upload. Bấm Thử lại.',
      }
      setImages((prev) => prev.map((img) => (img.id === item.id ? failed : img)))
      return failed
    }
  }

  // Upload All Files & Submit for AI Processing
  const handleSubmitAI = async () => {
    setErrorMessage(null)
    setIsSubmittingAI(true)

    try {
      // Step A: Save Draft Transaction first if needed
      let currentTxId = transactionId
      if (!currentTxId) {
        const draftRes = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionType,
            workshopId,
            sourceWarehouseId,
            destinationWarehouseId,
            documentNumber,
            notes,
          }),
        })
        const draftData = await draftRes.json()
        if (!draftRes.ok || !draftData.data?.id) {
          throw new Error('Không thể tạo phiếu kho mới')
        }
        currentTxId = draftData.data.id
        setTransactionId(currentTxId)
      }

      // Step B: Upload all pending files
      const pendingFiles = images.filter((img) => img.uploadStatus !== 'SUCCESS')
      for (const item of pendingFiles) {
        await uploadSingleFile(item, currentTxId!)
      }

      // Step C: Trigger AI Processing API
      const aiRes = await fetch(`/api/transactions/${currentTxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUBMIT_AI' }),
      })

      if (!aiRes.ok) {
        throw new Error('Lỗi gửi xử lý AI')
      }

      const aiData = await aiRes.json()
      setAiSuccessMessage(`Đã gửi xử lý AI thành công! Mã phiếu: ${aiData.data?.transactionCode}`)

      // Redirect after 2s
      setTimeout(() => {
        router.push(`/mobile/transactions/${currentTxId}`)
      }, 1800)
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi xử lý')
    } finally {
      setIsSubmittingAI(false)
    }
  }

  return (
    <div className="wizard-container">
      {/* Top Stepper Navigation */}
      <div className="stepper-header glass">
        <div className="stepper-progress">
          <div
            className="stepper-progress-bar"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
        <div className="stepper-labels">
          <span className="step-badge">Bước {step}/6</span>
          <span className="step-title">
            {step === 1 && '1. Chọn loại phiếu'}
            {step === 2 && '2. Chọn xưởng & kho'}
            {step === 3 && '3. Chụp / Tải ảnh'}
            {step === 4 && '4. Preview & Xoay ảnh'}
            {step === 5 && '5. Lưu nháp'}
            {step === 6 && '6. Gửi xử lý AI'}
          </span>
          <span className="autosave-indicator">{autoSaveStatus}</span>
        </div>
      </div>

      {/* Main Content Card */}
      <main className="wizard-main">
        {errorMessage && (
          <div className="alert alert-danger animate-fade-in" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {aiSuccessMessage && (
          <div className="alert alert-success animate-fade-in" role="alert">
            <span className="alert-icon">✅</span>
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* STEP 1: Select Document Type */}
        {step === 1 && (
          <section className="step-section animate-fade-in">
            <h2 className="section-heading">Bước 1: Chọn loại phiếu kho</h2>
            <p className="section-sub">Vui lòng chọn loại chứng từ bạn muốn tạo và quét ảnh</p>

            <div className="doc-type-grid">
              {DOCUMENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`doc-type-card ${transactionType === type.id ? 'active' : ''}`}
                  style={{
                    '--card-color': type.color,
                    '--card-bg': type.bg,
                    '--card-border': type.border,
                  } as React.CSSProperties}
                  onClick={() => {
                    setTransactionType(type.id)
                    setIsDirty(true)
                  }}
                >
                  <span className="card-icon">{type.icon}</span>
                  <div className="card-info">
                    <span className="card-title">{type.label}</span>
                    <span className="card-subtitle">{type.subtitle}</span>
                  </div>
                  {transactionType === type.id && (
                    <span className="check-mark">✓</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 2: Select Workshop & Warehouse */}
        {step === 2 && (
          <section className="step-section animate-fade-in">
            <h2 className="section-heading">Bước 2: Chọn Xưởng và Kho</h2>
            <p className="section-sub">Xác định đơn vị quản lý và kho liên quan đến chứng từ</p>

            {isLoadingMasterData ? (
              <div className="loading-spinner">Đang tải danh mục...</div>
            ) : (
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="workshop-select" className="form-label">Xưởng sản xuất *</label>
                  <select
                    id="workshop-select"
                    className="form-select"
                    value={workshopId}
                    onChange={(e) => {
                      setWorkshopId(e.target.value)
                      setIsDirty(true)
                    }}
                  >
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        [{w.code}] {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="source-warehouse" className="form-label">
                    {transactionType === 'TRANSFER_OUT' ? 'Kho nguồn *' : 'Kho nhập / xuất *'}
                  </label>
                  <select
                    id="source-warehouse"
                    className="form-select"
                    value={sourceWarehouseId}
                    onChange={(e) => {
                      setSourceWarehouseId(e.target.value)
                      setIsDirty(true)
                    }}
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        [{wh.code}] {wh.name} ({wh.warehouseType})
                      </option>
                    ))}
                  </select>
                </div>

                {transactionType === 'TRANSFER_OUT' && (
                  <div className="form-group animate-fade-in">
                    <label htmlFor="dest-warehouse" className="form-label">Kho đích *</label>
                    <select
                      id="dest-warehouse"
                      className="form-select"
                      value={destinationWarehouseId}
                      onChange={(e) => {
                        setDestinationWarehouseId(e.target.value)
                        setIsDirty(true)
                      }}
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          [{wh.code}] {wh.name} ({wh.warehouseType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="doc-number" className="form-label">Số chứng từ (tùy chọn)</label>
                  <input
                    id="doc-number"
                    type="text"
                    className="form-input"
                    placeholder="VD: HD-001923"
                    value={documentNumber}
                    onChange={(e) => {
                      setDocumentNumber(e.target.value)
                      setIsDirty(true)
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 3: Capture / Upload Images */}
        {step === 3 && (
          <section className="step-section animate-fade-in">
            <h2 className="section-heading">Bước 3: Chụp hoặc Tải ảnh chứng từ</h2>
            <p className="section-sub">Chụp camera điện thoại hoặc chọn tệp (JPG, PNG, WEBP, PDF &lt; 20MB)</p>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            />

            {/* Action buttons for Mobile Camera & File Selection */}
            <div className="capture-actions">
              <button
                type="button"
                className="capture-btn primary-btn"
                onClick={() => cameraInputRef.current?.click()}
              >
                <span className="btn-icon">📷</span>
                <span>Chụp bằng Camera</span>
              </button>

              <button
                type="button"
                className="capture-btn secondary-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="btn-icon">📁</span>
                <span>Chọn từ thư viện</span>
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files)
              }}
            >
              <div className="dropzone-icon">☁️</div>
              <p className="dropzone-text">Hoặc kéo thả nhiều tệp vào đây</p>
              <span className="dropzone-hint">Hỗ trợ JPG, PNG, WEBP, PDF (Tối đa 20MB / tệp)</span>
            </div>

            {/* Summary count */}
            {images.length > 0 && (
              <div className="images-count-badge animate-fade-in">
                Đã chọn {images.length} tệp hình ảnh / PDF
              </div>
            )}
          </section>
        )}

        {/* STEP 4: Preview, Rotate & Delete Images */}
        {step === 4 && (
          <section className="step-section animate-fade-in">
            <h2 className="section-heading">Bước 4: Xem trước, Xoay và Xóa ảnh</h2>
            <p className="section-sub">Kiểm tra chất lượng ảnh, xoay chiều đúng và xóa bớt ảnh lỗi</p>

            {images.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🖼️</span>
                <p>Chưa có ảnh nào được chọn. Vui lòng quay lại Bước 3 để chụp hoặc tải ảnh.</p>
                <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>
                  Quay lại Bước 3
                </button>
              </div>
            ) : (
              <div className="image-preview-grid">
                {images.map((img, idx) => (
                  <div key={img.id} className="preview-card card">
                    <div className="preview-media-container">
                      {img.mimeType === 'application/pdf' ? (
                        <div className="pdf-preview-box">
                          <span className="pdf-icon">📄</span>
                          <span className="pdf-label">Tệp PDF</span>
                        </div>
                      ) : (
                        <img
                          src={img.previewUrl}
                          alt={`Preview ${idx + 1}`}
                          className="preview-image"
                          style={{ transform: `rotate(${img.rotation}deg)` }}
                        />
                      )}
                    </div>

                    <div className="preview-details">
                      <span className="preview-filename">{img.originalFilename}</span>
                      <span className="preview-filesize">
                        {(img.fileSize / 1024).toFixed(1)} KB • Hash: {img.fileHash?.slice(0, 8)}...
                      </span>

                      {img.isDuplicate && (
                        <div className="duplicate-tag">
                          ⚠️ Ảnh bị trùng (DUP-02)
                        </div>
                      )}
                    </div>

                    <div className="preview-controls">
                      <button
                        type="button"
                        className="control-btn rotate-btn"
                        onClick={() => handleRotateImage(img.id)}
                        title="Xoay 90 độ"
                      >
                        🔄 Xoay ({img.rotation}°)
                      </button>

                      <button
                        type="button"
                        className="control-btn delete-btn"
                        onClick={() => handleDeleteImage(img.id)}
                        title="Xóa ảnh này"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* STEP 5: Save Draft & Auto-Save */}
        {step === 5 && (
          <section className="step-section animate-fade-in">
            <h2 className="section-heading">Bước 5: Lưu bản nháp</h2>
            <p className="section-sub">Kiểm tra thông tin phiếu nháp và lưu trữ trước khi xử lý AI</p>

            <div className="draft-summary-card card">
              <div className="summary-row">
                <span className="summary-label">Loại phiếu:</span>
                <span className="summary-value font-bold">
                  {DOCUMENT_TYPES.find((t) => t.id === transactionType)?.label}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Xưởng:</span>
                <span className="summary-value">
                  {workshops.find((w) => w.id === workshopId)?.name || 'Chưa chọn'}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Kho:</span>
                <span className="summary-value">
                  {warehouses.find((wh) => wh.id === sourceWarehouseId)?.name || 'Chưa chọn'}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Số chứng từ:</span>
                <span className="summary-value">{documentNumber || '(Tự động tạo)'}</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Số tệp chứng từ:</span>
                <span className="summary-value">{images.length} tệp</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Trạng thái tự lưu:</span>
                <span className="summary-value text-muted">{autoSaveStatus}</span>
              </div>
            </div>

            <div className="draft-actions">
              <button
                type="button"
                className="btn btn-primary full-width"
                onClick={() => handleSaveDraft(false)}
              >
                💾 Lưu nháp thủ công
              </button>
            </div>
          </section>
        )}

        {/* STEP 6: Submit to AI & Upload Progress */}
        {step === 6 && (
          <section className="step-section animate-fade-in">
            <h2 className="section-heading">Bước 6: Tải lên & Gửi xử lý AI</h2>
            <p className="section-sub">Tiến trình upload private storage và trích xuất dữ liệu bằng AI</p>

            <div className="upload-progress-list">
              {images.map((img) => (
                <div key={img.id} className="progress-item card">
                  <div className="progress-info">
                    <span className="progress-filename">{img.originalFilename}</span>
                    <span className="progress-status">
                      {img.uploadStatus === 'PENDING' && 'Chờ upload'}
                      {img.uploadStatus === 'UPLOADING' && `Đang upload ${img.uploadProgress}%`}
                      {img.uploadStatus === 'SUCCESS' && '✅ Upload thành công'}
                      {img.uploadStatus === 'ERROR' && '❌ Lỗi upload'}
                    </span>
                  </div>

                  <div className="progress-bar-bg">
                    <div
                      className={`progress-bar-fill ${img.uploadStatus}`}
                      style={{ width: `${img.uploadProgress}%` }}
                    />
                  </div>

                  {img.uploadStatus === 'ERROR' && (
                    <button
                      type="button"
                      className="retry-btn"
                      onClick={() => transactionId && uploadSingleFile(img, transactionId)}
                    >
                      🔄 Thử lại
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="submit-actions">
              <button
                type="button"
                className="btn btn-emerald full-width btn-lg"
                disabled={isSubmittingAI || images.length === 0}
                onClick={handleSubmitAI}
              >
                {isSubmittingAI ? '⚡ Đang tải & trích xuất AI...' : '⚡ Bắt đầu trích xuất dữ liệu AI'}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Step Control Navigation Bar */}
      <footer className="wizard-footer glass">
        <button
          type="button"
          className="btn btn-outline"
          disabled={step === 1 || isSubmittingAI}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          ← Quay lại
        </button>

        {step < 6 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep((s) => Math.min(6, s + 1))}
          >
            Tiếp theo →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-emerald"
            disabled={isSubmittingAI}
            onClick={handleSubmitAI}
          >
            Hoàn tất
          </button>
        )}
      </footer>

      <style jsx>{`
        .wizard-container {
          min-height: 100dvh;
          background: var(--color-surface-soft, #f8fafc);
          padding-bottom: 90px;
        }

        .stepper-header {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border, #e2e8f0);
        }

        .stepper-progress {
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .stepper-progress-bar {
          height: 100%;
          background: var(--color-primary-600, #2563eb);
          transition: width 0.3s ease;
        }

        .stepper-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8125rem;
        }

        .step-badge {
          background: var(--color-primary-100, #dbeafe);
          color: var(--color-primary-700, #1d4ed8);
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .step-title {
          font-weight: 600;
          color: var(--color-text-primary, #0f172a);
        }

        .autosave-indicator {
          font-size: 0.75rem;
          color: var(--color-text-muted, #64748b);
        }

        .wizard-main {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-heading {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary, #0f172a);
          margin: 0 0 4px;
        }

        .section-sub {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #475569);
          margin: 0 0 16px;
        }

        .doc-type-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .doc-type-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: var(--card-bg);
          border: 2px solid var(--card-border);
          border-radius: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 64px;
        }

        .doc-type-card.active {
          border-color: var(--card-color);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .card-icon {
          font-size: 2rem;
          line-height: 1;
        }

        .card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .card-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--card-color);
        }

        .card-subtitle {
          font-size: 0.75rem;
          color: #475569;
        }

        .check-mark {
          font-size: 1.25rem;
          font-weight: bold;
          color: var(--card-color);
        }

        .form-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }

        .form-select, .form-input {
          height: 48px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.9375rem;
          background: #fff;
        }

        .capture-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .capture-btn {
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          border: none;
        }

        .primary-btn {
          background: #2563eb;
          color: #fff;
        }

        .secondary-btn {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #cbd5e1;
        }

        .dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          padding: 32px 16px;
          text-align: center;
          background: #fff;
          transition: all 0.2s ease;
        }

        .dropzone.drag-over {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .dropzone-icon {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }

        .dropzone-text {
          font-weight: 600;
          margin: 0 0 4px;
          color: #1e293b;
        }

        .dropzone-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .image-preview-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .preview-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          align-items: center;
        }

        .preview-media-container {
          width: 72px;
          height: 72px;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .preview-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .preview-filename {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-filesize {
          font-size: 0.75rem;
          color: #64748b;
        }

        .duplicate-tag {
          font-size: 0.6875rem;
          color: #d97706;
          font-weight: 600;
        }

        .preview-controls {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .control-btn {
          height: 32px;
          padding: 0 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          cursor: pointer;
        }

        .delete-btn {
          color: #ef4444;
          border-color: #fca5a5;
          background: #fef2f2;
        }

        .draft-summary-card {
          padding: 16px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .summary-label {
          color: #64748b;
        }

        .summary-value {
          color: #0f172a;
          font-weight: 500;
        }

        .upload-progress-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .progress-item {
          padding: 12px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          margin-bottom: 6px;
        }

        .progress-bar-bg {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.2s ease;
        }

        .progress-bar-fill.SUCCESS {
          background: #10b981;
        }

        .progress-bar-fill.ERROR {
          background: #ef4444;
        }

        .retry-btn {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #2563eb;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }

        .wizard-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn {
          height: 44px;
          padding: 0 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          border: none;
        }

        .btn-primary {
          background: #2563eb;
          color: #fff;
        }

        .btn-emerald {
          background: #059669;
          color: #fff;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
        }

        .full-width {
          width: 100%;
        }

        .btn-lg {
          height: 52px;
          font-size: 1rem;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
        }

        .alert-danger {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .alert-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }
      `}</style>
    </div>
  )
}
