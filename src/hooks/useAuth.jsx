import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log('AUTH STATE:', u)

      setUser(u)
      setLoading(false)
    })

    return unsub
  }, [])

  const signIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      console.log('LOGIN SUCCESS:', result.user)
    } catch (err) {
      console.error('LOGIN ERROR:', err)
      throw err
    }
  }

  const logOut = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      console.error('LOGOUT ERROR:', err)
      throw err
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, logOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
