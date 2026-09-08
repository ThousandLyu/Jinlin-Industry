'use client'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import EmptyState from '@/components/shared/EmptyState'
import InfoChain from '@/components/front/InfoChain'

interface SearchResult {
  id: string
  type: string
  typeLabel: string
  title: string
  subtitle?: string
  url: string
  snippet?: string
}

const typeColors: Record<string, string> = {
  site: 'bg-[#8B1A2B]',
  person: 'bg-[#C49A2B]',
  fact: 'bg-[#4A3728]',
  timeline: 'bg-[#4A3728]',
  source: 'bg-[#8B1A2B]',
  scene: 'bg-[#C49A2B]',
  course: 'bg-[#4A3728]',
  activity: 'bg-[#8B1A2B]',
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') || ''
  const [keyword, setKeyword] = useState('')
  const [chainQuery, setChainQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const activeSearchQueryRef = useRef('')
  const lastAutoQueryRef = useRef('')
  const requestSeqRef = useRef(0)

  const doSearch = useCallback(async (q: string) => {
    const trimmedQuery = q.trim()
    if (!trimmedQuery) {
      setResults([])
      setTotal(0)
      setChainQuery('')
      return
    }
    const requestId = requestSeqRef.current + 1
    requestSeqRef.current = requestId
    const previousQuery = activeSearchQueryRef.current
    activeSearchQueryRef.current = trimmedQuery
    setLoading(true)
    if (previousQuery !== trimmedQuery) setChainQuery('')
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`)
      const data = await res.json()
      if (requestSeqRef.current !== requestId) return
      setResults(data.results || [])
      setTotal(data.total || 0)
      startTransition(() => setChainQuery(trimmedQuery))
    } catch {
      if (requestSeqRef.current !== requestId) return
      setResults([])
      setTotal(0)
      setChainQuery('')
    } finally {
      if (requestSeqRef.current === requestId) setLoading(false)
    }
  }, [])

  const submitSearch = async () => {
    const q = keyword.trim()
    if (!q) return
    window.history.replaceState(null, '', `/search?q=${encodeURIComponent(q)}`)
    await doSearch(q)
  }

  useEffect(() => {
    const q = urlQuery.trim()
    if (!q || lastAutoQueryRef.current === q) return
    lastAutoQueryRef.current = q
    setKeyword(urlQuery)
    doSearch(q)
  }, [doSearch, urlQuery])

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-hero">
        <div className="mx-auto max-w-4xl">
          <p className="content-hero-kicker">AI Fusion Search</p>
          <h1 className="content-hero-title">AI融合搜索</h1>
          <p className="content-hero-desc mb-8">
            融合史料检索、图谱线索与信息链分析，统一返回可追溯的相关内容。
          </p>

          <div className="mx-auto grid max-w-3xl gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur md:grid-cols-[1fr_auto]">
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') submitSearch() }}
              placeholder="输入企业、人物、史实或史料关键词…"
              className="content-input border-0"
            />
            <button
              onClick={submitSearch}
              disabled={loading}
              className="content-button content-button-primary px-6 disabled:opacity-50"
            >
              {loading ? '搜索中…' : 'AI融合搜索'}
            </button>
          </div>
        </div>
      </div>

      <div className="content-page-narrow">
        {loading && (
          <div className="py-16 text-center text-gray-400">搜索中…</div>
        )}

        {!loading && keyword && (
          <div className="mb-4 text-sm text-gray-500">
            找到 <span className="font-bold text-[#C49A2B]">{total}</span> 条结果
          </div>
        )}

        {chainQuery && !loading && (
          <div className="mb-6">
            <InfoChain initialQuery={chainQuery} embedded />
          </div>
        )}

        {!loading && results.length === 0 && keyword && (
          <EmptyState title="未找到相关结果" description="试试其他关键词，系统会继续结合史料库和信息链进行融合检索。" />
        )}

        <div className="space-y-3">
          {results.map((item) => (
            <a
              key={`${item.type}-${item.id}`}
              href={item.url}
              className="content-card block p-5"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-block shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white ${typeColors[item.type] || 'bg-gray-500'}`}>
                  {item.typeLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#4A3728]">{item.title}</h3>
                  {item.subtitle && (
                    <p className="mt-0.5 text-xs text-gray-400">{item.subtitle}</p>
                  )}
                  {item.snippet && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.snippet}</p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>

    </div>
  )
}
