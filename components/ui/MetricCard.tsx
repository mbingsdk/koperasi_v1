import { cn } from '@/lib/cn'

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  negative?: boolean
}

export default function MetricCard({ label, value, hint, negative }: MetricCardProps) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className={cn('metric-value', negative && 'text-margin')}>{value}</p>
      {hint && <p className="metric-hint">{hint}</p>}
    </div>
  )
}
