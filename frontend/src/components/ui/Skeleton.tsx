import { cn } from '@/lib/utils'

// ── Base ────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse bg-slate-800/60 rounded-none', className)}
      aria-hidden="true"
    />
  )
}

// ── Table rows ──────────────────────────────────────────────────

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-800/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          {i === 0 ? (
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ) : (
            <Skeleton className={cn('h-3', i === cols - 1 ? 'w-12' : 'w-24')} />
          )}
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  )
}

// ── Stat card ───────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-2 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <Skeleton className="w-9 h-9" />
      </div>
    </div>
  )
}

// ── Detail page ─────────────────────────────────────────────────

export function DetailSkeleton() {
  return (
    <div className="flex gap-0 h-full">
      <aside className="w-72 shrink-0 border-r border-slate-800 p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-3 pt-4 border-t border-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2.5 items-center">
              <Skeleton className="w-4 h-4 shrink-0" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </aside>
      <div className="flex-1 p-6 space-y-4">
        <div className="border border-slate-800">
          <div className="flex border-b border-slate-800 px-5 py-3 gap-6">
            {[20, 16, 18].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w}`} />
            ))}
          </div>
          <div className="p-5 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}