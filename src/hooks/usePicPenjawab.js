/**
 * CRUD hook for the `pic_penjawab` Firestore collection.
 * Each document: { name: string, createdAt: Timestamp }
 * "PIC Penjawab" = the person (ASSY/QC) responsible for answering/responding
 * to a report — a separate master list from PIC Check (see usePics.js).
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'pic_penjawab'

export function usePicPenjawab() {
  const [picPenjawabList, setPicPenjawabList] = useState([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    const q    = query(collection(db, COL), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setPicPenjawabList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('usePicPenjawab:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  const addPicPenjawab = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addDoc(collection(db, COL), { name: trimmed, createdAt: serverTimestamp() })
  }, [])

  const removePicPenjawab = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id))
  }, [])

  return { picPenjawabList, loading, addPicPenjawab, removePicPenjawab }
}
