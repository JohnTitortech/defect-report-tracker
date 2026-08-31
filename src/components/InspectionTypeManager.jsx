/**
 * InspectionTypeManager — dialog untuk MASTER/QC mengelola daftar Inspection Type
 * (mis. "Final Inspection", "Audit Internal").
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, ListChecks } from 'lucide-react'
import { useInspectionTypes } from '../hooks/useInspectionTypes'
import toast from 'react-hot-toast'

export default function InspectionTypeManager({ onClose }) {
  const { inspectionTypes, loading, addInspectionType, removeInspectionType } = useInspectionTypes()
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const name = input.trim()
    if (!name) return
    if (inspectionTypes.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Inspection Type sudah ada')
      return
    }
    setSaving(true)
    try {
      await addInspectionType(name)
      setInput('')
      toast.success(`Inspection Type "${name}" ditambahkan`)
    } catch {
      toast.error('Gagal menambahkan Inspection Type')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type) => {
    try {
      await removeInspectionType(type.id)
      toast.success(`Inspection Type "${type.name}" dihapus`)
    } catch {
      toast.error('Gagal menghapus Inspection Type')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">Manage Inspection Type</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* Add input */}
          <div className="flex gap-2">
            <input
              type="text"
              className="field-input flex-1"
              placeholder="Inspection Type baru…"
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
            {!loading && inspectionTypes.length === 0 && (
              <p className="text-sm text-steel-400 text-center py-4">Belum ada Inspection Type. Tambahkan di atas.</p>
            )}
            {inspectionTypes.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-steel-50 dark:bg-steel-800
                           border border-steel-200 dark:border-steel-700 group"
              >
                <span className="text-sm text-steel-800 dark:text-steel-200">{t.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600"
                  title="Hapus Inspection Type"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-steel-400">
            {inspectionTypes.length} Inspection Type terdaftar · Hover untuk hapus
          </p>
        </div>
      </div>
    </div>
  )
}
