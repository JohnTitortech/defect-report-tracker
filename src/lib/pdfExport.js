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
 * @param {{ pageSize: 'a4'|'a3', orientation: 'landscape'|'portrait', rowsPerPage?: 'auto'|number }} options
 */
export async function exportToPDF(reports, options = {}) {
  const { pageSize = 'a4', orientation = 'landscape', rowsPerPage = 'auto',
          model = 'All', lot = 'All', inspectionType = 'All' } = options
  const cfgKey = `${pageSize}-${orientation}`
  const cfg = PAGE_CONFIGS[cfgKey] || PAGE_CONFIGS['a4-landscape']

  const { w: PAGE_W, h: PAGE_H, margin: MARGIN, fontSize: FS,
          imgColW, minRowH, titleFontSize } = cfg

  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize })

  // Scale factor relative to A4 landscape baseline — unaffected by rowsPerPage
  const scale = PAGE_W / 297

  // Derived sizes
  const titleBarH = Math.round(9 * scale)
  const startY    = titleBarH + 2

  // ── Header title text ────────────────────────────────────────────────────
  // "Temuan Problem {Inspection Type}", with the chosen Model/Lot appended in
  // quotes when a specific model was picked — e.g. Temuan Problem Final
  // Inspection "Fortuner Ambulance Lot 13". Falls back to a generic label
  // when no Inspection Type was chosen (e.g. exporting across all types).
  function buildHeaderTitle() {
    const base = (inspectionType && inspectionType !== 'All')
      ? `Temuan Problem ${inspectionType}`
      : 'Temuan Problem'
    if (model && model !== 'All') {
      const lotPart = (lot && lot !== 'All') ? ` Lot ${lot}` : ''
      return `${base} ${model}${lotPart}`
    }
    return base
  }
  const headerTitle = buildHeaderTitle()

  // Auto-shrink the title font if it's too long to fit the title bar width
  // (the dynamic model/lot title can be much longer than the old static label).
  doc.setFont('helvetica', 'bold')
  let headerFontSize = titleFontSize
  doc.setFontSize(headerFontSize)
  const maxTitleWidth = PAGE_W - MARGIN * 2
  while (doc.getTextWidth(headerTitle) > maxTitleWidth && headerFontSize > 6) {
    headerFontSize -= 0.5
    doc.setFontSize(headerFontSize)
  }

  // ── Title header (drawn once per page) ─────────────────────────────────────
  function drawTitleBar() {
    doc.setFillColor(245, 158, 11) // amber/orange-yellow
    doc.rect(0, 0, PAGE_W, titleBarH, 'F')
    doc.setTextColor(28, 28, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(headerFontSize)
    doc.text(headerTitle, PAGE_W / 2, titleBarH * 0.65, { align: 'center' })
  }

  // ── Pre-load images ──────────────────────────────────────────────────────
  const allImages = await Promise.all(
    reports.map(r => Promise.all([loadImage(r.positionImageUrl), loadImage(r.detailImageUrl)]))
  )
  const allCmImages = await Promise.all(
    reports.map(r => Promise.all([
      loadImage(r.cmBeforePositionImageUrl),
      loadImage(r.cmAfterPositionImageUrl),
    ]))
  )

  // ── Column widths (scale proportionally — same regardless of rowsPerPage) ──
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
    supplier:     Math.round(16 * s),
    progress:     Math.round(16 * s),
    verification: Math.round(16 * s),
    cmImage:      Math.round(imgColW * s),
    analyze:      0,
  }
  const fixedW = COL.no + COL.unit + COL.date + COL.problem + COL.image +
                 COL.qty + COL.design + COL.process + COL.supplier +
                 COL.progress + COL.verification + COL.cmImage
  COL.analyze = usableW - fixedW

  const CI = {
    no: 0, unit: 1, date: 2, problem: 3, image: 4,
    qty: 5, design: 6, process: 7, supplier: 8,
    analyze: 9, cmImage: 10, progress: 11, verification: 12,
  }

  function fmtDate(r) {
    if (r.date && typeof r.date === 'string') {
      const [y, m, d] = r.date.split('-')
      return `${d}/${m}/${y}`
    }
    return formatDate(r.createdAt)
  }

  const lineH = FS * 0.35278 + 1  // approx mm per line at given fontSize

  // ── Render one batch of rows (a "chunk") onto the current page ─────────────
  // numberOffset lets "No" keep counting up continuously across chunks/pages.
  function renderChunk(chunkReports, chunkImages, chunkCmImages, numberOffset) {
    const bodyRows = chunkReports.map((r, i) => [
      numberOffset + i + 1, r.unitNo || '—', fmtDate(r), r.problem || '—',
      '', r.qty ?? 1, '', '', '', '', '', '', '',
    ])

    const pad = Math.max(1, 1.5 * scale)
    const analyzeMaxW = COL.analyze - pad * 2

    // Mirrors the exact vertical layout used when drawing Cause/C-M text in
    // didDrawCell, so the computed row height always matches what's actually drawn.
    function analyzeContentHeight(cause, cmBefore, cmAfter) {
      let y = pad + lineH
      if (cause) {
        y += lineH
        const causeLines = doc.splitTextToSize(cause, analyzeMaxW)
        y += causeLines.length * lineH + lineH * 0.6
      }
      if (cmBefore) {
        y += lineH
        const beforeLines = doc.splitTextToSize(cmBefore, analyzeMaxW)
        y += beforeLines.length * lineH + lineH * 0.6
      }
      if (cmAfter) {
        y += lineH
        const afterLines = doc.splitTextToSize(cmAfter, analyzeMaxW)
        y += afterLines.length * lineH
      }
      // bottom padding + buffer for the last line's descender
      return y + pad + lineH * 0.5
    }

    // Pre-compute the row height each report's Cause/C-M text actually needs,
    // so autoTable reserves enough space instead of clipping the manually-drawn text.
    doc.setFontSize(FS)
    const rowHeights = chunkReports.map((r, i) => {
      const cause     = (r.cause || '').trim()
      const cmBefore  = (r.countermeasureBefore || r.countermeasure || '').trim()
      const cmAfter   = (r.countermeasureAfter || '').trim()
      const neededH = analyzeContentHeight(cause, cmBefore, cmAfter)
      // C/M images are stacked (Before on top of After) in a column COL.cmImage
      // wide — reserve enough height for both thumbnails plus their labels.
      const [cmBeforeImg, cmAfterImg] = chunkCmImages[i] || []
      const cmImgNeeded = (cmBeforeImg || cmAfterImg) ? COL.cmImage * 1.3 : 0
      return Math.max(minRowH, neededH, cmImgNeeded)
    })

    autoTable(doc, {
      startY,
      rowPageBreak: 'avoid',
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
          { content: 'C/M Images', rowSpan: 2 },
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
        fontSize: Math.max(FS - 1.5, 5),
        cellPadding: Math.max(0.5, scale),
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
        [CI.qty]:          { cellWidth: COL.qty,           halign: 'center', valign: 'middle' },
        [CI.design]:       { cellWidth: COL.design,        halign: 'center' },
        [CI.process]:      { cellWidth: COL.process,       halign: 'center' },
        [CI.supplier]:     { cellWidth: COL.supplier,      halign: 'center' },
        [CI.analyze]:      { cellWidth: COL.analyze },
        [CI.cmImage]:      { cellWidth: COL.cmImage },
        [CI.progress]:     { cellWidth: COL.progress,      halign: 'center' },
        [CI.verification]: { cellWidth: COL.verification,  halign: 'center' },
      },
      margin: { left: MARGIN, right: MARGIN, top: startY },

      didParseCell: data => {
        if (data.section !== 'body') return
        const needed = rowHeights[data.row.index]
        if (needed) data.cell.styles.minCellHeight = needed
      },

      didDrawPage: () => {
        // Redraw the title bar on every page this chunk spills onto
        // (e.g. when a row's content naturally overflows the page height).
        drawTitleBar()
      },

      didDrawCell: data => {
        if (data.section !== 'body') return
        const { column, cell, row } = data
        const i = row.index
        const report = chunkReports[i]
        if (!report) return
        const pad = Math.max(1, 1.5 * scale)

        // Images
        if (column.index === CI.image) {
          const [pos, det] = chunkImages[i] || []
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
          const cause    = (report.cause || '').trim()
          const cmBefore = (report.countermeasureBefore || report.countermeasure || '').trim()
          const cmAfter  = (report.countermeasureAfter || '').trim()
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

          if (cmBefore) {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(FS)
            doc.setTextColor(0, 0, 0)
            doc.text('C/M Before :', x, curY)
            curY += lineH
            doc.setFont('helvetica', 'normal')
            const beforeLines = doc.splitTextToSize(cmBefore, maxW)
            doc.text(beforeLines, x, curY)
            curY += beforeLines.length * lineH + lineH * 0.6
          }

          if (cmAfter) {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(FS)
            doc.setTextColor(0, 0, 0)
            doc.text('C/M After :', x, curY)
            curY += lineH
            doc.setFont('helvetica', 'normal')
            const afterLines = doc.splitTextToSize(cmAfter, maxW)
            doc.text(afterLines, x, curY)
          }

          if (!cause && !cmBefore && !cmAfter) {
            doc.setFontSize(FS - 0.5)
            doc.setTextColor(170, 170, 170)
            doc.text('—', x, cell.y + cell.height / 2, { baseline: 'middle' })
            doc.setTextColor(0, 0, 0)
          }
          return
        }

        // C/M Images — Before (top) / After (bottom), stacked
        if (column.index === CI.cmImage) {
          const [cmBeforeImg, cmAfterImg] = chunkCmImages[i] || []
          const halfH = (cell.height - pad * 3) / 2
          const labelFS = Math.max(FS - 1.5, 5)
          const labelH = labelFS * 0.35278 + 1.2
          const boxH = Math.max(0, halfH - labelH)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(labelFS)
          doc.setTextColor(80, 80, 80)
          doc.text('Before', cell.x + pad, cell.y + pad + labelH - 1)
          if (cmBeforeImg) {
            drawContained(doc, cmBeforeImg, cell.x + pad, cell.y + pad + labelH, cell.width - pad * 2, boxH)
          } else {
            doc.setTextColor(170, 170, 170)
            doc.text('No image', cell.x + cell.width / 2, cell.y + pad + labelH + boxH / 2, { align: 'center', baseline: 'middle' })
          }

          const y2 = cell.y + pad + halfH + pad
          doc.setTextColor(80, 80, 80)
          doc.text('After', cell.x + pad, y2 + labelH - 1)
          if (cmAfterImg) {
            drawContained(doc, cmAfterImg, cell.x + pad, y2 + labelH, cell.width - pad * 2, boxH)
          } else {
            doc.setTextColor(170, 170, 170)
            doc.text('No image', cell.x + cell.width / 2, y2 + labelH + boxH / 2, { align: 'center', baseline: 'middle' })
          }
          doc.setTextColor(0, 0, 0)
          return
        }

        // Progress & Verification (quadrant circle)
        if (column.index === CI.progress || column.index === CI.verification) {
          const field = column.index === CI.progress ? 'progress' : 'verification'
          const v = Math.min(4, Math.max(0, report[field] ?? 0))
          const r = Math.min(cell.width, cell.height) / 2 - 1.5
          const cx = cell.x + cell.width / 2
          const cy = cell.y + cell.height / 2
          drawProgressIcon(doc, v, cx, cy, r)
          return
        }
      },
    })
  }

  // ── Split into chunks if a fixed rows-per-page count was requested ─────────
  // 'auto' = let autoTable fit as many rows as the page allows (original behavior).
  const perPage = (rowsPerPage === 'auto' || !rowsPerPage) ? null : Math.max(1, Number(rowsPerPage))

  if (!perPage) {
    renderChunk(reports, allImages, allCmImages, 0)
  } else {
    for (let i = 0; i < reports.length; i += perPage) {
      if (i > 0) doc.addPage()
      renderChunk(reports.slice(i, i + perPage), allImages.slice(i, i + perPage), allCmImages.slice(i, i + perPage), i)
    }
  }

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
