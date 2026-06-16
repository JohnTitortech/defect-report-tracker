import React, { useEffect } from 'react'
import { X, ZoomIn } from 'lucide-react'

export default function ImageModal({ src, alt = 'Defect photo', onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in cursor-zoom-out"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default animate-slide-up"
      />
    </div>
  )
}
