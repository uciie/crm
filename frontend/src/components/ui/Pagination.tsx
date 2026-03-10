'use client'
// ============================================================
// components/ui/Pagination.tsx
// Composant de pagination réutilisable — design dark slate
// ============================================================

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page:        number
  totalPages:  number
  total:       number
  limit:       number
  onPrev:      () => void
  onNext:      () => void
  onPage?:     (p: number) => void
  /** Texte du compteur (ex: "contacts", "entreprises") */
  entityLabel?: string
  className?:  string
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPrev,
  onNext,
  onPage,
  entityLabel = 'éléments',
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (page - 1) * limit + 1
  const end   = Math.min(page * limit, total)

  // Pages à afficher (fenêtre glissante de 5)
  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <nav
      className={cn('flex items-center justify-between gap-4 pt-3', className)}
      aria-label="Pagination"
    >
      {/* Compteur */}
      <p className="text-xs text-slate-600 tabular-nums hidden sm:block">
        <span className="font-bold text-slate-400">{start}–{end}</span>
        {' '}sur{' '}
        <span className="font-bold text-slate-400">{total}</span>
        {' '}{entityLabel}
      </p>

      {/* Contrôles */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Précédent */}
        <button
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Page précédente"
          className={cn(
            'flex items-center gap-1 h-7 px-2.5 border text-[10px] font-bold tracking-wider uppercase transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            page <= 1
              ? 'border-slate-800 text-slate-700 cursor-not-allowed opacity-40'
              : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
          )}
        >
          <ChevronLeft className="w-3 h-3" />
          <span className="hidden sm:inline">Préc.</span>
        </button>

        {/* Numéros de pages */}
        {onPage && pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-700">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'h-7 w-7 flex items-center justify-center border text-[11px] font-bold transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                p === page
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300',
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Suivant */}
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Page suivante"
          className={cn(
            'flex items-center gap-1 h-7 px-2.5 border text-[10px] font-bold tracking-wider uppercase transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            page >= totalPages
              ? 'border-slate-800 text-slate-700 cursor-not-allowed opacity-40'
              : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
          )}
        >
          <span className="hidden sm:inline">Suiv.</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </nav>
  )
}