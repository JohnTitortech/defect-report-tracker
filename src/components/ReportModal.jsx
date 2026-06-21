/**
 * ReportModal — add or edit a defect report.
 */
import React, { useState } from 'react'
import { X, ImageIcon, Camera } from 'lucide-react'
import QuadrantProgress from './QuadrantProgress'
import ImageUploader from './ImageUploader'
import { useModels } from '../hooks/useModels'

// Helper: returns today's date as YYYY-MM-DD string (local time)
function todayStr() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const RESPONSIBLE_OPTS = ['Process', 'Design', 'Supplier']

const EMPTY = {
  date: todayStr(),
  unitNo: '', problem: '', qty: 1, responsible: [], cause: '', countermeasure: '',
  progress: 0, verification: 0,
  layoutType: null, positionImageUrl: null, detailImageUrl: null,
  model: '',
}

export default function ReportModal({ report = null, user, onSave, onClose }) {

  const isQC =
    user?.role === 'QC' ||
    user?.role === 'MASTER'
  
  const { models } = useModels()
  const isEdit = !!report
  const [form, setForm]       = useState(isEdit ? { date: report.date || todayStr(), qty: report.qty ?? 1, responsible: report.responsible || [], ...report } : { ...EMPTY })
  const [showImages, setShowImages] = useState(false)
  const [saving, setSaving]   = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.unitNo.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  const handleImageSave = (imgData) => {
    setForm(f => ({ ...f, ...imgData }))
    setShowImages(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-steel-200 dark:border-steel-700 animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">
              {isEdit ? 'Edit Report' : 'New Defect Report'}
            </h2>
            <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

            {/* Date */}
            <div>
              <label className="field-label">Date *</label>
              <input
                type="date"
                className="field-input"
                value={form.date || ''}
                onChange={e => set('date', e.target.value)}
                required
              />
            </div>

            {/* Model — QC only */}
            {isQC && (
              <div>
                <label className="field-label">Model</label>
                <select
                  className="field-input"
                  value={form.model || ''}
                  onChange={e => set('model', e.target.value)}
                >
                  <option value="">— Pilih Model —</option>
                  {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            )}

            {/* Unit Number */}
            <div>
              <label className="field-label">Unit Number *</label>
              <input
                type="text"
                className="field-input font-mono"
                placeholder="e.g. UNIT-001, MC-102, PRESS-05"
                value={form.unitNo}
                onChange={e => set('unitNo', e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Images */}
            <div>
              <label className="field-label">Images</label>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  disabled={!isQC}
                  onClick={() => {
                    if (isQC) {
                      setShowImages(true)
                    }
                  }}
                  className="btn-ghost flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {form.positionImageUrl ? 'Change Images' : 'Add Images'}
                </button>
                {/* Tiny previews */}
                {form.positionImageUrl && (
                  <div className="flex gap-2">
                    <img src={form.positionImageUrl} alt="position"
                         className={`object-cover rounded border border-steel-200 dark:border-steel-700
                           ${form.layoutType === 'single' ? 'h-10 aspect-video' : 'h-10 w-10'}`} />
                    {form.layoutType === 'dual' && form.detailImageUrl && (
                      <img src={form.detailImageUrl} alt="detail"
                           className="h-10 w-10 object-cover rounded border border-steel-200 dark:border-steel-700" />
                    )}
                  </div>
                )}
                {!form.positionImageUrl && (
                  <span className="text-xs text-steel-400 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> No images yet
                  </span>
                )}
              </div>
            </div>

            {/* Problem */}
            <div>
              <label className="field-label">
                Problem
              </label>
            
              <textarea
                className="field-input"
                rows={3}
                value={form.problem}
                disabled={!isQC}
                onChange={e => set('problem', e.target.value)}
                placeholder="Describe the problem"
              />
            </div>

            {/* Qty */}
            <div>
              <label className="field-label">Qty</label>
              <select
                className="field-input"
                value={form.qty ?? 1}
                onChange={e => set('qty', Number(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Responsible (multi-select) */}
            <div>
              <label className="field-label">Responsible</label>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {RESPONSIBLE_OPTS.map(opt => {
                  const isActive = (form.responsible || []).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const current = form.responsible || []
                        const next = isActive
                          ? current.filter(r => r !== opt)
                          : [...current, opt]
                        set('responsible', next)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                        ${isActive
                          ? opt === 'Process'
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : opt === 'Design'
                            ? 'bg-violet-500 border-violet-500 text-white'
                            : 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-steel-50 dark:bg-steel-800 border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-300 hover:border-steel-400 dark:hover:border-steel-500'
                        }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {(form.responsible || []).length === 0 && (
                <p className="text-xs text-steel-400 mt-1.5">Pilih satu atau lebih pihak yang bertanggung jawab</p>
              )}
            </div>
            
            {/* Cause */}
            <div>
              <label className="field-label">Cause</label>
              <textarea
                className="field-input min-h-[72px] resize-none"
                placeholder="Describe the root cause…"
                value={form.cause}
                onChange={e => set('cause', e.target.value)}
              />
            </div>

            {/* Countermeasure */}
            <div>
              <label className="field-label">Countermeasure</label>
              <textarea
                className="field-input min-h-[72px] resize-none"
                placeholder="Describe the corrective action…"
                value={form.countermeasure}
                onChange={e => set('countermeasure', e.target.value)}
              />
            </div>

            {/* Progress & Verification */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center gap-2">
                <label className="field-label text-center">Progress</label>
                <QuadrantProgress value={form.progress} onChange={v => set('progress', v)} size={56} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <label className="field-label text-center">Countermeasure Verification</label>
                <QuadrantProgress value={form.verification} onChange={v => set('verification', v)} size={56} />
              </div>
            </div>

          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-steel-200 dark:border-steel-700 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!form.unitNo.trim() || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Report'}
            </button>
          </div>
        </div>
      </div>

      {showImages && (
        <ImageUploader
          initial={{ layoutType: form.layoutType, positionImageUrl: form.positionImageUrl, detailImageUrl: form.detailImageUrl }}
          onSave={handleImageSave}
          onClose={() => setShowImages(false)}
        />
      )}
    </>
  )
}
