'use client'
// ============================================================
// hooks/useToast.tsx
// Système de notifications Toast global via Context
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Toast, ToastType } from '@/types/crm.types'

interface ToastContextValue {
  toasts:  Toast[]
  toast:   (type: ToastType, title: string, message?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const newToast: Toast = { id, type, title, message }

      setToasts(prev => [...prev, newToast])

      // Auto-dismiss après 4 secondes
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast doit être utilisé dans un ToastProvider')
  }
  return ctx
}