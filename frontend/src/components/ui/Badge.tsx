import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  label:      string
  variant?:   BadgeVariant
  color?:     string
  bg?:        string
  dot?:       boolean
  className?: string
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'border-slate-700 text-slate-400 bg-slate-800/40',
  success: 'border-emerald-800/60 text-emerald-400 bg-emerald-950/30',
  warning: 'border-amber-800/60 text-amber-400 bg-amber-950/30',
  danger:  'border-red-800/60 text-red-400 bg-red-950/30',
  info:    'border-blue-800/60 text-blue-400 bg-blue-950/30',
  neutral: 'border-slate-800 text-slate-500 bg-transparent',
}

const DOT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-400',
  info:    'bg-blue-400',
  neutral: 'bg-slate-600',
}

export function Badge({ label, variant = 'default', color, bg, dot = false, className }: BadgeProps) {
  if (color || bg) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase border',
          className
        )}
        style={{ color, background: bg, borderColor: color ? `${color}33` : undefined }}
      >
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: color }}
          />
        )}
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase border',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_STYLES[variant])} />}
      {label}
    </span>
  )
}