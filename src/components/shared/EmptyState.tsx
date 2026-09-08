interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-mark" aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
