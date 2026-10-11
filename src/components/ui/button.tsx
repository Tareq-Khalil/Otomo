import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const button = cva(
  'inline-flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest transition-transform active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        solid: 'bg-ink text-bg rounded-md',
        accent: 'bg-accent text-white rounded-md',
        line: 'border border-line rounded-md hover:border-ink',
        ghost: 'text-mute hover:text-ink'
      },
      size: { md: 'h-11 px-5', sm: 'h-8 px-3', icon: 'h-10 w-10' }
    },
    defaultVariants: { variant: 'solid', size: 'md' }
  }
)
export function Button({ className, variant, size, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...p} />
}
