/**
 * Dashboard — defect report table with full CRUD, search, filter, sort, export.
 */
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Filter, Download, Trash2, Pencil,
  Sun, Moon, LogOut, ShieldCheck, ChevronUp, ChevronDown,
  RefreshCw, X, CheckSquare, Square, Car, Hash,
} from 'lucide-react'
import { useAuth }      from '../hooks/useAuth'
import { useReports }   from '../hooks/useReports'
import { useDarkMode }  from '../hooks/useDarkMode'
import { formatDate, formatDateTime } from '../lib/db'
import { exportToPDF }  from '../lib/pdfExport'
import QuadrantProgress from '../components/QuadrantProgress'
import ReportModal      from '../components/ReportModal'
import ConfirmDialog    from '../components/ConfirmDialog'
import ImageModal       from '../components/ImageModal'
import ModelManager     from '../components/ModelManager'
import { useModels }    from '../hooks/useModels'
import LotManager       from '../components/LotManager'
import { useLotsByModelName } from '../hooks/useLots'
import toast            from 'react-hot-toast'

const PROGRESS_OPTS = ['All', '0%', '25%', '50%', '75%', '100%']
const PROGRESS_VAL  = { 'All': null, '0%': 0, '25%': 1, '50%': 2, '75%': 3, '100%': 4 }

export default function Dashboard() {
  const { user, logOut }   = useAuth()
  const { reports, loading, reload, add, update, remove } = useReports()
  const { models } = useModels()
  const [dark, setDark]    = useDarkMode()

  // Modals
  const [modal,    setModal]    = useState(null)  // null | 'add' | { report }
  const [delTarget,setDel]      = useState(null)  // report to delete
  const [imgSrc,   setImgSrc]   = useState(null)  // full-screen image src
  const [exportDialog, setExportDialog] = useState(false)
  const [showModelMgr, setShowModelMgr] = useState(false)
  const [showLotMgr,   setShowLotMgr]   = useState(false)

  // Filters
  const [search,   setSearch]   = useState('')
  const [filterP,  setFilterP]  = useState('All')
  const [filterM,  setFilterM]  = useState('All')
  const [filterL,  setFilterL]  = useState('All')

  const { lots } = useLotsByModelName(filterM !== 'All' ? filterM : null)

  // Selection for PDF export
  const [selected, setSelected] = useState(new Set())

  // ── Derived list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...reports]
    if (filterM !== 'All') {
      list = list.filter(r => r.model === filterM)
    }
    if (filterL !== 'All') {
      list = list.filter(r => r.lot === filterL)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.unitNo?.toLowerCase().includes(q))
    }
    if (filterP !== 'All') {
      list = list.filter(r => r.progress === PROGRESS_VAL[filterP])
    }
    return list
  }, [reports, search, filterP, filterM, filterL])

  // ── Selection helpers ───────────────────────────────────────────────────────
  const toggleSelect = id => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const allSelected  = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  const toggleAll    = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.id)))
  }

  // ── Inline progress update ──────────────────────────────────────────────────
  const updateField = async (report, field, value) => {
    await update(report.id, { [field]: value })
  }

  // ── Save (add or edit) ──────────────────────────────────────────────────────
  const handleSave = async (form) => {
    if (modal === 'add') await add(form)
    else await update(modal.id, form)
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    setExportDialog(true)
  }

  const handleExportConfirm = (targets, opts) => {
    if (targets.length === 0) { toast.error('No reports to export'); return }
    setExportDialog(false)
    toast.promise(exportToPDF(targets, opts), {
      loading: `Generating PDF (${targets.length} report${targets.length > 1 ? 's' : ''})…`,
      success: 'PDF downloaded',
      error: 'Failed to generate PDF',
    })
  }

  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950 flex flex-col">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-steel-900 border-b border-steel-200 dark:border-steel-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="p-1.5 bg-accent rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-steel-900 dark:text-steel-100 leading-none">Defect Report</p>
              <p className="text-[10px] text-steel-400 uppercase tracking-wider leading-none mt-0.5">Tracker</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
            <input
              type="text"
              placeholder="Search unit number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-steel-100 dark:bg-steel-800 border border-steel-200 dark:border-steel-700
                         rounded-lg text-steel-900 dark:text-steel-100 placeholder-steel-400
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-steel-400 hover:text-steel-600" />
              </button>
            )}
          </div>

          {/* Progress filter */}
          <div className="relative hidden sm:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400 pointer-events-none" />
            <select
              value={filterP}
              onChange={e => setFilterP(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm bg-steel-100 dark:bg-steel-800 border border-steel-200 dark:border-steel-700
                         rounded-lg text-steel-900 dark:text-steel-100 appearance-none
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              {PROGRESS_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Model filter */}
          <div className="relative hidden sm:block">
            <select
              value={filterM}
              onChange={e => { setFilterM(e.target.value); setFilterL('All') }}
              className="px-3 pr-8 py-2 text-sm bg-steel-100 dark:bg-steel-800 border border-steel-200 dark:border-steel-700
                         rounded-lg text-steel-900 dark:text-steel-100 appearance-none
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              <option value="All">All Models</option>
              {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>

          {/* Lot filter */}
          <div className="relative hidden sm:block">
            <select
              value={filterL}
              onChange={e => setFilterL(e.target.value)}
              className="px-3 pr-8 py-2 text-sm bg-steel-100 dark:bg-steel-800 border border-steel-200 dark:border-steel-700
                         rounded-lg text-steel-900 dark:text-steel-100 appearance-none
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              <option value="All">All Lots</option>
              {lots.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={reload} className="icon-btn" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {(user?.role === 'MASTER' || user?.role === 'QC') && (
              <button onClick={() => setShowModelMgr(true)} className="icon-btn" title="Manage Models">
                <Car className="w-4 h-4" />
              </button>
            )}
            {(user?.role === 'MASTER' || user?.role === 'QC') && (
              <button onClick={() => setShowLotMgr(true)} className="icon-btn" title="Manage Lots">
                <Hash className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleExport} className="icon-btn" title="Export PDF">
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModal('add')}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Report</span>
            </button>
            <button onClick={() => setDark(d => !d)} className="icon-btn" title="Toggle theme">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={logOut} className="icon-btn" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 pb-2 flex items-center gap-3 text-xs text-steel-400">
          <span className="font-mono">{user?.email}</span>
          <span>•</span>
          <span>{filtered.length} of {reports.length} reports</span>
          {filterM !== 'All' && (
            <><span>•</span><span className="text-accent font-medium">{filterM}</span></>
          )}
          {filterL !== 'All' && (
            <><span>•</span><span className="text-accent font-medium">Lot: {filterL}</span></>
          )}
          {selected.size > 0 && (
            <><span>•</span><span className="text-accent">{selected.size} selected</span></>
          )}
        </div>
      </header>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
              <p className="text-steel-400 text-sm">Loading reports…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onAdd={() => setModal('add')} />
        ) : (
          <div className="rounded-xl border border-steel-200 dark:border-steel-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-100 dark:bg-steel-800 text-left">
                    <Th w="w-10">
                      <button onClick={toggleAll}>
                        {allSelected
                          ? <CheckSquare className="w-4 h-4 text-accent" />
                          : <Square      className="w-4 h-4 text-steel-400" />}
                      </button>
                    </Th>
                    <Th w="w-12">No</Th>
                    <Th w="w-28">Unit No</Th>
                    <Th w="w-36">Images</Th>
                    <Th>Cause & Countermeasure</Th>
                    <Th w="w-24 text-center">Progress</Th>
                    <Th w="w-24 text-center">Verification</Th>
                    <Th w="w-24">Created</Th>
                    <Th w="w-28">Updated</Th>
                    <Th w="w-20 text-center">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100 dark:divide-steel-800">
                  {filtered.map((report, idx) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      rowNum={idx + 1}
                      selected={selected.has(report.id)}
                      onToggle={() => toggleSelect(report.id)}
                      onEdit={() => setModal(report)}
                      onDelete={() => setDel(report)}
                      onViewImage={src => setImgSrc(src)}
                      onProgressChange={v => updateField(report, 'progress', v)}
                      onVerificationChange={v => updateField(report, 'verification', v)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal && (
        <ReportModal
          report={modal === 'add' ? null : modal}
          user={user}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete Report"
          message={`Delete report for "${delTarget.unitNo}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={async () => { await remove(delTarget.id); setDel(null) }}
          onCancel={() => setDel(null)}
        />
      )}

      {imgSrc && (
        <ImageModal src={imgSrc} onClose={() => setImgSrc(null)} />
      )}

      {showModelMgr && (
        <ModelManager onClose={() => setShowModelMgr(false)} />
      )}

      {showLotMgr && (
        <LotManager onClose={() => setShowLotMgr(false)} />
      )}

      {exportDialog && (
        <ExportDialog
          reports={reports}
          models={models}
          selected={selected}
          onConfirm={(targets, opts) => handleExportConfirm(targets, opts)}
          onCancel={() => setExportDialog(false)}
        />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Th({ children, w = '', className = '' }) {
  return (
    <th className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-steel-500 dark:text-steel-400 ${w} ${className}`}>
      {children}
    </th>
  )
}

function ReportRow({ report, rowNum, selected, onToggle, onEdit, onDelete, onViewImage, onProgressChange, onVerificationChange }) {
  return (
    <tr className={`group transition-colors hover:bg-steel-50 dark:hover:bg-steel-800/50
      ${selected ? 'bg-blue-50/50 dark:bg-accent/5' : 'bg-white dark:bg-steel-900'}`}>

      {/* Checkbox */}
      <td className="px-3 py-3">
        <button onClick={onToggle}>
          {selected
            ? <CheckSquare className="w-4 h-4 text-accent" />
            : <Square      className="w-4 h-4 text-steel-300 dark:text-steel-600 group-hover:text-steel-400" />}
        </button>
      </td>

      {/* Row number */}
      <td className="px-3 py-3 font-mono text-xs text-steel-400">{rowNum}</td>

      {/* Unit No */}
      <td className="px-3 py-3 font-mono font-semibold text-steel-900 dark:text-steel-100 whitespace-nowrap">
        {report.unitNo || '—'}
      </td>

      {/* Images */}
      <td className="px-3 py-3">
        <ImageCell report={report} onView={onViewImage} />
      </td>

      {/* Cause & Countermeasure */}
      <td className="px-3 py-3 max-w-xs">
        <div className="space-y-1.5">
          {report.cause && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400 mb-0.5">Cause</p>
              <p className="text-xs text-steel-700 dark:text-steel-300 line-clamp-2">{report.cause}</p>
            </div>
          )}
          {report.cause && report.countermeasure && (
            <div className="border-t border-steel-100 dark:border-steel-800" />
          )}
          {report.countermeasure && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400 mb-0.5">Countermeasure</p>
              <p className="text-xs text-steel-700 dark:text-steel-300 line-clamp-2">{report.countermeasure}</p>
            </div>
          )}
          {!report.cause && !report.countermeasure && (
            <span className="text-xs text-steel-300 dark:text-steel-600 italic">No details yet</span>
          )}
        </div>
      </td>

      {/* Progress */}
      <td className="px-3 py-3 text-center">
        <div className="flex justify-center">
          <QuadrantProgress value={report.progress ?? 0} onChange={onProgressChange} size={40} />
        </div>
      </td>

      {/* Verification */}
      <td className="px-3 py-3 text-center">
        <div className="flex justify-center">
          <QuadrantProgress value={report.verification ?? 0} onChange={onVerificationChange} size={40} />
        </div>
      </td>

      {/* Created */}
      <td className="px-3 py-3 text-xs text-steel-500 dark:text-steel-400 whitespace-nowrap">
        {formatDate(report.createdAt)}
      </td>

      {/* Updated */}
      <td className="px-3 py-3 text-xs text-steel-500 dark:text-steel-400 whitespace-nowrap">
        {formatDateTime(report.updatedAt)}
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-center gap-1">
          <button onClick={onEdit}   className="icon-btn" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="icon-btn text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ImageCell({ report, onView }) {
  const { layoutType, positionImageUrl, detailImageUrl } = report

  if (!positionImageUrl) {
    return <span className="text-xs text-steel-300 dark:text-steel-600 italic">No images</span>
  }

  if (layoutType === 'single') {
    return (
      <button onClick={() => onView(positionImageUrl)} className="block group/img">
        <img src={positionImageUrl} alt="defect"
             className="h-12 aspect-video object-cover rounded border border-steel-200 dark:border-steel-700
                        group-hover/img:opacity-80 transition-opacity" />
      </button>
    )
  }

  // dual
  return (
    <div className="flex gap-1">
      <button onClick={() => onView(positionImageUrl)} className="group/img" title="Position photo">
        <img src={positionImageUrl} alt="position"
             className="h-12 w-12 object-cover rounded border border-steel-200 dark:border-steel-700
                        group-hover/img:opacity-80 transition-opacity" />
      </button>
      {detailImageUrl && (
        <button onClick={() => onView(detailImageUrl)} className="group/img" title="Detail photo">
          <img src={detailImageUrl} alt="detail"
               className="h-12 w-12 object-cover rounded border border-steel-200 dark:border-steel-700
                          group-hover/img:opacity-80 transition-opacity" />
        </button>
      )}
    </div>
  )
}

// ── Export Format Dialog ───────────────────────────────────────────────────────
function ExportDialog({ reports, models, selected, onConfirm, onCancel }) {
  const hasSelection = selected.size > 0

  const [source,      setSource]      = React.useState(hasSelection ? 'selected' : 'all')
  const [expModel,    setExpModel]    = React.useState('All')
  const [expLot,      setExpLot]      = React.useState('All')
  const [pageSize,    setPageSize]    = React.useState('a4')
  const [orientation, setOrientation] = React.useState('landscape')
  const [rowsPerPage, setRowsPerPage] = React.useState('auto')

  // Distinct model names present in reports (fallback to models list too, in case a model has 0 reports yet)
  const modelNames = React.useMemo(() => {
    const fromReports = reports.map(r => r.model).filter(Boolean)
    const fromModels  = models.map(m => m.name).filter(Boolean)
    return Array.from(new Set([...fromReports, ...fromModels])).sort()
  }, [reports, models])

  // Distinct lot names present in reports, scoped to the chosen model
  const lotNames = React.useMemo(() => {
    const pool = expModel === 'All' ? reports : reports.filter(r => r.model === expModel)
    return Array.from(new Set(pool.map(r => r.lot).filter(Boolean))).sort()
  }, [reports, expModel])

  // Reset lot choice whenever model choice changes
  React.useEffect(() => { setExpLot('All') }, [expModel])

  const targets = React.useMemo(() => {
    if (source === 'selected') return reports.filter(r => selected.has(r.id))
    let list = reports
    if (expModel !== 'All') list = list.filter(r => r.model === expModel)
    if (expLot   !== 'All') list = list.filter(r => r.lot === expLot)
    return list
  }, [source, expModel, expLot, reports, selected])

  const count = targets.length

  const OptionBtn = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
        ${active
          ? 'bg-accent text-white border-accent'
          : 'bg-steel-50 dark:bg-steel-800 border-steel-200 dark:border-steel-700 text-steel-700 dark:text-steel-300 hover:border-accent/60'
        }`}
    >
      {children}
    </button>
  )

  const selectCls = "w-full px-3 py-2 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-lg text-steel-900 dark:text-steel-100 appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all disabled:opacity-50"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <h2 className="font-semibold text-steel-900 dark:text-steel-100">Export PDF</h2>
          <button onClick={onCancel} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Source */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 mb-2">Source</p>
            <div className="flex gap-2 flex-wrap">
              {hasSelection && (
                <OptionBtn active={source === 'selected'} onClick={() => setSource('selected')}>
                  Selected ({selected.size})
                </OptionBtn>
              )}
              <OptionBtn active={source === 'all'} onClick={() => setSource('all')}>
                Pilih Model / Lot
              </OptionBtn>
            </div>
          </div>

          {/* Model & Lot pickers — only relevant when not exporting a fixed selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 mb-2">Model</p>
              <select
                value={expModel}
                disabled={source === 'selected'}
                onChange={e => setExpModel(e.target.value)}
                className={selectCls}
              >
                <option value="All">All Models</option>
                {modelNames.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 mb-2">Lot</p>
              <select
                value={expLot}
                disabled={source === 'selected'}
                onChange={e => setExpLot(e.target.value)}
                className={selectCls}
              >
                <option value="All">All Lots</option>
                {lotNames.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <p className="text-sm text-steel-500 dark:text-steel-400">
            Exporting <span className="font-semibold text-steel-900 dark:text-steel-100">{count}</span> report{count !== 1 ? 's' : ''}
            {source !== 'selected' && expModel !== 'All' && <> · <span className="text-accent font-medium">{expModel}</span></>}
            {source !== 'selected' && expLot   !== 'All' && <> · <span className="text-accent font-medium">Lot {expLot}</span></>}
          </p>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 mb-2">Page Size</p>
            <div className="flex gap-2">
              <OptionBtn active={pageSize === 'a4'} onClick={() => setPageSize('a4')}>A4</OptionBtn>
              <OptionBtn active={pageSize === 'a3'} onClick={() => setPageSize('a3')}>A3</OptionBtn>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 mb-2">Orientation</p>
            <div className="flex gap-2">
              <OptionBtn active={orientation === 'landscape'} onClick={() => setOrientation('landscape')}>Landscape</OptionBtn>
              <OptionBtn active={orientation === 'portrait'}  onClick={() => setOrientation('portrait')}>Portrait</OptionBtn>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 mb-2">Rows per Page</p>
            <div className="flex gap-2 flex-wrap">
              {['auto', 1, 2, 4, 6, 8, 12].map(n => (
                <OptionBtn key={n} active={rowsPerPage === n} onClick={() => setRowsPerPage(n)}>
                  {n === 'auto' ? 'Auto' : n}
                </OptionBtn>
              ))}
            </div>
            {rowsPerPage !== 'auto' && count > 0 && (
              <p className="text-xs text-steel-400 mt-2">
                {count} report{count !== 1 ? 's' : ''} ÷ {rowsPerPage}/page ={' '}
                <span className="font-medium text-steel-600 dark:text-steel-300">
                  {Math.ceil(count / rowsPerPage)} page{Math.ceil(count / rowsPerPage) !== 1 ? 's' : ''}
                </span>
              </p>
            )}
          </div>

          <div className="text-xs text-steel-400 bg-steel-50 dark:bg-steel-800 rounded-lg px-3 py-2">
            {pageSize.toUpperCase()} · {orientation.charAt(0).toUpperCase() + orientation.slice(1)} ·{' '}
            {pageSize === 'a4' && orientation === 'landscape' && '297 × 210 mm'}
            {pageSize === 'a4' && orientation === 'portrait'  && '210 × 297 mm'}
            {pageSize === 'a3' && orientation === 'landscape' && '420 × 297 mm'}
            {pageSize === 'a3' && orientation === 'portrait'  && '297 × 420 mm'}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-steel-200 dark:border-steel-700 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => onConfirm(targets, { pageSize, orientation, rowsPerPage })}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>
    </div>
  )
}


function EmptyState({ search, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="p-4 bg-steel-100 dark:bg-steel-800 rounded-2xl">
        <ShieldCheck className="w-8 h-8 text-steel-400" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-steel-700 dark:text-steel-300">
          {search ? `No reports matching "${search}"` : 'No reports yet'}
        </p>
        <p className="text-sm text-steel-400 mt-1">
          {search ? 'Try a different search term.' : 'Create your first defect report to get started.'}
        </p>
      </div>
      {!search && (
        <button onClick={onAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Report
        </button>
      )}
    </div>
  )
}
