/**
 * Export selected defect reports to an A4 landscape PDF.
 * Layout matches the reference sheet:
 *   No | Unit | Date | Problem | Image | Qty | Design | Process | Supplier | Cause & C/M | Progress | Verification
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './db'

const PERCENT = ['0%', '25%', '50%', '75%', '100%']

// ── Quadrant progress icon (from reference) ──────────────────────────────────
function drawProgressIcon(doc, value, cx, cy, r) {
  const ctx = doc.context2d

  // Background circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = r * 0.05
  ctx.strokeStyle = '#d1d5db'
  ctx.stroke()

  // Filled quadrants (clockwise from top)
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

  // Grid divider lines
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = r * 0.035
  ctx.beginPath()
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r)
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy)
  ctx.stroke()

  // Outer ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = r * 0.05
  ctx.stroke()
}

// ── Remote image → embeddable data ──────────────────────────────────────────
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

// Draw image centered + object-fit:contain inside a box
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
 */
export async function exportToPDF(reports) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PAGE_W = 297
  const MARGIN = 8

  // ── Title header ────────────────────────────────────────────────────────────
  doc.setFillColor(28, 28, 28)
  doc.rect(0, 0, PAGE_W, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('DEFECT REPORT', MARGIN, 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, PAGE_W - MARGIN, 9, { align: 'right' })

  // ── Pre-load images ──────────────────────────────────────────────────────────
  const images = await Promise.all(
    reports.map(r => Promise.all([loadImage(r.positionImageUrl), loadImage(r.detailImageUrl)]))
  )

  // Column widths (total ~ PAGE_W - 2*MARGIN = 281)
  // No | Unit | Date | Problem | Image | Qty | Design | Process | Supplier | Analyze/CM | Progress | Verification
  const COL = {
    no:           6,
    unit:         10,
    date:         18,
    problem:      34,
    image:        38,
    qty:          8,
    design:       13,
    process:      13,
    supplier:     13,
    progress:     16,
    verification: 16,
    analyze:      0, // fill remaining
  }
  const fixedW = COL.no + COL.unit + COL.date + COL.problem + COL.image +
                 COL.qty + COL.design + COL.process + COL.supplier +
                 COL.progress + COL.verification
  COL.analyze = (PAGE_W - MARGIN * 2) - fixedW

  // Column index map
  const CI = {
    no: 0, unit: 1, date: 2, problem: 3, image: 4,
    qty: 5, design: 6, process: 7, supplier: 8,
    analyze: 9, progress: 10, verification: 11,
  }

  // Helper to format date from raw YYYY-MM-DD string OR Firestore ts
  function fmtDate(r) {
    if (r.date && typeof r.date === 'string') {
      const [y, m, d] = r.date.split('-')
      return `${d}/${m}/${y}`
    }
    return formatDate(r.createdAt)
  }

  const bodyRows = reports.map((r, i) => [
    i + 1,
    r.unitNo || '—',
    fmtDate(r),
    r.problem || '—',
    '',   // image (drawn in didDrawCell)
    r.qty ?? 1,
    '',   // Design  (drawn in didDrawCell)
    '',   // Process (drawn in didDrawCell)
    '',   // Supplier(drawn in didDrawCell)
    '',   // Analyze/CM (drawn in didDrawCell)
    '',   // Progress   (drawn in didDrawCell)
    '',   // Verification (drawn in didDrawCell)
  ])

  autoTable(doc, {
    startY: 16,
    head: [
      // Row 1
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
      // Row 2 — sub-headers for Responsible
      ['Design', 'Process', 'Supplier'],
    ],
    body: bodyRows,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: 22,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.5,
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
      const pad = 1.5

      // ── Images ──────────────────────────────────────────────────────────────
      if (column.index === CI.image) {
        const [pos, det] = images[i] || []
        if (pos && det) {
          const half = (cell.width - pad * 3) / 2
          drawContained(doc, pos, cell.x + pad, cell.y + pad, half, cell.height - pad * 2)
          drawContained(doc, det, cell.x + pad * 2 + half, cell.y + pad, half, cell.height - pad * 2)
        } else if (pos) {
          drawContained(doc, pos, cell.x + pad, cell.y + pad, cell.width - pad * 2, cell.height - pad * 2)
        } else {
          doc.setFontSize(6)
          doc.setTextColor(170, 170, 170)
          doc.text('No image', cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' })
          doc.setTextColor(0, 0, 0)
        }
        return
      }

      // ── Responsible checkmarks ──────────────────────────────────────────────
      const responsible = report.responsible || []
      if (column.index === CI.design || column.index === CI.process || column.index === CI.supplier) {
        const label = column.index === CI.design ? 'Design' : column.index === CI.process ? 'Process' : 'Supplier'
        if (responsible.includes(label)) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(11)
          doc.setTextColor(0, 0, 0)
          doc.text('O', cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
        }
        return
      }

      // ── Analyze / Countermeasure ─────────────────────────────────────────────
      if (column.index === CI.analyze) {
        const cause = (report.cause || '').trim()
        const cm    = (report.countermeasure || '').trim()
        const x = cell.x + pad
        const maxW = cell.width - pad * 2
        let curY = cell.y + pad + 3.5

        if (cause) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(6.5)
          doc.setTextColor(0, 0, 0)
          doc.text('Cause :', x, curY)
          curY += 3.5
          doc.setFont('helvetica', 'normal')
          const causeLines = doc.splitTextToSize(cause, maxW)
          doc.text(causeLines, x, curY)
          curY += causeLines.length * 3.5 + 2
        }

        if (cm) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(6.5)
          doc.setTextColor(0, 0, 0)
          doc.text('C/M :', x, curY)
          curY += 3.5
          doc.setFont('helvetica', 'normal')
          const cmLines = doc.splitTextToSize(cm, maxW)
          doc.text(cmLines, x, curY)
        }

        if (!cause && !cm) {
          doc.setFontSize(6)
          doc.setTextColor(170, 170, 170)
          doc.text('—', x, cell.y + cell.height / 2, { baseline: 'middle' })
          doc.setTextColor(0, 0, 0)
        }
        return
      }

      // ── Progress & Verification (quadrant circle) ────────────────────────────
      if (column.index === CI.progress || column.index === CI.verification) {
        const field = column.index === CI.progress ? 'progress' : 'verification'
        const v = Math.min(4, Math.max(0, report[field] ?? 0))
        const labelH = 4
        const r = Math.min(cell.width, cell.height - labelH) / 2 - 1.5
        const cx = cell.x + cell.width / 2
        const cy = cell.y + pad + r
        drawProgressIcon(doc, v, cx, cy, r)
        doc.setFontSize(6)
        doc.setTextColor(100)
        doc.text(PERCENT[v], cx, cell.y + cell.height - 1.5, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        return
      }
    },
  })

  // ── Footer page numbers ─────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, 207, { align: 'right' })
  }

  doc.save(`defect-report-${Date.now()}.pdf`)
}
