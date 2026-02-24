'use client'

import { forwardRef, useState, type InputHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ============================================================
// INPUT
// ============================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label:   string
  error?:  string
  hint?:   string
}

export const AuthInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500"
        >
          {label}
        </label>

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 text-sm text-slate-100 bg-slate-900 border',
            'placeholder:text-slate-700 outline-none transition-all duration-150',
            'rounded-none', // strict geometric identity
            error
              ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-500/20'
              : 'border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20',
            className
          )}
          {...props}
        />

        {error && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-400">
            <span className="w-1 h-1 rounded-full bg-red-400 shrink-0 inline-block" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-slate-600">{hint}</p>
        )}
      </div>
    )
  }
)
AuthInput.displayName = 'AuthInput'

// ============================================================
// PASSWORD INPUT
// ============================================================

interface PasswordInputProps extends Omit<InputProps, 'type'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <AuthInput ref={ref} type={visible ? 'text' : 'password'} {...props} />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          className={cn(
            'absolute right-3 text-[10px] font-mono font-bold tracking-[0.12em] uppercase',
            'text-slate-600 hover:text-blue-400 transition-colors select-none',
            props.error ? 'top-[2rem]' : 'top-[2.1rem]'
          )}
        >
          {visible ? 'CACHER' : 'VOIR'}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'

// ============================================================
// BUTTON
// ============================================================

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?:  boolean
  variant?:  'primary' | 'ghost'
  children:  ReactNode
}

export function AuthButton({
  loading,
  variant = 'primary',
  children,
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'relative w-full py-3.5 px-6 text-[11px] font-bold tracking-[0.18em] uppercase',
        'transition-all duration-150 outline-none rounded-none',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && [
          'bg-blue-600 text-white',
          'hover:bg-blue-500 active:bg-blue-700',
          'focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        ],
        variant === 'ghost' && [
          'bg-transparent text-slate-500 border border-slate-700',
          'hover:border-slate-500 hover:text-slate-300',
        ],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2.5">
          <span className="w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin inline-block" />
          <span>Chargement...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}

// ============================================================
// ALERT
// ============================================================

interface AuthAlertProps {
  type:    'error' | 'success' | 'info'
  message: string
}

const ALERT_STYLES = {
  error:   { wrap: 'bg-red-950/40 border-red-800/50 text-red-300',     dot: 'bg-red-400' },
  success: { wrap: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300', dot: 'bg-emerald-400' },
  info:    { wrap: 'bg-blue-950/40 border-blue-800/50 text-blue-300',   dot: 'bg-blue-400' },
}

export function AuthAlert({ type, message }: AuthAlertProps) {
  const s = ALERT_STYLES[type]
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 border text-sm leading-relaxed', s.wrap)}>
      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', s.dot)} />
      <span>{message}</span>
    </div>
  )
}

// ============================================================
// DIVIDER
// ============================================================

export function AuthDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-800" />
      {label && (
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  )
}

// ============================================================
// PASSWORD STRENGTH
// ============================================================

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { ok: password.length >= 8,  label: '8 car.' },
    { ok: /[A-Z]/.test(password), label: 'Maj.'  },
    { ok: /[0-9]/.test(password), label: 'Chiffre' },
  ]

  const passed = checks.filter(c => c.ok).length
  const barColors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500']
  const labels    = ['Faible', 'Moyen', 'Fort']

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={cn(
              'h-0.5 flex-1 transition-all duration-300',
              i < passed ? barColors[passed - 1] : 'bg-slate-800'
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span
              key={c.label}
              className={cn(
                'text-[10px] font-mono transition-colors',
                c.ok ? 'text-emerald-400' : 'text-slate-700'
              )}
            >
              {c.ok ? '+' : '-'} {c.label}
            </span>
          ))}
        </div>
        {passed > 0 && (
          <span className={cn(
            'text-[10px] font-bold tracking-widest uppercase',
            passed === 1 ? 'text-red-400' : passed === 2 ? 'text-amber-400' : 'text-emerald-400'
          )}>
            {labels[passed - 1]}
          </span>
        )}
      </div>
    </div>
  )
}