/**
 * BarcodeScannerModal — opens the device camera and scans a barcode/QR code.
 * On a successful scan, calls onScan(decodedText) and closes itself.
 *
 * Uses html5-qrcode, which supports common 1D barcodes (CODE128, EAN, UPC, etc.)
 * as well as QR codes — good coverage for typical "unit number" labels.
 */
import React, { useEffect, useRef, useState } from 'react'
import { X, Camera as CameraIcon } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewport'

export default function BarcodeScannerModal({ open, onClose, onScan }) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setError('')
    setStarting(true)

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, /* verbose= */ false)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' }, // rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 260, height: 160 }, // wide box suits 1D barcodes
        },
        (decodedText) => {
          if (cancelled) return
          cancelled = true
          onScan(decodedText)
          stopScanner()
        },
        () => {
          // per-frame "not found" callback — ignore, this fires constantly while scanning
        }
      )
      .then(() => {
        if (!cancelled) setStarting(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setStarting(false)
          setError(
            err?.name === 'NotAllowedError'
              ? 'Izin kamera ditolak. Aktifkan izin kamera di browser untuk scan barcode.'
              : 'Tidak bisa mengakses kamera. Pastikan device memiliki kamera dan tidak dipakai aplikasi lain.'
          )
        }
      })

    function stopScanner() {
      const s = scannerRef.current
      scannerRef.current = null
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {})
      }
    }

    return () => {
      cancelled = true
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white dark:bg-steel-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-steel-100 dark:border-steel-800">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm text-steel-700 dark:text-steel-100">Scan Barcode Unit Number</h3>
          </div>
          <button
            onClick={() => { onClose() }}
            className="p-1 rounded hover:bg-steel-100 dark:hover:bg-steel-800"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <>
              {starting && (
                <p className="text-xs text-steel-400 mb-2">Membuka kamera…</p>
              )}
              <div id={SCANNER_ELEMENT_ID} className="w-full rounded-lg overflow-hidden bg-black" />
              <p className="text-xs text-steel-400 mt-2 text-center">
                Arahkan kamera ke barcode / QR code unit number.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
