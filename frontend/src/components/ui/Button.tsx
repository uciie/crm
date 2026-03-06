import { cn }                            from '@/lib/utils'
import { Loader2 }                        from 'lucide-react'
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?:     'xs' | 'sm' | 'md' | 'lg'
  loading?:  boolean
  icon?:     ReactNode
  iconRight?: ReactNode
}

const VARIANTS: Record<string, string> = {
  primary:
    'bg-blue-600 text-white border border-blue-600 hover:bg-blue-500 hover:border-blue-500 active:bg-blue-700',
  secondary:
    'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-100',
  danger:
    'bg-red-600 text-white border border-red-600 hover:bg-red-500 hover:border-red-500 active:bg-red-700',
  ghost:
    'bg-transparent text-slate-400 border border-transparent hover:bg-slate-900 hover:text-slate-200',
  outline:
    'bg-transparent text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-slate-100',
}

const SIZES: Record<string, string> = {
  xs: 'h-7  px-3   text-[10px] font-bold tracking-[0.14em] gap-1.5',
  sm: 'h-8  px-3.5 text-[11px] font-bold tracking-[0.12em] gap-2',
  md: 'h-9  px-4   text-xs     font-bold tracking-[0.12em] gap-2',
  lg: 'h-10 px-5   text-xs     font-bold tracking-[0.14em] gap-2.5',
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center uppercase transition-all duration-150',
        'rounded-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}