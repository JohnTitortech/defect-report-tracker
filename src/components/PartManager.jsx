/**
 * PartManager — dialog untuk QC/MASTER mengelola Part per Model.
 * Harus pilih Model dulu sebelum bisa tambah/hapus Part, sehingga
 * setiap Part otomatis terikat ke Model-nya (tidak perlu input manual).
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, Wrench, ChevronLeft } from 'lucide-react'
import { useModels } from '../hooks/useModels'
import { useParts }  from '../hooks/useParts'
import toast from 'react-hot-toast'

export default function PartManager({ onClose }) {
  const { models, loading: loadingModels } = useModels()
  const [selectedModel, setSelectedModel]  = useState(null) // { id, name }
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const { parts, loading: loadingParts, addPart, removePart } = useParts(selectedModel?.id)

  const handleAdd = async () => {
    const name = input.trim()
    if (!name || !selectedModel) return
    if (parts.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Part sudah ada di model ini')
      return
    }
    setSaving(true)
    try {
      await addPart(name)
      setInput('')
      toast.success(`Part "${name}" ditambahkan ke ${selectedModel.name}`)
    } catch {
      toast.error('Gagal menambahkan part')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (part) => {
    try {
      await removePart(part.id)
      toast.success(`Part "${part.name}" dihapus`)
    } catch {
      toast.error('Gagal menghapus part')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            {selectedModel && (
              <button
                type="button"
                onClick={() => { setSelectedModel(null); setInput('') }}
                className="icon-btn mr-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <Wrench className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">
              {selectedModel ? `Parts — ${selectedModel.name}` : 'Manage Parts'}
            </h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* Step 1 — pilih model */}
          {!selectedModel && (
            <>
              <p className="text-sm text-steel-500 dark:text-steel-400">
                Pilih model untuk melihat dan mengelola part-nya.
              </p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {loadingModels && (
                  <p className="text-sm text-steel-400 text-center py-4">Loading…</p>
                )}
                {!loadingModels && models.length === 0 && (
                  <p className="text-sm text-steel-400 text-center py-4">
                    Belum ada model. Tambahkan model terlebih dahulu.
                  </p>
                )}
                {models.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                               bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700
                               hover:border-accent/60 hover:bg-accent/5 transition-all text-left"
                  >
                    <span className="text-sm font-medium text-steel-800 dark:text-steel-200">{m.name}</span>
                    <ChevronLeft className="w-4 h-4 text-steel-400 rotate-180" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2 — kelola part */}
          {selectedModel && (
            <>
              {/* Add input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className="field-input flex-1"
                  placeholder="Nama part baru…"
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

              {/* Part list */}
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {loadingParts && (
                  <p className="text-sm text-steel-400 text-center py-4">Loading…</p>
                )}
                {!loadingParts && parts.length === 0 && (
                  <p className="text-sm text-steel-400 text-center py-4">
                    Belum ada part untuk model ini.
                  </p>
                )}
                {parts.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg
                               bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 group"
                  >
                    <span className="text-sm text-steel-800 dark:text-steel-200">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600"
                      title="Hapus part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-steel-400">
                {parts.length} part terdaftar · Hover untuk hapus
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
