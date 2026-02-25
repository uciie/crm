import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?:    'sm' | 'md' | 'lg'
}

const variants = {
  primary:   'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
  ghost:     'hover:bg-gray-100 text-gray-600',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {children}
    </button>
  )
}