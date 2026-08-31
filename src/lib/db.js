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
    date:             data.date             || '',
    unitNo:           data.unitNo           || '',
    model:            data.model            || '',
    inspectionType:   data.inspectionType   || '',
    lot:              data.lot              || '',
    problem:          data.problem          || '',
    pic:              data.pic              || '',
    picPenjawab:      data.picPenjawab      || '',
    qty:              data.qty              ?? 1,
    responsible:      data.responsible      || [],
    cause:            data.cause            || '',
    countermeasureBefore: data.countermeasureBefore || '',
    countermeasureAfter:  data.countermeasureAfter  || '',
    progress:         data.progress         ?? 0,
    progressTimestamps: data.progressTimestamps || {},
    verification:     data.verification     ?? 0,
    layoutType:       data.layoutType       || 'single',
    positionImageUrl: data.positionImageUrl || null,
    detailImageUrl:   data.detailImageUrl   || null,
    cmBeforeLayoutType:       data.cmBeforeLayoutType       || null,
    cmBeforePositionImageUrl: data.cmBeforePositionImageUrl || null,
    cmBeforeDetailImageUrl:   data.cmBeforeDetailImageUrl   || null,
    cmAfterLayoutType:        data.cmAfterLayoutType        || null,
    cmAfterPositionImageUrl:  data.cmAfterPositionImageUrl  || null,
    cmAfterDetailImageUrl:    data.cmAfterDetailImageUrl    || null,
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

// Whole-day difference between two timestamps (fromTs -> toTs), rounded down.
// Returns null if either timestamp is missing, so the caller can render a blank cell.
export function diffDays(fromTs, toTs) {
  const from = tsToDate(fromTs)
  const to   = tsToDate(toTs)
  if (!from || !to) return null
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}
