import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

interface FieldRowProps {
  children: React.ReactNode
  className?: string
}

export function FieldRow({ children, className }: FieldRowProps) {
  return (
    <div className={cn('flex gap-4 flex-wrap', className)}>
      {children}
    </div>
  )
}

// Convenience select with default styling
export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('field-input', className)}
      {...props}
    />
  )
}

// Convenience text input
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('field-input', className)}
      {...props}
    />
  )
}
