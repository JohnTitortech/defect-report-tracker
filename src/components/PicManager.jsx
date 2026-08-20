/**
 * PicManager — dialog untuk MASTER/QC mengelola daftar PIC (penanggung jawab Problem).
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, UserCog } from 'lucide-react'
import { usePics } from '../hooks/usePics'
import toast from 'react-hot-toast'

export default function PicManager({ onClose }) {
  const { pics, loading, addPic, removePic } = usePics()
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const name = input.trim()
    if (!name) return
    if (pics.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error('PIC sudah ada')
      return
    }
    setSaving(true)
    try {
      await addPic(name)
      setInput('')
      toast.success(`PIC "${name}" ditambahkan`)
    } catch {
      toast.error('Gagal menambahkan PIC')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pic) => {
    try {
      await removePic(pic.id)
      toast.success(`PIC "${pic.name}" dihapus`)
    } catch {
      toast.error('Gagal menghapus PIC')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">Manage PIC</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* Add input */}
          <div className="flex gap-2">
            <input
              type="text"
              className="field-input flex-1"
              placeholder="Nama PIC baru…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !input.trim()}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* List */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {loading && (
              <p className="text-sm text-steel-400 text-center py-4">Loading…</p>
            )}
            {!loading && pics.length === 0 && (
              <p className="text-sm text-steel-400 text-center py-4">Belum ada PIC. Tambahkan di atas.</p>
            )}
            {pics.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-steel-50 dark:bg-steel-800
                           border border-steel-200 dark:border-steel-700 group"
              >
                <span className="text-sm text-steel-800 dark:text-steel-200">{p.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600"
                  title="Hapus PIC"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-steel-400">
            {pics.length} PIC terdaftar · Hover untuk hapus
          </p>
        </div>
      </div>
    </div>
  )
}
