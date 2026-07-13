interface EmptyStateProps {
  title: string
  message?: string
  action?: React.ReactNode
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="stamp-mark mx-auto mb-4">KL</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
