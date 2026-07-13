import { cn } from '@/lib/cn'

type StampVariant = 'active' | 'paid' | 'danger' | 'warn' | 'muted'

interface StampProps {
  children: React.ReactNode
  variant?: StampVariant
  className?: string
}

const variants: Record<StampVariant, string> = {
  active: 'stamp-active',
  paid:   'stamp-paid',
  danger: 'stamp-danger',
  warn:   'stamp-warn',
  muted:  'stamp-paid',
}

export default function Stamp({ children, variant = 'active', className }: StampProps) {
  return (
    <span className={cn('stamp', variants[variant], className)}>
      {children}
    </span>
  )
}
