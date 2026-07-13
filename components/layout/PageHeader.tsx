import { cn } from '@/lib/cn'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({ eyebrow, title, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('page-header', className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>
      )}
    </div>
  )
}
