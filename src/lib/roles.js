import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function getUserRole(email) {
  const snap = await getDoc(
    doc(db, 'USER_ROLES', email)
  )

  if (!snap.exists()) {
    return null
  }

  return snap.data().role
}
