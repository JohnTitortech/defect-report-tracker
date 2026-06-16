/**
 * Firestore CRUD operations for the reports collection.
 */
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'reports'

// ── Create ────────────────────────────────────────────────────────────────────
export async function createReport(data) {
  return addDoc(collection(db, COL), {
    unitNo:           data.unitNo           || '',
    cause:            data.cause            || '',
    countermeasure:   data.countermeasure   || '',
    progress:         data.progress         ?? 0,
    verification:     data.verification     ?? 0,
    layoutType:       data.layoutType       || 'single',
    positionImageUrl: data.positionImageUrl || null,
    detailImageUrl:   data.detailImageUrl   || null,
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  })
}

// ── Read ──────────────────────────────────────────────────────────────────────
export async function fetchReports() {
  const q   = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateReport(id, data) {
  return updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteReport(id) {
  return deleteDoc(doc(db, COL, id))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function tsToDate(ts) {
  if (!ts) return null
  if (ts instanceof Timestamp) return ts.toDate()
  if (ts?.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

export function formatDate(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
