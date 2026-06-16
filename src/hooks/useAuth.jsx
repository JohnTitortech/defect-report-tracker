import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRedirectResult(auth)
      .then(result => {
        console.log("REDIRECT RESULT:", result)
        console.log("CURRENT USER:", auth.currentUser)
      })
      .catch(err => {
        console.error("REDIRECT ERROR:", err)
      })
  
    const unsub = onAuthStateChanged(auth, u => {
      console.log("AUTH STATE:", u)
  
      setUser(u)
      setLoading(false)
    })
  
    return unsub
  }, [])

  // Redirects browser to Google login page — avoids popup COOP issue
  const signIn = () => signInWithRedirect(auth, googleProvider)
  const logOut = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
