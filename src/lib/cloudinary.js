/**
 * Cloudinary upload helpers.
 * Uses unsigned upload preset (no backend needed).
 *
 * Setup:
 *  1. Buka https://cloudinary.com → Settings → Upload → Upload Presets
 *  2. Buat preset baru, set Signing Mode = "Unsigned"
 *  3. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di .env
 */

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET= import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

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
 * Hapus gambar dari Cloudinary.
 * Catatan: delete via unsigned upload tidak didukung Cloudinary secara langsung.
 * Untuk delete proper, butuh backend/Cloud Function dengan API secret.
 * Fungsi ini dibiarkan no-op agar tidak error — gambar lama akan tetap ada di Cloudinary.
 * Jika ingin delete otomatis, tambahkan Cloud Function dengan signed request.
 */
export async function deleteByUrl(_url) {
  // no-op — lihat catatan di atas
  console.info('deleteByUrl: skip (Cloudinary delete memerlukan signed request dari backend)')
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
