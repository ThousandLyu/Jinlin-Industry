export interface ProgressBarProps {
  value: number
  label?: string
  showPercent?: boolean
  variant?: 'gold' | 'brown' | 'red'
  className?: string
}

const variantColors = {
  gold: 'bg-[#C49A2B]',
  brown: 'bg-[#4A3728]',
  red: 'bg-[#8B1A2B]',
}

export default function ProgressBar({ value, label, showPercent = true, variant = 'gold', className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-[#7C6A5A] mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-2 bg-[#E8DCC8] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${variantColors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
