import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn }                              from '@/lib/utils'
import { StatCardSkeleton }               from '@/components/ui/Skeleton'

interface StatsCardProps {
  label:       string
  value:       string | number
  sub?:        string
  // trendValue remplace la string statique : pourcentage numérique issu de calculateTrend()
  // null = pas de données sur la période précédente (aucun indicateur affiché)
  trendValue?: number | null
  icon?:       React.ElementType
  color?:      string
  trend?:      'up' | 'down' | 'flat'
  loading?:    boolean
}

export function StatsCard({
  label,
  value,
  sub,
  trendValue,
  icon: Icon,
  color = '#3b82f6',
  trend,
  loading = false,
}: StatsCardProps) {
  if (loading) return <StatCardSkeleton />

  // Dérive automatiquement la direction de tendance depuis trendValue
  // si trend n'est pas fourni explicitement
  const resolvedTrend: 'up' | 'down' | 'flat' | undefined =
    trend ??
    (trendValue === null || trendValue === undefined
      ? undefined
      : trendValue > 0
      ? 'up'
      : trendValue < 0
      ? 'down'
      : 'flat')

  const TrendIcon =
    resolvedTrend === 'up'   ? TrendingUp   :
    resolvedTrend === 'down' ? TrendingDown :
    resolvedTrend === 'flat' ? Minus        :
    null

  const trendColor =
    resolvedTrend === 'up'   ? 'text-emerald-400' :
    resolvedTrend === 'down' ? 'text-red-400'     :
    'text-slate-600'

  // Construit le label de sous-titre :
  // priorité à trendValue (dynamique), sinon sub (statique)
  const subLabel: string | undefined =
    trendValue !== null && trendValue !== undefined
      ? (() => {
          const sign = trendValue > 0 ? '+' : ''
          return `${sign}${trendValue}% vs période préc.`
        })()
      : sub

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 group hover:border-slate-700 transition-colors duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-slate-600 mb-2">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-100 tabular-nums leading-none">
            {value}
          </p>
          {subLabel && (
            <div className="flex items-center gap-1.5 mt-2">
              {TrendIcon && (
                <TrendIcon className={cn('w-3 h-3 shrink-0', trendColor)} />
              )}
              <p className={cn('text-[11px]', TrendIcon ? trendColor : 'text-slate-600')}>
                {subLabel}
              </p>
            </div>
          )}
        </div>

        {Icon && (
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0 border border-slate-800 group-hover:border-slate-700 transition-colors"
            style={{ color }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Accent line */}
      <div
        className="h-px mt-4 opacity-20"
        style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
      />
    </div>
  )
}