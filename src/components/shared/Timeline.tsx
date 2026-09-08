export interface TimelineEvent {
  year: number
  title: string
  description?: string
  sourceRef?: string
}

export interface TimelineProps {
  events: TimelineEvent[]
  className?: string
}

export default function Timeline({ events, className = '' }: TimelineProps) {
  const sorted = [...events].sort((a, b) => a.year - b.year)
  return (
    <div className={`relative pl-6 ${className}`}>
      <div className="absolute left-2 top-0 bottom-0 w-px bg-[#E8DCC8]" />
      {sorted.map((evt, i) => (
        <div key={i} className="relative pb-5 last:pb-0 animate-timelineRise" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="absolute left-[-1.15rem] top-1 w-3 h-3 rounded-full bg-[#C49A2B] border-2 border-[#F5F0E8]" />
          <span className="text-xs font-bold text-[#C49A2B]">{evt.year}</span>
          <h4 className="text-sm font-medium text-[#4A3728] mt-0.5">{evt.title}</h4>
          {evt.description && <p className="text-xs text-[#7C6A5A] mt-1">{evt.description}</p>}
          {evt.sourceRef && <p className="text-xs text-[#C49A2B] mt-0.5">📄 {evt.sourceRef}</p>}
        </div>
      ))}
    </div>
  )
}
