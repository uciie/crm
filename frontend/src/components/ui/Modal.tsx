'use client'

import { useEffect, type ReactNode }  from 'react'
import { X }                          from 'lucide-react'
import { cn }                         from '@/lib/utils'

interface ModalProps {
  title:     string
  subtitle?: string
  onClose:   () => void
  children:  ReactNode
  size?:     'sm' | 'md' | 'lg' | 'xl'
  footer?:   ReactNode
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ title, subtitle, onClose, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.80)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn(
          'bg-slate-950 border border-slate-800 w-full max-h-[90vh] flex flex-col',
          'shadow-2xl shadow-black/60',
          SIZE_CLASSES[size]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800 shrink-0">
          <div>
            <div className="h-px w-8 bg-blue-500 mb-3" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wide leading-none">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className={cn(
              'w-7 h-7 flex items-center justify-center shrink-0 ml-4 mt-0.5',
              'text-slate-600 hover:text-slate-300 hover:bg-slate-900',
              'border border-transparent hover:border-slate-800',
              'transition-all duration-150'
            )}
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>

        {/* Optional footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-800 shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}