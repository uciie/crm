'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { ToastMessage } from '@/types'

let toastListeners: ((toast: ToastMessage) => void)[] = []

export function emitToast(toast: Omit<ToastMessage, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toastListeners.forEach(fn => fn({ ...toast, id }))
}

export function useToastEmitter() {
  return {
    success: (title: string, message?: string) =>
      emitToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      emitToast({ type: 'error', title, message }),
    info: (title: string, message?: string) =>
      emitToast({ type: 'info', title, message }),
    warning: (title: string, message?: string) =>
      emitToast({ type: 'warning', title, message }),
  }
}

export function useToastStore() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handler = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4000)
    }
    toastListeners.push(handler)
    return () => { toastListeners = toastListeners.filter(fn => fn !== handler) }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, dismiss }
}