import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn }   = useAuth()
  const [busy, setBusy] = useState(false)

  const handleSignIn = async () => {
    setBusy(true)
    try {
      await signIn()
    } catch (err) {
      toast.error('Sign-in failed. Please try again.')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, #fff 40px, #fff 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #fff 40px, #fff 41px)'
      }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo block */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-lg shadow-accent/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Defect Report Tracker</h1>
          <p className="text-steel-400 text-sm mt-1">Industrial Quality Control Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-steel-900 border border-steel-700 rounded-2xl p-6 shadow-2xl">
          <p className="text-steel-300 text-sm text-center mb-6">
            Sign in with your Google account to access reports.
          </p>

          <button
            onClick={handleSignIn}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-steel-100
                       text-steel-900 font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {!busy ? (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            ) : (
              <span className="animate-pulse">Signing in…</span>
            )}
          </button>

          <div className="mt-5 flex items-start gap-2 text-xs text-steel-500 border-t border-steel-800 pt-4">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-hazard-yellow" />
            <p>Access restricted to authorized personnel only. Activity may be monitored.</p>
          </div>
        </div>

        <p className="text-center text-steel-600 text-xs mt-6">
          © {new Date().getFullYear()} Defect Report Tracker
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
