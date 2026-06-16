/**
 * ImageCropper — wraps Cropper.js via react-cropper.
 * Supports single (16:9 landscape) and dual (1:1 square) crop ratios.
 */
import React, { useRef, useState, useCallback } from 'react'
import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'
import { Upload, ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react'

export default function ImageCropper({ layoutType = 'single', slot = 'position', onCropped, onCancel }) {
  const cropperRef  = useRef(null)
  const fileRef     = useRef(null)
  const [src, setSrc]         = useState(null)
  const [ready, setReady]     = useState(false)

  const isSquare = layoutType === 'dual'
  const aspect   = isSquare ? 1 : 16 / 9

  const slotLabel = slot === 'detail' ? 'Detail Defect Photo' : 'Position Defect Photo'

  // ── File / Drop handling ───────────────────────────────────────────────────
  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => { setSrc(e.target.result); setReady(false) }
    reader.readAsDataURL(file)
  }

  const onFileChange = e => loadFile(e.target.files[0])

  const onDrop = useCallback(e => {
    e.preventDefault()
    loadFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver = e => e.preventDefault()

  // ── Crop controls ──────────────────────────────────────────────────────────
  const zoom = delta => cropperRef.current?.cropper?.zoom(delta)
  const reset = () => cropperRef.current?.cropper?.reset()

  const handleCrop = () => {
    const canvas = cropperRef.current?.cropper?.getCroppedCanvas(
      isSquare
        ? { width: 600, height: 600 }
        : { width: 960, height: 540 }
    )
    if (!canvas) return
    canvas.toBlob(blob => {
      if (blob) onCropped(blob, canvas.toDataURL('image/jpeg', 0.88))
    }, 'image/jpeg', 0.88)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-steel-600 dark:text-steel-300">
        {slotLabel}
        <span className="ml-2 text-xs font-normal text-steel-400">
          ({isSquare ? '1:1 square crop' : '16:9 landscape crop'})
        </span>
      </p>

      {/* Drop zone */}
      {!src && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-steel-300 dark:border-steel-600 rounded-lg p-8
                     flex flex-col items-center gap-2 cursor-pointer
                     hover:border-accent hover:bg-blue-50 dark:hover:bg-steel-800/50
                     transition-colors"
        >
          <Upload className="w-8 h-8 text-steel-400" />
          <p className="text-sm text-steel-500 dark:text-steel-400">
            Drop image here or <span className="text-accent font-medium">browse</span>
          </p>
          <p className="text-xs text-steel-400">JPG, PNG, WEBP supported</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {/* Cropper */}
      {src && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg overflow-hidden border border-steel-200 dark:border-steel-700 bg-steel-900"
               style={{ maxHeight: 360 }}>
            <Cropper
              ref={cropperRef}
              src={src}
              style={{ maxHeight: 360, width: '100%' }}
              aspectRatio={aspect}
              viewMode={1}
              dragMode="move"
              autoCropArea={0.9}
              restore={false}
              guides={true}
              center={true}
              highlight={false}
              cropBoxMovable={true}
              cropBoxResizable={true}
              toggleDragModeOnDblclick={false}
              ready={() => setReady(true)}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => zoom(0.1)}  className="icon-btn" title="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => zoom(-0.1)} className="icon-btn" title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={reset}            className="icon-btn" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => { setSrc(null); setReady(false) }} className="icon-btn" title="Change image">
              <Upload className="w-4 h-4" />
            </button>

            <div className="ml-auto flex gap-2">
              {onCancel && (
                <button onClick={onCancel} className="btn-ghost flex items-center gap-1">
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}
              <button
                onClick={handleCrop}
                disabled={!ready}
                className="btn-primary flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Use this crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
