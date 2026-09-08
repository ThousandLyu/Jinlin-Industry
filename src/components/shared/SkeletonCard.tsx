export interface SkeletonCardProps {
  lines?: number
  hasImage?: boolean
  className?: string
}

export default function SkeletonCard({ lines = 3, hasImage = false, className = '' }: SkeletonCardProps) {
  return (
    <div className={`content-card animate-pulse ${className}`}>
      {hasImage && <div className="h-40 bg-[#E8DCC8] rounded" />}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#E8DCC8] rounded w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 bg-[#E8DCC8] rounded" style={{ width: `${85 - i * 15}%` }} />
        ))}
      </div>
    </div>
  )
}
