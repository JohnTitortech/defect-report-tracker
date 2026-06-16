/**
 * ImageUploader modal.
 * Lets user choose Single vs Dual layout, then crops accordingly.
 * Returns { layoutType, positionBlob, detailBlob } via onSave.
 */
import React, { useState } from 'react'
import { X, ImageIcon, Images, AlertCircle } from 'lucide-react'
import ImageCropper from './ImageCropper'
import { uploadBlob } from '../lib/cloudinary'
import toast from 'react-hot-toast'

export default function ImageUploader({ initial = {}, onSave, onClose }) {
  const [layoutType, setLayout]    = useState(initial.layoutType || null)
  const [posBlob,    setPosBlob]   = useState(null)
  const [posPreview, setPosPreview]= useState(initial.positionImageUrl || null)
  const [detBlob,    setDetBlob]   = useState(null)
  const [detPreview, setDetPreview]= useState(initial.detailImageUrl   || null)
  const [uploading,  setUploading] = useState(false)
  const [step,       setStep]      = useState(layoutType ? 'crop' : 'layout')

  // Which crop slot is active ('position' | 'detail' | null)
  const [activeSlot, setActiveSlot] = useState(null)

  const chooseLayout = (type) => {
    // If layout changes, reset existing images
    if (type !== layoutType) {
      setPosBlob(null); setPosPreview(null)
      setDetBlob(null); setDetPreview(null)
    }
    setLayout(type)
    setStep('crop')
    setActiveSlot('position')
  }

  const handleCropped = (blob, dataUrl, slot) => {
    if (slot === 'position') {
      setPosBlob(blob); setPosPreview(dataUrl)
      if (layoutType === 'dual' && !detPreview) setActiveSlot('detail')
      else setActiveSlot(null)
    } else {
      setDetBlob(blob); setDetPreview(dataUrl)
      setActiveSlot(null)
    }
  }

  const canSave = layoutType === 'single'
    ? !!posPreview
    : !!posPreview && !!detPreview

  const handleSave = async () => {
    if (!canSave) return
    setUploading(true)
    const tid = toast.loading('Mengupload gambar ke Cloudinary…')
    try {
      let posUrl = initial.positionImageUrl || null
      let detUrl = initial.detailImageUrl   || null

      // Upload ke Cloudinary — folder "defect-reports" sebagai subfolder
      if (posBlob) posUrl = await uploadBlob(posBlob, 'defect-reports')
      if (detBlob) detUrl = await uploadBlob(detBlob, 'defect-reports')

      toast.success('Gambar berhasil disimpan', { id: tid })
      onSave({ layoutType, positionImageUrl: posUrl, detailImageUrl: layoutType === 'dual' ? detUrl : null })
    } catch (err) {
      toast.error(err.message || 'Upload gagal', { id: tid })
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-steel-200 dark:border-steel-700 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <h2 className="font-semibold text-steel-900 dark:text-steel-100 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-accent" />
            Image Configuration
          </h2>
          <button onClick={onClose} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Layout selection */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-steel-400 mb-3">
              Report Layout
            </p>
            <div className="grid grid-cols-2 gap-3">
              <LayoutCard
                selected={layoutType === 'single'}
                onClick={() => chooseLayout('single')}
                icon={<ImageIcon className="w-6 h-6" />}
                title="Option A — Single Image"
                desc="One landscape photo (16:9 crop)"
              />
              <LayoutCard
                selected={layoutType === 'dual'}
                onClick={() => chooseLayout('dual')}
                icon={<Images className="w-6 h-6" />}
                title="Option B — Dual Images"
                desc="Position + Detail (1:1 square crops)"
              />
            </div>
            {layoutType && (
              <p className="mt-2 text-xs text-steel-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Changing layout will require re-uploading images.
              </p>
            )}
          </div>

          {/* Crop section */}
          {layoutType && step === 'crop' && (
            <div className="space-y-4">

              {/* Slot tabs for dual */}
              {layoutType === 'dual' && (
                <div className="flex gap-2">
                  {['position','detail'].map(slot => (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${activeSlot === slot
                          ? 'bg-accent text-white'
                          : 'bg-steel-100 dark:bg-steel-800 text-steel-600 dark:text-steel-300 hover:bg-steel-200'}`}
                    >
                      {slot === 'position' ? '① Position Photo' : '② Detail Photo'}
                      {slot === 'position' && posPreview ? ' ✓' : ''}
                      {slot === 'detail'   && detPreview ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Active cropper */}
              {activeSlot && (
                <ImageCropper
                  key={`${layoutType}-${activeSlot}`}
                  layoutType={layoutType}
                  slot={activeSlot}
                  onCropped={(blob, url) => handleCropped(blob, url, activeSlot)}
                />
              )}

              {/* Preview thumbnails */}
              <div className="flex gap-3 flex-wrap">
                {posPreview && (
                  <div className="relative group">
                    <img
                      src={posPreview}
                      alt="Position preview"
                      className={`object-cover rounded-lg border-2 border-steel-200 dark:border-steel-700
                        ${layoutType === 'single' ? 'h-24 aspect-video' : 'h-20 w-20'}`}
                    />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                      {layoutType === 'single' ? 'Photo' : 'Position'}
                    </span>
                    <button
                      onClick={() => { setPosBlob(null); setPosPreview(null); setActiveSlot('position') }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                {layoutType === 'dual' && detPreview && (
                  <div className="relative group">
                    <img src={detPreview} alt="Detail preview"
                         className="h-20 w-20 object-cover rounded-lg border-2 border-steel-200 dark:border-steel-700" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">Detail</span>
                    <button
                      onClick={() => { setDetBlob(null); setDetPreview(null); setActiveSlot('detail') }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-steel-200 dark:border-steel-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave || uploading}
            className="btn-primary disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Save Images'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LayoutCard({ selected, onClick, icon, title, desc }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2
        ${selected
          ? 'border-accent bg-blue-50 dark:bg-accent/10'
          : 'border-steel-200 dark:border-steel-700 hover:border-steel-400 dark:hover:border-steel-500'
        }`}
    >
      <div className={`${selected ? 'text-accent' : 'text-steel-500'}`}>{icon}</div>
      <p className={`font-semibold text-sm ${selected ? 'text-accent' : 'text-steel-800 dark:text-steel-200'}`}>{title}</p>
      <p className="text-xs text-steel-500 dark:text-steel-400">{desc}</p>
    </button>
  )
}
