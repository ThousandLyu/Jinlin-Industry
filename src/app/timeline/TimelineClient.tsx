'use client'

import { useMemo, useState } from 'react'

export default function TimelineClient({ events, sources }: { events: any[]; sources: any[] }) {
  const [filter, setFilter] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  const categories = useMemo(() => Array.from(new Set(events.map(event => event.category).filter(Boolean))), [events])
  const filtered = filter ? events.filter(event => event.category === filter) : events

  const getEventSources = (event: any) => {
    if (!event.sourceIds || event.sourceIds.length === 0) return []
    return sources.filter((source: any) => event.sourceIds.includes(source.id))
  }

  return (
    <div className="content-page-narrow">
      <div className="mb-8 text-center">
        <p className="section-eyebrow">工业纪年</p>
        <h1 className="content-title mt-2 text-3xl">工业时间轴</h1>
        <p className="content-copy mt-2">南京民族工业发展历程</p>
      </div>

      <div className="mb-12 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setFilter('')}
            className={`content-button min-h-9 rounded-full px-4 ${!filter ? 'content-button-primary' : 'content-button-outline'}`}
        >全部</button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setFilter(category === filter ? '' : category)}
            className={`content-button min-h-9 rounded-full px-4 ${filter === category ? 'content-button-primary' : 'content-button-outline'}`}
          >{category}</button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-[#C49A2B]/30 md:left-1/2 md:-translate-x-0.5" />
        {filtered.length === 0 && (
          <p className="py-12 text-center text-gray-400">该类别暂无事件</p>
        )}
        {filtered.map((event: any, index: number) => {
          const eventSources = getEventSources(event)
          return (
            <div
              key={event.id}
              className={`timeline-motion relative mb-8 flex items-start ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
            >
              <div className="hidden md:flex md:w-1/2" />
              <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white md:absolute md:left-1/2 md:-translate-x-1/2 ${markerColor(event.category)}`} style={{ boxShadow: '0 0 0 4px rgba(196,154,43,0.15)' }}>
                {index + 1}
              </div>
              <div
                className={`group ml-4 cursor-pointer md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="content-card p-5">
                  <div className={`mb-2 flex flex-wrap items-center gap-2 ${index % 2 === 0 ? 'md:justify-end' : ''}`}>
                    {event.category && (
                      <span className="inline-block rounded bg-[#8B1A2B]/10 px-2 py-0.5 text-xs text-[#8B1A2B]">
                        {event.category}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#C49A2B]">{event.year}</span>
                  <h3 className="content-title mt-1 text-lg">{event.title}</h3>
                  <p className="content-copy mt-2">{event.description}</p>
                  {eventSources.length > 0 && (
                    <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
                      <span className="text-xs text-[#8B6A1B]">
                        {eventSources.length} 份参考史料，点击查看详情
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="content-panel max-h-[80vh] w-full max-w-2xl overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-[#E8DCC8] bg-[#FDFBF7] px-6 py-4">
              <div>
                <span className="text-lg font-bold text-[#C49A2B]">{selectedEvent.year}</span>
                <h2 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>{selectedEvent.title}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-2xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4">
              <p className="content-copy">{selectedEvent.description}</p>
              <SourceList sources={getEventSources(selectedEvent)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceList({ sources }: { sources: any[] }) {
  if (sources.length === 0) {
    return <p className="mt-6 text-sm italic text-gray-400">暂无关联史料</p>
  }

  return (
    <div className="mt-6">
      <h3 className="mb-3 font-bold text-[#4A3728]">参考史料（共 {sources.length} 份）</h3>
      <div className="space-y-3">
        {sources.map((source: any) => (
          <div key={source.id} className="rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[#4A3728]">{source.title}</h4>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                  {source.author && <span>作者：{source.author}</span>}
                  {source.publisher && <span>出版：{source.publisher}</span>}
                  {source.publishDate && <span>日期：{source.publishDate}</span>}
                </div>
                {source.description && <p className="content-copy mt-2 line-clamp-3">{source.description}</p>}
              </div>
              <span className={`shrink-0 ${source.credibilityLevel === 'A' ? 'content-tag-accent' : source.credibilityLevel === 'B' ? 'content-tag-muted' : 'content-tag'}`}>
                {source.credibilityLevel}级
              </span>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="rounded bg-white px-2 py-0.5 text-gray-500">{source.type}</span>
              {source.fileUrl && (
                <a href={source.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#C49A2B] underline hover:text-[#8B1A2B]">
                  查看原文件
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function markerColor(category?: string) {
  const map: Record<string, string> = {
    '军事工业': 'bg-[#8B1A2B]',
    '化工工业': 'bg-[#C49A2B]',
    '钢铁建材': 'bg-[#A67C52]',
    '交通基建': 'bg-[#4A3728]',
    '电子工业': 'bg-[#2D5F7C]',
    '政策影响': 'bg-[#5B8C5A]',
    '文化遗产': 'bg-[#7C6A5A]',
  }
  return map[category || ''] || 'bg-[#4A3728]'
}
