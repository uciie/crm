import { cn } from '@/lib/utils'

interface BadgeProps {
  label:     string
  color?:    string
  bg?:       string
  className?: string
}

export function Badge({ label, color, bg, className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}