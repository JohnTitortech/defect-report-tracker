/**
 * CRUD hook for the `models` Firestore collection.
 * Each document: { name: string, createdAt: Timestamp }
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'

const COL = 'models'

export function useModels() {
  const [models,  setModels]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q    = query(collection(db, COL), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setModels(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('useModels:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  const addModel = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addDoc(collection(db, COL), { name: trimmed, createdAt: serverTimestamp() })
  }, [])

  const removeModel = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id))
  }, [])

  return { models, loading, addModel, removeModel }
}
