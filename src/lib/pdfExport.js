/**
 * Export selected defect reports to an A4 landscape PDF.
 * Uses jsPDF + jspdf-autotable.
 *
 * Includes:
 *  - Position/detail photos (fetched from Cloudinary and embedded as real images)
 *  - Quadrant progress circles, redrawn as native PDF vector paths (jsPDF
 *    cannot render the React/SVG <QuadrantProgress> component directly, so
 *    we recreate the same visual using jsPDF's context2d drawing API)
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatDateTime } from './db'

const PERCENT = ['0%', '25%', '50%', '75%', '100%']

// ── Quadrant progress icon, drawn as native PDF vector paths ────────────────
// (A rasterized canvas→PNG was tried first but produced a pixelated/noisy
// blob once shrunk down to cell size in the PDF viewer. Drawing directly via
// jsPDF's context2d keeps it crisp at any zoom level.)
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

  // Filled quadrants (clockwise from top, same order as QuadrantProgress.jsx)
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

// ── Remote image (Cloudinary URL) → embeddable image data ───────────────────
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
    console.warn('exportToPDF: gagal memuat gambar untuk PDF:', url, err)
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

// Draw an image centered + "object-fit: contain" inside a box
function drawContained(doc, img, x, y, boxW, boxH) {
  if (!img) return
  const ratio = Math.min(boxW / img.width, boxH / img.height)
  const w = img.width * ratio
  const h = img.height * ratio
  try {
    doc.addImage(img.dataUrl, img.format, x + (boxW - w) / 2, y + (boxH - h) / 2, w, h)
  } catch (err) {
    console.warn('exportToPDF: gagal menambahkan gambar ke PDF:', err)
  }
}

/**
 * @param {Array} reports  Array of report objects to export
 */
export async function exportToPDF(reports) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 30)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('DEFECT REPORT TRACKER', 14, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 230, 12)

  // ── Pre-load images (must happen before autoTable draws anything) ──────────
  const images = await Promise.all(
    reports.map(r => Promise.all([loadImage(r.positionImageUrl), loadImage(r.detailImageUrl)]))
  )

  // ── Table ──────────────────────────────────────────────────────────────────
  const rows = reports.map((r, i) => [
    i + 1,
    r.unitNo || '—',
    '',                 // Images — drawn manually in didDrawCell
    r.cause        || '—',
    r.countermeasure || '—',
    '',                 // Progress — drawn manually in didDrawCell
    '',                 // Verification — drawn manually in didDrawCell
    formatDate(r.createdAt),
    formatDateTime(r.updatedAt),
  ])

  autoTable(doc, {
    startY: 22,
    head: [[
      'No', 'Unit No', 'Images',
      'Cause', 'Countermeasure',
      'Progress', 'Verification',
      'Created', 'Updated',
    ]],
    body: rows,
    theme: 'grid',
    styles: { minCellHeight: 26, valign: 'middle' },
    headStyles: {
      fillColor: [28, 110, 242],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      2: { cellWidth: 36 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },

    didDrawCell: data => {
      if (data.section !== 'body') return
      const { column, cell, row } = data
      const i = row.index
      const report = reports[i]
      if (!report) return
      const pad = 1.5

      // Images column
      if (column.index === 2) {
        const [pos, det] = images[i] || []
        if (pos && det) {
          const half = (cell.width - pad * 3) / 2
          drawContained(doc, pos, cell.x + pad, cell.y + pad, half, cell.height - pad * 2)
          drawContained(doc, det, cell.x + pad * 2 + half, cell.y + pad, half, cell.height - pad * 2)
        } else if (pos) {
          drawContained(doc, pos, cell.x + pad, cell.y + pad, cell.width - pad * 2, cell.height - pad * 2)
        } else {
          doc.setFontSize(6.5)
          doc.setTextColor(170)
          doc.text('No image', cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' })
        }
        return
      }

      // Progress / Verification columns
      if (column.index === 5 || column.index === 6) {
        const field = column.index === 5 ? 'progress' : 'verification'
        const v = Math.min(4, Math.max(0, report[field] ?? 0))
        const labelH = 4 // space reserved for the "75%" label below the circle
        const r = Math.min(cell.width, cell.height - labelH) / 2 - 1.5
        const cx = cell.x + cell.width / 2
        const cy = cell.y + pad + r
        drawProgressIcon(doc, v, cx, cy, r)
        doc.setFontSize(6)
        doc.setTextColor(100)
        doc.text(PERCENT[v], cx, cell.y + cell.height - 1.5, { align: 'center' })
      }
    },
  })

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Page ${p} of ${pageCount}`, 270, 205)
  }

  doc.save(`defect-reports-${Date.now()}.pdf`)
}
