/**
 * CRUD hook for the `inspection_types` Firestore collection.
 * Each document: { name: string, createdAt: Timestamp }
 * e.g. "Final Inspection", "Audit Internal" — extensible list of report categories.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'inspection_types'

export function useInspectionTypes() {
  const [inspectionTypes, setInspectionTypes] = useState([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    const q    = query(collection(db, COL), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setInspectionTypes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('useInspectionTypes:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  const addInspectionType = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addDoc(collection(db, COL), { name: trimmed, createdAt: serverTimestamp() })
  }, [])

  const removeInspectionType = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id))
  }, [])

  return { inspectionTypes, loading, addInspectionType, removeInspectionType }
}
