'use client'

import { useState, useRef } from 'react'

interface Attachment {
  id: string
  storagePath: string
  originalFilename: string
  pageNumber?: number
}

interface ImageViewerProps {
  attachments: Attachment[]
  className?: string
}

export function ImageViewer({ attachments, className = '' }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const currentAttachment = attachments[currentIndex] || null

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => {
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }

  const handleRotateLeft = () => setRotation((prev) => (prev - 90) % 360)
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  if (!currentAttachment) {
    return (
      <div className={`bg-slate-900 text-slate-400 flex flex-col items-center justify-center p-8 rounded-xl ${className}`}>
        <svg className="w-16 h-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium">Không có ảnh đính kèm cho phiếu này</p>
      </div>
    )
  }

  // URL hiển thị ảnh (hỗ trợ cả demo path / static public file)
  const imageUrl = currentAttachment.storagePath.startsWith('/')
    ? currentAttachment.storagePath
    : `/${currentAttachment.storagePath}`

  return (
    <div className={`flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 ${className}`}>
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="font-semibold text-white">Ảnh gốc ({currentIndex + 1}/{attachments.length})</span>
          <span className="truncate max-w-[150px] text-slate-400">({currentAttachment.originalFilename})</span>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            title="Thu nhỏ"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>

          <span className="text-xs font-mono text-slate-400 min-w-[45px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            title="Phóng to"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            onClick={handleRotateLeft}
            title="Xoay trái 90°"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <button
            onClick={handleRotateRight}
            title="Xoay phải 90°"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            onClick={handleResetZoom}
            title="Đặt lại (Reset)"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 min-h-[450px] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt={currentAttachment.originalFilename}
          className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnail Selector bar if multiple pages */}
      {attachments.length > 1 && (
        <div className="bg-slate-900 p-2 border-t border-slate-800 flex gap-2 overflow-x-auto justify-center">
          {attachments.map((att, idx) => (
            <button
              key={att.id}
              onClick={() => {
                setCurrentIndex(idx)
                handleResetZoom()
              }}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-blue-500 ring-2 ring-blue-500/30 opacity-100'
                  : 'border-slate-700 opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={att.storagePath.startsWith('/') ? att.storagePath : `/${att.storagePath}`}
                alt={att.originalFilename}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[10px] text-white px-1 font-mono">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
