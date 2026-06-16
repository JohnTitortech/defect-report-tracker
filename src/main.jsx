import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import './index.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/defect-report-tracker">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm font-medium',
          style: { borderRadius: '10px', background: '#1C1C1E', color: '#fff' },
          success: { iconTheme: { primary: '#1C6EF2', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
