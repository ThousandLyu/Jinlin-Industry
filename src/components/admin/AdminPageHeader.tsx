interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export default function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-header">
      <div>
        <p className="admin-page-kicker">运营工作台</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  )
}
