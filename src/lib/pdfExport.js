/**
 * Export selected defect reports to an A4 landscape PDF.
 * Uses jsPDF + jspdf-autotable.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatDateTime } from './db'

const PROGRESS_LABEL = v => ['0%','25%','50%','75%','100%'][v] ?? '—'

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

  // ── Table ──────────────────────────────────────────────────────────────────
  const rows = reports.map((r, i) => [
    i + 1,
    r.unitNo || '—',
    r.layoutType === 'dual' ? 'Dual (Pos + Detail)' : 'Single',
    r.cause        || '—',
    r.countermeasure || '—',
    PROGRESS_LABEL(r.progress),
    PROGRESS_LABEL(r.verification),
    formatDate(r.createdAt),
    formatDateTime(r.updatedAt),
  ])

  autoTable(doc, {
    startY: 22,
    head: [[
      'No', 'Unit No', 'Image Layout',
      'Cause', 'Countermeasure',
      'Progress', 'Verification',
      'Created', 'Updated',
    ]],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 110, 242],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 48 },
      4: { cellWidth: 48 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 22 },
      8: { cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
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
