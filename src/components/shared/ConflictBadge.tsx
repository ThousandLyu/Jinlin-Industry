export interface ConflictBadgeProps {
  severity: 'high' | 'medium' | 'low'
  count?: number
  className?: string
}

const severityConfig = {
  high: { bg: 'bg-red-100', text: 'text-red-700', label: '高冲突', pulse: true },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待判断', pulse: false },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: '无冲突', pulse: false },
}

export default function ConflictBadge({ severity, count, className = '' }: ConflictBadgeProps) {
  const cfg = severityConfig[severity]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.pulse ? 'animate-glowPulse' : ''} ${className}`}>
      {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {cfg.label}
      {count !== undefined && <span className="ml-0.5 opacity-70">({count})</span>}
    </span>
  )
}
