import { cn } from '@/lib/cn'

export default function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('filter-bar', className)}>
      {children}
    </div>
  )
}
