/**
 * CRUD hook for parts — stored as subcollection under each model.
 * Firestore path: models/{modelId}/parts/{partId}
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  getDocs, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useParts(modelId) {
  const [parts,   setParts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!modelId) { setParts([]); setLoading(false); return }
    const q = query(
      collection(db, 'models', modelId, 'parts'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setParts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [modelId])

  const addPart = useCallback(async (name) => {
    if (!modelId || !name.trim()) return
    await addDoc(collection(db, 'models', modelId, 'parts'), {
      name: name.trim(),
      modelId,
      createdAt: serverTimestamp(),
    })
  }, [modelId])

  const removePart = useCallback(async (partId) => {
    if (!modelId) return
    await deleteDoc(doc(db, 'models', modelId, 'parts', partId))
  }, [modelId])

  return { parts, loading, addPart, removePart }
}

export function usePartsByModelName(modelName) {
  const [modelId, setModelId] = useState(null)
  const [parts,   setParts]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!modelName) { setModelId(null); setParts([]); return }
    setLoading(true)
    getDocs(collection(db, 'models')).then(snap => {
      const found = snap.docs.find(d => d.data().name === modelName)
      if (found) setModelId(found.id)
      else { setModelId(null); setParts([]); setLoading(false) }
    })
  }, [modelName])

  useEffect(() => {
    if (!modelId) return
    const q = query(
      collection(db, 'models', modelId, 'parts'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setParts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [modelId])

  return { parts, loading }
}
