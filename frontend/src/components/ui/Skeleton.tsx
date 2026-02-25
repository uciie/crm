// ============================================================
// components/ui/Skeleton.tsx
// Composants de chargement squelette
// ============================================================

import { cn } from '@/lib/utils'

// ── Base ──────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-800/70 rounded-sm',
        className
      )}
      aria-hidden="true"
    />
  )
}

// ── Ligne de tableau ──────────────────────────────────────────

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-800/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton
            className={cn(
              'h-3.5',
              i === 0 ? 'w-40' : i === cols - 1 ? 'w-16' : 'w-24'
            )}
          />
          {i === 0 && <Skeleton className="h-2.5 w-24 mt-1.5" />}
        </td>
      ))}
    </tr>
  )
}

// ── Tableau complet ───────────────────────────────────────────

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  )
}

// ── Carte de contact ──────────────────────────────────────────

export function ContactCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-40" />
      <Skeleton className="h-2.5 w-28" />
    </div>
  )
}

// ── Cartes mobiles ────────────────────────────────────────────

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ContactCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ── Vue détail ────────────────────────────────────────────────

export function DetailSkeleton() {
  return (
    <div className="flex gap-6 p-6 h-full">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 space-y-4">
        <div className="bg-slate-900 border border-slate-800 p-5 text-center space-y-3">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-4 w-36 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
          <Skeleton className="h-5 w-20 mx-auto rounded-full" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Skeleton className="w-4 h-4 shrink-0" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 space-y-4">
        <div className="bg-slate-900 border border-slate-800">
          <div className="flex border-b border-slate-800 px-5 py-3 gap-6">
            {[80, 60, 70].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w === 80 ? '20' : w === 60 ? '16' : '18'}`} />
            ))}
          </div>
          <div className="p-5 space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 space-y-3">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  )
}