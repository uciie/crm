'use client'

import { useEffect }                          from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast }                           from '@/hooks/useToast'
import type { Toast, ToastType }             from '@/types/crm.types'
import { cn }                                from '@/lib/utils'

// ── Config ─────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, {
  icon:      React.ElementType
  accent:    string
  iconColor: string
}> = {
  success: { icon: CheckCircle2,  accent: 'border-l-emerald-500', iconColor: 'text-emerald-400' },
  error:   { icon: XCircle,       accent: 'border-l-red-500',     iconColor: 'text-red-400'     },
  warning: { icon: AlertTriangle, accent: 'border-l-amber-500',   iconColor: 'text-amber-400'   },
  info:    { icon: Info,          accent: 'border-l-blue-500',    iconColor: 'text-blue-400'    },
}

// ── Single toast item ───────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast()
  const cfg  = TOAST_CONFIG[toast.type]
  const Icon = cfg.icon

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-80 px-4 py-3.5',
        'bg-slate-900 border border-slate-800/80 border-l-2',
        'shadow-2xl shadow-black/50',
        cfg.accent
      )}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.iconColor)} />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-200 tracking-wide leading-none">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => dismiss(toast.id)}
        className="text-slate-700 hover:text-slate-400 transition-colors shrink-0 mt-0.5"
        aria-label="Fermer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Container ───────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToast()
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}