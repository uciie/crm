'use client'
// ============================================================
// components/ui/Toast.tsx
// Composant d'affichage des notifications — Lucide icons
// ============================================================

import { useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import type { Toast, ToastType } from '@/types/crm.types'
import { cn } from '@/lib/utils'

// ── Configuration par type ────────────────────────────────────

const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ElementType; border: string; iconColor: string; bg: string }
> = {
  success: {
    icon:      CheckCircle2,
    border:    'border-l-emerald-500',
    iconColor: 'text-emerald-400',
    bg:        'bg-slate-900',
  },
  error: {
    icon:      XCircle,
    border:    'border-l-red-500',
    iconColor: 'text-red-400',
    bg:        'bg-slate-900',
  },
  warning: {
    icon:      AlertTriangle,
    border:    'border-l-amber-500',
    iconColor: 'text-amber-400',
    bg:        'bg-slate-900',
  },
  info: {
    icon:      Info,
    border:    'border-l-blue-500',
    iconColor: 'text-blue-400',
    bg:        'bg-slate-900',
  },
}

// ── Item individuel ───────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast()
  const cfg = TOAST_CONFIG[toast.type]
  const Icon = cfg.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-80 px-4 py-3.5',
        'border border-slate-700/60 border-l-2 shadow-2xl shadow-black/40',
        'animate-in slide-in-from-right-5 duration-300',
        cfg.bg,
        cfg.border
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-200 tracking-wide">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 mt-0.5"
        aria-label="Fermer la notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Conteneur Toast ───────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}