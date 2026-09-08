'use client'

import { useState, useCallback, useRef } from 'react'

interface SourceInfo {
  title: string
  category: string
  credibilityLevel: string
  author: string
  publishDate: string
  type: string
  summary: string
  description: string
}

interface CompareData {
  success: boolean
  source1: SourceInfo | null
  source2: SourceInfo | null
  aiAnalysis: {
    similarities: string[]
    differences: string[]
    overallSummary: string
  }
}

export default function ComparePage() {
  const [id1, setId1] = useState('')
  const [id2, setId2] = useState('')
  const [data, setData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  const doCompare = async () => {
    if (!id1.trim() || !id2.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/compare?id1=${encodeURIComponent(id1)}&id2=${encodeURIComponent(id2)}`)
      const json = await res.json()
      if (json.success) setData(json)
      else setError(json.message || '对比失败')
    } catch {
      setError('对比请求失败')
    }
    setLoading(false)
  }

  const onLeftScroll = useCallback(() => {
    if (syncingRef.current || !leftRef.current || !rightRef.current) return
    syncingRef.current = true
    const leftMax = leftRef.current.scrollHeight - leftRef.current.clientHeight
    const rightMax = rightRef.current.scrollHeight - rightRef.current.clientHeight
    if (leftMax <= 0 || rightMax <= 0) { syncingRef.current = false; return }
    const ratio = leftRef.current.scrollTop / leftMax
    rightRef.current.scrollTop = ratio * rightMax
    setTimeout(() => { syncingRef.current = false }, 10)
  }, [])

  const onRightScroll = useCallback(() => {
    if (syncingRef.current || !leftRef.current || !rightRef.current) return
    syncingRef.current = true
    const leftMax = leftRef.current.scrollHeight - leftRef.current.clientHeight
    const rightMax = rightRef.current.scrollHeight - rightRef.current.clientHeight
    if (leftMax <= 0 || rightMax <= 0) { syncingRef.current = false; return }
    const ratio = rightRef.current.scrollTop / rightMax
    leftRef.current.scrollTop = ratio * leftMax
    setTimeout(() => { syncingRef.current = false }, 10)
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-hero text-center">
        <p className="content-hero-kicker">Compare Sources</p>
        <h1 className="content-hero-title">对比阅读</h1>
        <p className="content-hero-desc">左右双栏对比两篇史料，AI 标注异同，支持同步滚动。</p>
      </div>

      <div className="content-page-narrow py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <input
            value={id1}
            onChange={e => setId1(e.target.value)}
            placeholder="史料A 的 ID"
            className="content-input flex-1 min-w-[200px]"
          />
          <span className="self-center text-[#C49A2B] font-bold">vs</span>
          <input
            value={id2}
            onChange={e => setId2(e.target.value)}
            placeholder="史料B 的 ID"
            className="content-input flex-1 min-w-[200px]"
          />
          <button onClick={doCompare} disabled={loading} className="content-button content-button-primary px-6 disabled:opacity-50">
            {loading ? '分析中…' : '开始对比'}
          </button>
        </div>

        {error && <div className="content-panel p-4 mb-4 text-sm text-[#8B1A2B]">{error}</div>}

        {data?.source1 && data?.source2 && (
          <>
            {/* Dual column */}
            <div className="grid gap-4 lg:grid-cols-2 mb-6">
              {/* Left */}
              <div>
                <div className="content-panel p-4 mb-2">
                  <h3 className="font-bold text-[#4A3728] text-lg">{data.source1.title}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-[#7C6A5A]">
                    {data.source1.author && <span>{data.source1.author}</span>}
                    {data.source1.publishDate && <span>{data.source1.publishDate}</span>}
                    <span className={`font-bold ${data.source1.credibilityLevel === 'A' ? 'text-[#8B1A2B]' : data.source1.credibilityLevel === 'B' ? 'text-[#C49A2B]' : 'text-gray-400'}`}>
                      {data.source1.credibilityLevel}级
                    </span>
                  </div>
                </div>
                <div ref={leftRef} onScroll={onLeftScroll} className="content-card p-5 max-h-[500px] overflow-y-auto">
                  <div className="text-sm leading-7 text-[#7C6A5A] whitespace-pre-wrap">
                    {data.source1.summary || data.source1.description || '(无内容)'}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div>
                <div className="content-panel p-4 mb-2">
                  <h3 className="font-bold text-[#4A3728] text-lg">{data.source2.title}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-[#7C6A5A]">
                    {data.source2.author && <span>{data.source2.author}</span>}
                    {data.source2.publishDate && <span>{data.source2.publishDate}</span>}
                    <span className={`font-bold ${data.source2.credibilityLevel === 'A' ? 'text-[#8B1A2B]' : data.source2.credibilityLevel === 'B' ? 'text-[#C49A2B]' : 'text-gray-400'}`}>
                      {data.source2.credibilityLevel}级
                    </span>
                  </div>
                </div>
                <div ref={rightRef} onScroll={onRightScroll} className="content-card p-5 max-h-[500px] overflow-y-auto">
                  <div className="text-sm leading-7 text-[#7C6A5A] whitespace-pre-wrap">
                    {data.source2.summary || data.source2.description || '(无内容)'}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="content-panel p-5">
              <h3 className="text-sm font-bold text-[#4A3728] mb-3">AI 差异分析</h3>

              {data.aiAnalysis.similarities.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-green-600 mb-2">相同点</p>
                  <ul className="space-y-1">
                    {data.aiAnalysis.similarities.map((s, i) => (
                      <li key={i} className="text-sm text-[#7C6A5A] flex items-start gap-2">
                        <span className="text-green-500 mt-1.5 shrink-0">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.aiAnalysis.differences.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#8B1A2B] mb-2">差异点</p>
                  <ul className="space-y-1">
                    {data.aiAnalysis.differences.map((d, i) => (
                      <li key={i} className="text-sm text-[#7C6A5A] flex items-start gap-2">
                        <span className="text-red-500 mt-1.5 shrink-0">✗</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.aiAnalysis.overallSummary && (
                <p className="mt-4 pt-4 border-t border-[#E8DCC8] text-sm leading-7 text-[#7C6A5A]">
                  {data.aiAnalysis.overallSummary}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
