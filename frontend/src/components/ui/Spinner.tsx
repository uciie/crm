import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?:      'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-slate-700 border-t-slate-400 animate-spin',
        SIZES[size],
        className
      )}
      role="status"
      aria-label="Chargement"
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-48">
      <div className="relative">
        <div className="w-8 h-8 border border-slate-800 rounded-full" />
        <div className="absolute inset-0 w-8 h-8 border-t border-blue-500 rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-700">
        Chargement
      </p>
    </div>
  )
}