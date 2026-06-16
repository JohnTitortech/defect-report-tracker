import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-steel-900 dark:text-steel-100">{title}</h3>
              <p className="text-sm text-steel-500 dark:text-steel-400 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="btn-ghost">Cancel</button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
