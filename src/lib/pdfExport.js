/**
 * Export selected defect reports to PDF.
 * Supports A4/A3, Landscape/Portrait with auto-scaled layout.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './db'

const PERCENT = ['0%', '25%', '50%', '75%', '100%']

// ── Page dimension configs ───────────────────────────────────────────────────
// jsPDF format sizes in mm: A4 = 297×210, A3 = 420×297
const PAGE_CONFIGS = {
  'a4-landscape': { w: 297, h: 210, margin: 8,  fontSize: 6.5,  imgColW: 38, minRowH: 22, titleFontSize: 11 },
  'a4-portrait':  { w: 210, h: 297, margin: 7,  fontSize: 6,    imgColW: 30, minRowH: 22, titleFontSize: 10 },
  'a3-landscape': { w: 420, h: 297, margin: 10, fontSize: 8,    imgColW: 52, minRowH: 28, titleFontSize: 13 },
  'a3-portrait':  { w: 297, h: 420, margin: 9,  fontSize: 7.5,  imgColW: 40, minRowH: 26, titleFontSize: 12 },
}

// ── Quadrant progress icon ───────────────────────────────────────────────────
function drawProgressIcon(doc, value, cx, cy, r) {
  const ctx = doc.context2d
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = r * 0.05
  ctx.strokeStyle = '#d1d5db'
  ctx.stroke()

  for (let i = 0; i < 4; i++) {
    if (i < value) {
      const start = -Math.PI / 2 + i * (Math.PI / 2)
      const end = start + Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = '#111827'
      ctx.fill()
    }
  }

  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = r * 0.035
  ctx.beginPath()
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r)
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = r * 0.05
  ctx.stroke()
}

// ── Remote image loader ──────────────────────────────────────────────────────
async function loadImage(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const { width, height } = await getImageDims(dataUrl)
    let format = (dataUrl.match(/^data:image\/(\w+)/)?.[1] || 'jpeg').toUpperCase()
    if (format === 'JPG') format = 'JPEG'
    return { dataUrl, width, height, format }
  } catch (err) {
    console.warn('exportToPDF: failed to load image:', url, err)
    return null
  }
}

function getImageDims(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 })
    img.onerror = () => resolve({ width: 1, height: 1 })
    img.src = dataUrl
  })
}

function drawContained(doc, img, x, y, boxW, boxH) {
  if (!img) return
  const ratio = Math.min(boxW / img.width, boxH / img.height)
  const w = img.width * ratio
  const h = img.height * ratio
  try {
    doc.addImage(img.dataUrl, img.format, x + (boxW - w) / 2, y + (boxH - h) / 2, w, h)
  } catch (err) {
    console.warn('exportToPDF: failed to add image:', err)
  }
}

/**
 * @param {Array} reports
 * @param {{ pageSize: 'a4'|'a3', orientation: 'landscape'|'portrait' }} options
 */
export async function exportToPDF(reports, options = {}) {
  const { pageSize = 'a4', orientation = 'landscape' } = options
  const cfgKey = `${pageSize}-${orientation}`
  const cfg = PAGE_CONFIGS[cfgKey] || PAGE_CONFIGS['a4-landscape']

  const { w: PAGE_W, h: PAGE_H, margin: MARGIN, fontSize: FS,
          imgColW, minRowH, titleFontSize } = cfg

  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize })

  // Scale factor relative to A4 landscape baseline
  const scale = PAGE_W / 297

  // Derived sizes
  const titleBarH = Math.round(14 * scale)
  const startY    = titleBarH + 2

  // ── Title header ─────────────────────────────────────────────────────────
  doc.setFillColor(28, 28, 28)
  doc.rect(0, 0, PAGE_W, titleBarH, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(titleFontSize)
  doc.text('DEFECT REPORT', MARGIN, titleBarH * 0.65)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FS - 0.5)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, PAGE_W - MARGIN, titleBarH * 0.65, { align: 'right' })

  // ── Pre-load images ──────────────────────────────────────────────────────
  const images = await Promise.all(
    reports.map(r => Promise.all([loadImage(r.positionImageUrl), loadImage(r.detailImageUrl)]))
  )

  // ── Column widths (scale proportionally) ────────────────────────────────
  const usableW = PAGE_W - MARGIN * 2

  // Fixed cols scaled from A4-landscape baseline proportions
  const s = usableW / 281  // 281 = original usable width
  const COL = {
    no:           Math.round(6  * s),
    unit:         Math.round(10 * s),
    date:         Math.round(18 * s),
    problem:      Math.round(34 * s),
    image:        Math.round(imgColW * s),
    qty:          Math.round(8  * s),
    design:       Math.round(13 * s),
    process:      Math.round(13 * s),
    supplier:     Math.round(13 * s),
    progress:     Math.round(16 * s),
    verification: Math.round(16 * s),
    analyze:      0,
  }
  const fixedW = COL.no + COL.unit + COL.date + COL.problem + COL.image +
                 COL.qty + COL.design + COL.process + COL.supplier +
                 COL.progress + COL.verification
  COL.analyze = usableW - fixedW

  const CI = {
    no: 0, unit: 1, date: 2, problem: 3, image: 4,
    qty: 5, design: 6, process: 7, supplier: 8,
    analyze: 9, progress: 10, verification: 11,
  }

  function fmtDate(r) {
    if (r.date && typeof r.date === 'string') {
      const [y, m, d] = r.date.split('-')
      return `${d}/${m}/${y}`
    }
    return formatDate(r.createdAt)
  }

  const bodyRows = reports.map((r, i) => [
    i + 1, r.unitNo || '—', fmtDate(r), r.problem || '—',
    '', r.qty ?? 1, '', '', '', '', '', '',
  ])

  const lineH = FS * 0.35278 + 1  // approx mm per line at given fontSize

  autoTable(doc, {
    startY,
    head: [
      [
        { content: 'No',      rowSpan: 2 },
        { content: 'Unit',    rowSpan: 2 },
        { content: 'Date',    rowSpan: 2 },
        { content: 'Problem', rowSpan: 2 },
        { content: 'Image',   rowSpan: 2 },
        { content: 'Qty',     rowSpan: 2 },
        { content: 'Responsible', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Analyze/Countermeasure', rowSpan: 2 },
        { content: 'Progress',     rowSpan: 2 },
        { content: 'Verification', rowSpan: 2 },
      ],
      ['Design', 'Process', 'Supplier'],
    ],
    body: bodyRows,
    theme: 'grid',
    styles: {
      fontSize: FS,
      cellPadding: Math.max(1, 1.5 * scale),
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: minRowH,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: FS,
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      [CI.no]:           { cellWidth: COL.no,           halign: 'center' },
      [CI.unit]:         { cellWidth: COL.unit,          halign: 'center' },
      [CI.date]:         { cellWidth: COL.date,          halign: 'center' },
      [CI.problem]:      { cellWidth: COL.problem },
      [CI.image]:        { cellWidth: COL.image },
      [CI.qty]:          { cellWidth: COL.qty,           halign: 'center' },
      [CI.design]:       { cellWidth: COL.design,        halign: 'center' },
      [CI.process]:      { cellWidth: COL.process,       halign: 'center' },
      [CI.supplier]:     { cellWidth: COL.supplier,      halign: 'center' },
      [CI.analyze]:      { cellWidth: COL.analyze },
      [CI.progress]:     { cellWidth: COL.progress,      halign: 'center' },
      [CI.verification]: { cellWidth: COL.verification,  halign: 'center' },
    },
    margin: { left: MARGIN, right: MARGIN },

    didDrawCell: data => {
      if (data.section !== 'body') return
      const { column, cell, row } = data
      const i = row.index
      const report = reports[i]
      if (!report) return
      const pad = Math.max(1, 1.5 * scale)

      // Images
      if (column.index === CI.image) {
        const [pos, det] = images[i] || []
        if (pos && det) {
          const half = (cell.width - pad * 3) / 2
          drawContained(doc, pos, cell.x + pad, cell.y + pad, half, cell.height - pad * 2)
          drawContained(doc, det, cell.x + pad * 2 + half, cell.y + pad, half, cell.height - pad * 2)
        } else if (pos) {
          drawContained(doc, pos, cell.x + pad, cell.y + pad, cell.width - pad * 2, cell.height - pad * 2)
        } else {
          doc.setFontSize(FS - 0.5)
          doc.setTextColor(170, 170, 170)
          doc.text('No image', cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' })
          doc.setTextColor(0, 0, 0)
        }
        return
      }

      // Responsible checkmarks
      const responsible = report.responsible || []
      if (column.index === CI.design || column.index === CI.process || column.index === CI.supplier) {
        const label = column.index === CI.design ? 'Design' : column.index === CI.process ? 'Process' : 'Supplier'
        if (responsible.includes(label)) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(Math.round(11 * scale))
          doc.setTextColor(0, 0, 0)
          doc.text('O', cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(FS)
        }
        return
      }

      // Analyze / Countermeasure
      if (column.index === CI.analyze) {
        const cause = (report.cause || '').trim()
        const cm    = (report.countermeasure || '').trim()
        const x = cell.x + pad
        const maxW = cell.width - pad * 2
        let curY = cell.y + pad + lineH

        if (cause) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(FS)
          doc.setTextColor(0, 0, 0)
          doc.text('Cause :', x, curY)
          curY += lineH
          doc.setFont('helvetica', 'normal')
          const causeLines = doc.splitTextToSize(cause, maxW)
          doc.text(causeLines, x, curY)
          curY += causeLines.length * lineH + lineH * 0.6
        }

        if (cm) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(FS)
          doc.setTextColor(0, 0, 0)
          doc.text('C/M :', x, curY)
          curY += lineH
          doc.setFont('helvetica', 'normal')
          const cmLines = doc.splitTextToSize(cm, maxW)
          doc.text(cmLines, x, curY)
        }

        if (!cause && !cm) {
          doc.setFontSize(FS - 0.5)
          doc.setTextColor(170, 170, 170)
          doc.text('—', x, cell.y + cell.height / 2, { baseline: 'middle' })
          doc.setTextColor(0, 0, 0)
        }
        return
      }

      // Progress & Verification (quadrant circle)
      if (column.index === CI.progress || column.index === CI.verification) {
        const field = column.index === CI.progress ? 'progress' : 'verification'
        const v = Math.min(4, Math.max(0, report[field] ?? 0))
        const labelH = FS * 0.35278 + 1.5
        const r = Math.min(cell.width, cell.height - labelH) / 2 - 1.5
        const cx = cell.x + cell.width / 2
        const cy = cell.y + pad + r
        drawProgressIcon(doc, v, cx, cy, r)
        doc.setFontSize(FS - 0.5)
        doc.setTextColor(100)
        doc.text(PERCENT[v], cx, cell.y + cell.height - 1.5, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        return
      }
    },
  })

  // ── Footer page numbers ───────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(FS - 0.5)
    doc.setTextColor(150)
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 3, { align: 'right' })
  }

  const suffix = `${pageSize.toUpperCase()}-${orientation}`
  doc.save(`defect-report-${suffix}-${Date.now()}.pdf`)
}
