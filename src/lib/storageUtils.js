/**
 * Firebase Storage helpers — converts a canvas/blob to a stored URL.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

/**
 * Upload a Blob/File to Firebase Storage and return its public download URL.
 * @param {Blob} blob
 * @param {string} path  e.g. "reports/uid/position.jpg"
 */
export async function uploadBlob(blob, path) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' })
  return getDownloadURL(storageRef)
}

/**
 * Delete a file by its download URL (best-effort, ignores 404).
 */
export async function deleteByUrl(url) {
  if (!url) return
  try {
    const storageRef = ref(storage, url)
    await deleteObject(storageRef)
  } catch (_) {
    // ignore if already deleted
  }
}

/**
 * Convert a cropped <canvas> element to a Blob.
 */
export function canvasToBlob(canvas, quality = 0.88) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/jpeg',
      quality,
    )
  })
}
