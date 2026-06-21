/**
 * ModelManager — dialog untuk MASTER mengelola daftar Model kendaraan.
 * Hanya bisa diakses oleh role MASTER.
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, Car } from 'lucide-react'
import { useModels } from '../hooks/useModels'
import toast from 'react-hot-toast'

export default function ModelManager({ onClose }) {
  const { models, loading, addModel, removeModel } = useModels()
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const name = input.trim()
    if (!name) return
    if (models.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Model sudah ada')
      return
    }
    setSaving(true)
    try {
      await addModel(name)
      setInput('')
      toast.success(`Model "${name}" ditambahkan`)
    } catch {
      toast.error('Gagal menambahkan model')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (model) => {
    try {
      await removeModel(model.id)
      toast.success(`Model "${model.name}" dihapus`)
    } catch {
      toast.error('Gagal menghapus model')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">Manage Models</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* Add input */}
          <div className="flex gap-2">
            <input
              type="text"
              className="field-input flex-1"
              placeholder="Nama model baru…"
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
            {!loading && models.length === 0 && (
              <p className="text-sm text-steel-400 text-center py-4">Belum ada model. Tambahkan di atas.</p>
            )}
            {models.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-steel-50 dark:bg-steel-800
                           border border-steel-200 dark:border-steel-700 group"
              >
                <span className="text-sm text-steel-800 dark:text-steel-200">{m.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600"
                  title="Hapus model"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-steel-400">
            {models.length} model terdaftar · Hover untuk hapus
          </p>
        </div>
      </div>
    </div>
  )
}
