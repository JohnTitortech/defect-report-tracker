/**
 * CRUD hook for lots — stored as subcollection under each model.
 * Firestore path: models/{modelId}/lots/{lotId}
 * Each doc: { name: string, modelId: string, createdAt: Timestamp }
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useLots(modelId) {
  const [lots,    setLots]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!modelId) { setLots([]); setLoading(false); return }
    const q = query(
      collection(db, 'models', modelId, 'lots'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [modelId])

  const addLot = useCallback(async (name) => {
    if (!modelId || !name.trim()) return
    await addDoc(collection(db, 'models', modelId, 'lots'), {
      name: name.trim(),
      modelId,
      createdAt: serverTimestamp(),
    })
  }, [modelId])

  const removeLot = useCallback(async (lotId) => {
    if (!modelId) return
    await deleteDoc(doc(db, 'models', modelId, 'lots', lotId))
  }, [modelId])

  return { lots, loading, addLot, removeLot }
}

/**
 * Load all lots for a given model name (used in Dashboard filter & ReportModal).
 * Looks up the model by name first, then fetches its lots.
 */
import { getDocs, where } from 'firebase/firestore'

export function useLotsByModelName(modelName) {
  const [modelId, setModelId] = useState(null)
  const [lots,    setLots]    = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!modelName) { setModelId(null); setLots([]); return }
    setLoading(true)
    getDocs(collection(db, 'models')).then(snap => {
      const found = snap.docs.find(d => d.data().name === modelName)
      if (found) setModelId(found.id)
      else { setModelId(null); setLots([]); setLoading(false) }
    })
  }, [modelName])

  useEffect(() => {
    if (!modelId) return
    const q = query(
      collection(db, 'models', modelId, 'lots'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [modelId])

  return { lots, loading }
}
