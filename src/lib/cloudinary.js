/**
 * Cloudinary upload helpers.
 * Uses unsigned upload preset (no backend needed).
 *
 * Setup:
 *  1. Buka https://cloudinary.com → Settings → Upload → Upload Presets
 *  2. Buat preset baru, set Signing Mode = "Unsigned"
 *  3. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di .env
 *
 * Untuk DELETE:
 *  Cloudinary tidak mengizinkan delete via unsigned upload dari browser —
 *  wajib request yang di-sign pakai API secret, dan API secret TIDAK BOLEH
 *  ada di frontend. Jadi delete asli harus lewat backend/Cloud Function.
 *  Isi VITE_CLOUDINARY_DELETE_ENDPOINT dengan URL endpoint tersebut
 *  (menerima { url } atau { publicId }, lalu memanggil Cloudinary Admin API
 *  `destroy` dengan signature dari API secret di server).
 *  Jika endpoint belum ada, fungsi ini akan melempar error yang jelas
 *  (bukan diam-diam gagal) supaya UI bisa memberi tahu user.
 */

const CLOUD_NAME       = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const DELETE_ENDPOINT  = import.meta.env.VITE_CLOUDINARY_DELETE_ENDPOINT // optional backend endpoint

/**
 * Upload sebuah Blob ke Cloudinary.
 * @param {Blob} blob        - hasil crop canvas
 * @param {string} folder    - subfolder di Cloudinary, misal "defect-reports"
 * @returns {Promise<string>} URL gambar publik dari Cloudinary
 */
export async function uploadBlob(blob, folder = 'defect-reports') {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di file .env'
    )
  }

  const formData = new FormData()
  formData.append('file', blob)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Cloudinary upload gagal (${res.status})`)
  }

  const data = await res.json()
  // Kembalikan secure_url (HTTPS)
  return data.secure_url
}

/**
 * Ambil public_id dari secure_url Cloudinary.
 * Contoh: https://res.cloudinary.com/demo/image/upload/v1690000000/defect-reports/abc123.jpg
 *   → defect-reports/abc123
 */
export function extractPublicId(url) {
  if (!url) return null
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/)
  return match ? match[1] : null
}

/**
 * Hapus gambar dari Cloudinary lewat backend/Cloud Function (signed request).
 *
 * PENTING: ini BUKAN no-op lagi. Kalau VITE_CLOUDINARY_DELETE_ENDPOINT belum
 * di-set, fungsi ini akan melempar error supaya pemanggil tahu delete gagal
 * dan bisa menampilkan pesan ke user — bukan pura-pura berhasil.
 *
 * @param {string} url - secure_url gambar yang akan dihapus
 */
export async function deleteByUrl(url) {
  if (!url) return

  if (!DELETE_ENDPOINT) {
    throw new Error(
      'Delete Cloudinary belum dikonfigurasi (VITE_CLOUDINARY_DELETE_ENDPOINT kosong). ' +
      'Gambar hanya akan dilepas dari laporan, file asli masih ada di Cloudinary. ' +
      'Setup backend/Cloud Function untuk signed delete agar file benar-benar terhapus.'
    )
  }

  const publicId = extractPublicId(url)
  if (!publicId) {
    console.warn('deleteByUrl: tidak bisa mengekstrak public_id dari URL:', url)
    return
  }

  const res = await fetch(DELETE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, url }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || `Gagal menghapus gambar di Cloudinary (${res.status})`)
  }
}

/**
 * Konversi <canvas> element ke Blob.
 */
export function canvasToBlob(canvas, quality = 0.88) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob gagal')),
      'image/jpeg',
      quality,
    )
  })
}
