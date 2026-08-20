/**
 * CRUD hook for the `pics` Firestore collection.
 * Each document: { name: string, createdAt: Timestamp }
 * "PIC" = the QC person responsible for filling in a report's Problem.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'pics'

export function usePics() {
  const [pics,    setPics]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q    = query(collection(db, COL), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setPics(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('usePics:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  const addPic = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addDoc(collection(db, COL), { name: trimmed, createdAt: serverTimestamp() })
  }, [])

  const removePic = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id))
  }, [])

  return { pics, loading, addPic, removePic }
}
