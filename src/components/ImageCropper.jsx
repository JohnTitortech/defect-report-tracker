/**
 * ImageCropper — wraps Cropper.js via react-cropper.
 * After cropping, opens ImageAnnotator so users can mark defect locations
 * with circles, rectangles, and arrows before the image is finalised.
 */
import React, { useRef, useState, useCallback } from 'react'
import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'
import { Upload, ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react'
import ImageAnnotator from './ImageAnnotator'

export default function ImageCropper({ layoutType = 'single', slot = 'position', onCropped, onCancel }) {
  const cropperRef  = useRef(null)
  const fileRef     = useRef(null)
  const [src, setSrc]               = useState(null)
  const [ready, setReady]           = useState(false)
  const [annotating, setAnnotating] = useState(false)  // step: crop → annotate
  const [croppedUrl, setCroppedUrl] = useState(null)   // dataUrl passed to annotator

  const isSquare = layoutType === 'dual'
  const aspect   = isSquare ? 1 : 16 / 9
  const slotLabel = slot === 'detail' ? 'Detail Defect Photo' : 'Position Defect Photo'

  // ── File / Drop handling ───────────────────────────────────────────────────
  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => { setSrc(e.target.result); setReady(false); setAnnotating(false); setCroppedUrl(null) }
    reader.readAsDataURL(file)
  }

  const onFileChange = e => loadFile(e.target.files[0])

  const onDrop = useCallback(e => {
    e.preventDefault()
    loadFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver = e => e.preventDefault()

  // ── Crop → proceed to annotator ───────────────────────────────────────────
  const zoom  = delta => cropperRef.current?.cropper?.zoom(delta)
  const reset = ()    => cropperRef.current?.cropper?.reset()

  const handleCrop = () => {
    const canvas = cropperRef.current?.cropper?.getCroppedCanvas(
      isSquare ? { width: 600, height: 600 } : { width: 960, height: 540 }
    )
    if (!canvas) return
    setCroppedUrl(canvas.toDataURL('image/jpeg', 0.92))
    setAnnotating(true)
  }

  // ── Annotator done ─────────────────────────────────────────────────────────
  const handleAnnotated = (blob, dataUrl) => {
    onCropped(blob, dataUrl)
    // reset local state so slot can be re-used if needed
    setSrc(null); setCroppedUrl(null); setAnnotating(false); setReady(false)
  }

  const handleAnnotateCancel = () => {
    // Go back to crop step
    setAnnotating(false)
    setCroppedUrl(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-steel-600 dark:text-steel-300">
        {slotLabel}
        <span className="ml-2 text-xs font-normal text-steel-400">
          {annotating
            ? '— Tandai letak defect'
            : `(${isSquare ? '1:1 square crop' : '16:9 landscape crop'})`}
        </span>
      </p>

      {/* ── Step 1: Drop zone ─────────────────────────────────────────────── */}
      {!src && !annotating && (
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

      {/* ── Step 2: Cropper ───────────────────────────────────────────────── */}
      {src && !annotating && (
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

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => zoom(0.1)}  className="icon-btn" title="Zoom in"><ZoomIn  className="w-4 h-4" /></button>
            <button onClick={() => zoom(-0.1)} className="icon-btn" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={reset}            className="icon-btn" title="Reset"><RotateCcw  className="w-4 h-4" /></button>
            <button onClick={() => { setSrc(null); setReady(false) }} className="icon-btn" title="Ganti foto">
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
                <Check className="w-4 h-4" /> Crop &amp; anotasi →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Annotator ─────────────────────────────────────────────── */}
      {annotating && croppedUrl && (
        <ImageAnnotator
          imageDataUrl={croppedUrl}
          onDone={handleAnnotated}
          onCancel={handleAnnotateCancel}
        />
      )}
    </div>
  )
}
