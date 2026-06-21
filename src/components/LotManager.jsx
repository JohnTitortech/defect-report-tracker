/**
 * LotManager — dialog untuk QC/MASTER mengelola Lot per Model.
 * Harus pilih Model dulu sebelum bisa tambah/hapus Lot.
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, Hash, ChevronLeft } from 'lucide-react'
import { useModels } from '../hooks/useModels'
import { useLots }   from '../hooks/useLots'
import toast from 'react-hot-toast'

export default function LotManager({ onClose }) {
  const { models, loading: loadingModels } = useModels()
  const [selectedModel, setSelectedModel]  = useState(null) // { id, name }
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const { lots, loading: loadingLots, addLot, removeLot } = useLots(selectedModel?.id)

  const handleAdd = async () => {
    const name = input.trim()
    if (!name || !selectedModel) return
    if (lots.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Lot sudah ada di model ini')
      return
    }
    setSaving(true)
    try {
      await addLot(name)
      setInput('')
      toast.success(`Lot "${name}" ditambahkan ke ${selectedModel.name}`)
    } catch {
      toast.error('Gagal menambahkan lot')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (lot) => {
    try {
      await removeLot(lot.id)
      toast.success(`Lot "${lot.name}" dihapus`)
    } catch {
      toast.error('Gagal menghapus lot')
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
            <Hash className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">
              {selectedModel ? `Lots — ${selectedModel.name}` : 'Manage Lots'}
            </h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* Step 1 — pilih model */}
          {!selectedModel && (
            <>
              <p className="text-sm text-steel-500 dark:text-steel-400">
                Pilih model untuk melihat dan mengelola lot-nya.
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

          {/* Step 2 — kelola lot */}
          {selectedModel && (
            <>
              {/* Add input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className="field-input flex-1"
                  placeholder="Nama lot baru…"
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

              {/* Lot list */}
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {loadingLots && (
                  <p className="text-sm text-steel-400 text-center py-4">Loading…</p>
                )}
                {!loadingLots && lots.length === 0 && (
                  <p className="text-sm text-steel-400 text-center py-4">
                    Belum ada lot untuk model ini.
                  </p>
                )}
                {lots.map(l => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg
                               bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 group"
                  >
                    <span className="text-sm text-steel-800 dark:text-steel-200">{l.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(l)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600"
                      title="Hapus lot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-steel-400">
                {lots.length} lot terdaftar · Hover untuk hapus
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
