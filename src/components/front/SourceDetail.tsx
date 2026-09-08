'use client'

import { useState } from 'react'
import type { Source, Person, HeritageSite, SourceLink } from '@/types'
import GraphView from '@/components/shared/GraphView'
import Badge from '@/components/shared/Badge'
import SmartImage from '@/components/shared/SmartImage'

interface SourceDetailProps {
  sourceId: string
  source: Source
  relatedPeople: Person[]
  relatedSites: HeritageSite[]
  relatedSources: Source[]
  links: SourceLink[]
  hasText: boolean
}

export default function SourceDetail({ sourceId, source, relatedPeople, relatedSites, relatedSources, links, hasText }: SourceDetailProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [rawText, setRawText] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadText = async () => {
    if (rawText) return
    setLoadingText(true)
    try {
      const res = await fetch(`/api/import/sources/file?sourceId=${sourceId}`)
      const data = await res.json()
      if (data.text) setRawText(data.text.slice(0, 5000))
      else setRawText('(无法提取文本内容)')
    } catch {
      setRawText('(文本加载失败)')
    }
    setLoadingText(false)
  }

  const citation = `${source.author ? source.author + '. ' : ''}${source.title}[${source.type || 'Z'}]. ${source.publisher ? source.publisher + ', ' : ''}${source.publishDate || ''}.`

  const copyCitation = async () => {
    await navigator.clipboard.writeText(citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Mini graph data
  const graphNodes = [
    { id: sourceId, label: source.title.slice(0, 12), type: 'source' as const },
    ...links.filter(l => l.isApproved).flatMap(l => ([
      { id: l.sourceId, label: l.sourceId.slice(0, 12), type: 'source' as const },
      { id: l.targetId, label: l.targetId.slice(0, 12), type: 'source' as const },
    ])),
    ...relatedPeople.slice(0, 5).map(p => ({ id: p.id, label: p.name, type: 'person' as const })),
    ...relatedSites.slice(0, 5).map(s => ({ id: s.id, label: s.name, type: 'site' as const })),
  ].filter((n, i, arr) => {
    const seen = new Set<string>()
    return arr.slice(0, i).every(x => x.id !== n.id)
  }).slice(0, 15)

  const graphEdges = [
    ...links.filter(l => l.isApproved).map(l => ({ source: l.sourceId, target: l.targetId, label: l.relationType, confidence: l.confidence })),
    ...relatedPeople.map(p => ({ source: sourceId, target: p.id, label: 'related', confidence: 1 })),
    ...relatedSites.map(s => ({ source: sourceId, target: s.id, label: 'related', confidence: 1 })),
  ]

  return (
    <div className="mt-6 space-y-6">
      {/* AI Summary */}
      {source.aiSummary && (
        <div className="content-panel p-5">
          <h3 className="text-sm font-bold text-[#4A3728] mb-2">AI 摘要</h3>
          <p className="text-sm leading-7 text-[#7C6A5A]">{source.aiSummary}</p>
        </div>
      )}

      {/* Description / Historical Value */}
      {source.description && (
        <div className="content-panel p-5">
          <h3 className="text-sm font-bold text-[#4A3728] mb-2">内容描述</h3>
          <p className="text-sm leading-7 text-[#7C6A5A] whitespace-pre-wrap">{source.description}</p>
        </div>
      )}

      {/* Original Text + Mini Graph */}
      <div className="grid gap-4 lg:grid-cols-5">
        {hasText && (
          <div className="lg:col-span-3">
            <div className="content-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#4A3728]">原文</h3>
                <button
                  onClick={() => { setShowRaw(!showRaw); if (!showRaw) loadText() }}
                  className="text-xs text-[#C49A2B] hover:underline"
                >
                  {showRaw ? '收起原文' : loadingText ? '加载中…' : '查看原文'}
                </button>
              </div>
              {showRaw && (
                <div className="bg-white border border-[#E8DCC8] rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm leading-6 text-[#4A3728] whitespace-pre-wrap font-mono">{rawText || '(无内容)'}</pre>
                </div>
              )}
            </div>
          </div>
        )}
        <div className={hasText ? 'lg:col-span-2' : 'lg:col-span-5'}>
          {graphNodes.length > 1 && (
            <div className="content-panel p-5">
              <h3 className="text-sm font-bold text-[#4A3728] mb-2">关联图谱</h3>
              <GraphView nodes={graphNodes} edges={graphEdges} width={400} height={280} />
            </div>
          )}
        </div>
      </div>

      {/* Related People */}
      {relatedPeople.length > 0 && (
        <div className="content-panel p-5">
          <h3 className="text-sm font-bold text-[#4A3728] mb-3">相关人物</h3>
          <div className="flex flex-wrap gap-2">
            {relatedPeople.map(p => (
              <a key={p.id} href={`/people/${p.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E8DCC8] bg-white px-3 py-1.5 text-sm hover:shadow-archive transition-shadow">
                {p.portrait && <SmartImage src={p.portrait} alt={p.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />}
                <span className="text-[#4A3728]">{p.name}</span>
                {p.title && <span className="text-xs text-[#7C6A5A]">{p.title}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Sites */}
      {relatedSites.length > 0 && (
        <div className="content-panel p-5">
          <h3 className="text-sm font-bold text-[#4A3728] mb-3">相关遗址</h3>
          <div className="space-y-2">
            {relatedSites.map(s => (
              <a key={s.id} href={`/sites/${s.slug}`} className="block content-card p-3 hover:shadow-archive transition-shadow">
                <span className="font-medium text-[#4A3728]">{s.name}</span>
                {s.location && <span className="text-xs text-[#7C6A5A] ml-2">{s.location}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Recommendations */}
      {relatedSources.length > 0 && (
        <div className="content-panel p-5">
          <h3 className="text-sm font-bold text-[#4A3728] mb-3">相关史料推荐</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedSources.map(s => (
              <a key={s.id} href={`/sources/${s.id}`} className="content-card p-3 block hover:shadow-archive transition-shadow">
                <p className="text-sm font-medium text-[#4A3728] line-clamp-2">{s.title}</p>
                {s.credibilityLevel && (
                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded ${s.credibilityLevel === 'A' ? 'bg-red-100 text-red-700' : s.credibilityLevel === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.credibilityLevel}级
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Citation */}
      <div className="content-panel p-5">
        <h3 className="text-sm font-bold text-[#4A3728] mb-2">引用格式 (GB/T 7714)</h3>
        <p className="text-xs text-[#7C6A5A] font-mono bg-white border border-[#E8DCC8] rounded p-3 mb-2">{citation}</p>
        <button onClick={copyCitation} className="content-button content-button-outline text-xs px-3 py-1.5">
          {copied ? '已复制' : '复制引用格式'}
        </button>
      </div>
    </div>
  )
}
