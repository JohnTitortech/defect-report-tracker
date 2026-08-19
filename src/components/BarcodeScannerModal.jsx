/**
 * BarcodeScannerModal — opens the device camera and scans a barcode/QR code.
 * On a successful scan, calls onScan(decodedText) and closes itself.
 *
 * Uses html5-qrcode. Restricted to CODE_39 and CODE_128 — the two symbologies
 * most commonly used on VIN / unit-number labels — to avoid the scanner
 * misinterpreting the barcode as another format and returning garbled text.
 * A scan is only accepted once the same value is read twice in a row, to
 * filter out one-off misreads on worn or low-contrast labels.
 */
import React, { useEffect, useRef, useState } from 'react'
import { X, Camera as CameraIcon } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewport'
const CONFIRM_READS = 2 // number of consecutive identical reads required before accepting

export default function BarcodeScannerModal({ open, onClose, onScan }) {
  const scannerRef = useRef(null)
  const lastValueRef = useRef('')
  const matchCountRef = useRef(0)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setError('')
    setStarting(true)
    lastValueRef.current = ''
    matchCountRef.current = 0

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_128,
      ],
    })
    scannerRef.current = scanner

    const scanCallback = (decodedText) => {
      if (cancelled) return

      const cleaned = decodedText.trim().toUpperCase()
      if (cleaned === lastValueRef.current) {
        matchCountRef.current += 1
      } else {
        lastValueRef.current = cleaned
        matchCountRef.current = 1
      }

      if (matchCountRef.current >= CONFIRM_READS) {
        cancelled = true
        onScan(cleaned)
        stopScanner()
      }
    }
    const errorCallback = () => {
      // per-frame "not found" callback — ignore, this fires constantly while scanning
    }
    const scanConfig = {
      fps: 10,
      // Dynamic box: use most of the camera's width so long barcodes (e.g. 17-char VINs)
      // fit inside the scan area instead of being cropped by a fixed-size box.
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const width = Math.floor(viewfinderWidth * 0.92)
        const height = Math.min(160, Math.floor(viewfinderHeight * 0.35))
        return { width, height }
      },
      aspectRatio: 1.5, // wider viewfinder helps fit long barcodes end-to-end
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    }

    // Try the highest resolution first; if the device/browser rejects it,
    // fall back to a lighter constraint set instead of failing outright.
    const cameraConfigs = [
      { facingMode: 'environment', width: { ideal: 4096 }, height: { ideal: 2160 } },
      { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      { facingMode: 'environment' },
    ]

    let lastErr = null
    ;(async () => {
      for (const camConfig of cameraConfigs) {
        if (cancelled) return
        try {
          await scanner.start(camConfig, scanConfig, scanCallback, errorCallback)
          if (!cancelled) setStarting(false)
          return
        } catch (err) {
          lastErr = err
          // NotAllowedError means the user denied permission — retrying with a
          // different resolution won't help, so stop trying immediately.
          if (err?.name === 'NotAllowedError') break
        }
      }
      if (!cancelled) {
        setStarting(false)
        setError(
          lastErr?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser untuk scan barcode.'
            : `Tidak bisa mengakses kamera${lastErr?.message ? `: ${lastErr.message}` : ''}. Pastikan device memiliki kamera dan tidak sedang dipakai aplikasi lain.`
        )
      }
    })()

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
                Arahkan kamera ke barcode / QR code unit number.<br />
                <span className="text-steel-400/80">
                  Untuk barcode panjang (VIN): jauhkan kamera sedikit agar seluruh barcode masuk kotak, dan pastikan barcode lurus horizontal.
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
