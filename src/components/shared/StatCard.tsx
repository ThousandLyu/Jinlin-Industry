export interface StatCardProps {
  label: string
  value: number | string
  trend?: { value: number; isUp: boolean }
  icon?: React.ReactNode
  className?: string
}

export default function StatCard({ label, value, trend, icon, className = '' }: StatCardProps) {
  return (
    <div className={`admin-panel px-5 py-4 flex items-center gap-4 ${className}`}>
      {icon && <div className="text-2xl text-[#C49A2B] shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs text-[#7C6A5A] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#4A3728]">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.isUp ? 'text-green-600' : 'text-red-500'}`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}%
          </p>
        )}
      </div>
    </div>
  )
}
