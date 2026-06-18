/**
 * Export selected defect reports to an A4 landscape PDF.
 * Layout matches the reference sheet:
 *   No | Unit | Date | Problem | Image | Qty | Design | Process | Supplier | Cause & C/M
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './db'

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
  // No | Unit | Date | Problem | Image | Qty | Design | Process | Supplier | Analyze/CM
  const COL = {
    no:       6,
    unit:     10,
    date:     18,
    problem:  38,
    image:    38,
    qty:      8,
    design:   14,
    process:  14,
    supplier: 14,
    analyze:  0, // fill remaining
  }
  const fixedW = COL.no + COL.unit + COL.date + COL.problem + COL.image + COL.qty + COL.design + COL.process + COL.supplier
  COL.analyze = (PAGE_W - MARGIN * 2) - fixedW

  // Row data — images & responsible drawn in didDrawCell
  const rows = reports.map((r, i) => [
    i + 1,
    r.unitNo || '—',
    r.date ? formatDate({ seconds: undefined, _date: r.date }) : '—',
    r.problem || '—',
    '',   // image (drawn in didDrawCell)
    r.qty ?? 1,
    '',   // Design
    '',   // Process
    '',   // Supplier
    '',   // Analyze/CM (drawn in didDrawCell)
  ])

  // Helper to format date from raw YYYY-MM-DD string OR Firestore ts
  function fmtDate(r) {
    if (r.date && typeof r.date === 'string') {
      // parse YYYY-MM-DD
      const [y, m, d] = r.date.split('-')
      return `${d}/${m}/${y}`
    }
    return formatDate(r.createdAt)
  }

  // Re-build rows with correct date
  const bodyRows = reports.map((r, i) => [
    i + 1,
    r.unitNo || '—',
    fmtDate(r),
    r.problem || '—',
    '',   // image
    r.qty ?? 1,
    '',   // Design
    '',   // Process
    '',   // Supplier
    '',   // Analyze/CM
  ])

  // Column index map
  const CI = { no:0, unit:1, date:2, problem:3, image:4, qty:5, design:6, process:7, supplier:8, analyze:9 }

  autoTable(doc, {
    startY: 16,
    head: [
      // Row 1 — span Responsible over 3 cols, span Analyze/CM
      [
        { content: 'No',      rowSpan: 2 },
        { content: 'Unit',    rowSpan: 2 },
        { content: 'Date',    rowSpan: 2 },
        { content: 'Problem', rowSpan: 2 },
        { content: 'Image',   rowSpan: 2 },
        { content: 'Qty',     rowSpan: 2 },
        { content: 'Responsible', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Analyze/Countermeasure', rowSpan: 2 },
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
      [CI.no]:       { cellWidth: COL.no,       halign: 'center' },
      [CI.unit]:     { cellWidth: COL.unit,      halign: 'center' },
      [CI.date]:     { cellWidth: COL.date,      halign: 'center' },
      [CI.problem]:  { cellWidth: COL.problem },
      [CI.image]:    { cellWidth: COL.image },
      [CI.qty]:      { cellWidth: COL.qty,       halign: 'center' },
      [CI.design]:   { cellWidth: COL.design,    halign: 'center' },
      [CI.process]:  { cellWidth: COL.process,   halign: 'center' },
      [CI.supplier]: { cellWidth: COL.supplier,  halign: 'center' },
      [CI.analyze]:  { cellWidth: COL.analyze },
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
