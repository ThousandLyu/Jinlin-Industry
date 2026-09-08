'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Badge from '@/components/shared/Badge'
import GraphView, { type GraphEdge, type GraphNode } from '@/components/shared/GraphView'
import { useTypewriterText } from '@/hooks/useTypewriterText'

interface ChainNode {
  id: string
  title: string
  type: string
}

interface ChainEdge {
  sourceId: string
  targetId: string
  relationType: string
  confidence: number
  aiReason?: string
}

interface ChainResponse {
  success: boolean
  chain: {
    nodes: ChainNode[]
    edges: ChainEdge[]
    entryIds: string[]
  } | null
  narrative: string | null
  entrySources?: Array<{ id: string; title: string; summary: string; grade: string }>
  nodeSummaries?: Array<{ id: string; title: string; summary: string; grade?: string; fileType?: string }>
}

const RELATION_LABELS: Record<string, string> = {
  cites: '引用',
  supports: '支持',
  contradicts: '矛盾',
  extends: '扩展',
  related: '相关',
}

export interface InfoChainProps {
  initialQuery?: string
  embedded?: boolean
  className?: string
}

export default function InfoChain({ initialQuery = '', embedded = true, className = '' }: InfoChainProps) {
  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ChainResponse | null>(null)
  const [error, setError] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const activeQueryRef = useRef('')
  const lastAutoQueryRef = useRef('')
  const requestSeqRef = useRef(0)

  const doSearch = useCallback(async (nextQuery = query) => {
    const trimmedQuery = nextQuery.trim()
    if (!trimmedQuery) return

    const requestId = requestSeqRef.current + 1
    requestSeqRef.current = requestId
    const previousQuery = activeQueryRef.current
    activeQueryRef.current = trimmedQuery
    setLoading(true)
    setError('')
    if (previousQuery !== trimmedQuery) setData(null)
    setDetailId(null)
    try {
      const res = await fetch(`/api/links/chain?q=${encodeURIComponent(trimmedQuery)}`)
      const json = await res.json()
      if (requestSeqRef.current !== requestId) return
      if (json.success) {
        setData(json)
        if (!json.chain) setError(json.narrative || '未找到相关信息链')
      } else {
        setError(json.message || '请求失败')
      }
    } catch {
      if (requestSeqRef.current !== requestId) return
      setError('信息链查询失败，请稍后重试')
    } finally {
      if (requestSeqRef.current === requestId) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const trimmedQuery = initialQuery.trim()
    setQuery(initialQuery)
    if (!trimmedQuery || lastAutoQueryRef.current === trimmedQuery) return
    lastAutoQueryRef.current = trimmedQuery
    doSearch(trimmedQuery)
  }, [doSearch, initialQuery])

  const graph = useMemo(() => {
    // 只保留人物类型节点
    const personNodes = (data?.chain?.nodes || []).filter(n => n.type === 'person').slice(0, 24)
    const personIds = new Set(personNodes.map(n => n.id))
    const nodeMap = new Map(personNodes.map(node => [node.id, node]))
    const graphNodes: GraphNode[] = personNodes.map(node => ({
      id: node.id,
      label: node.title,
      type: 'person' as const,
    }))
    // 只保留人物之间的边
    const graphEdges: GraphEdge[] = (data?.chain?.edges || [])
      .filter(edge => personIds.has(edge.sourceId) && personIds.has(edge.targetId))
      .map(edge => ({
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.relationType,
        confidence: edge.confidence,
      }))
    return { nodes: personNodes, nodeMap, graphNodes, graphEdges }
  }, [data])

  const detailNode = detailId ? graph.nodeMap.get(detailId) : null
  const detailSource = detailId
    ? data?.nodeSummaries?.find(source => source.id === detailId)
      || data?.entrySources?.find(source => source.id === detailId)
    : null
  const detailEdges = (data?.chain?.edges || []).filter(edge => edge.sourceId === detailId || edge.targetId === detailId)
  const typedNarrative = useTypewriterText(data?.narrative || '', { enabled: Boolean(data?.narrative), intervalMs: 22, step: 2 })

  return (
    <div className={`${className} ${embedded ? '' : 'content-page-narrow'}`}>
      {embedded && (
        <div className="mb-4 grid gap-2 rounded-lg border border-[#E8DCC8] bg-[#FDFBF7] p-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') doSearch() }}
            placeholder="输入关键词探索信息链…"
            className="content-input min-h-11"
          />
          <button onClick={() => doSearch()} disabled={loading} className="content-button content-button-primary px-4 disabled:opacity-50">
            {loading ? '分析中…' : '刷新信息链'}
          </button>
        </div>
      )}

      {loading && (
        <div className="content-panel p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#C49A2B] animate-pulse" />
            <p className="text-sm text-[#7C6A5A]">信息链分析中（不影响下方搜索结果）…</p>
          </div>
          <div className="relative h-[460px] overflow-hidden rounded-lg border border-[#E8DCC8] bg-gradient-to-br from-[#F5F0E8] to-[#FDFBF7]">
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C49A2B]/30 bg-[#FDFBF7] animate-skeleton-pulse" />
            <div className="absolute left-[28%] top-[32%] h-12 w-12 rounded-full border border-[#E8DCC8] bg-white animate-skeleton-pulse" />
            <div className="absolute right-[26%] top-[36%] h-12 w-12 rounded-full border border-[#E8DCC8] bg-white animate-skeleton-pulse" />
            <div className="absolute bottom-[27%] left-[35%] h-12 w-12 rounded-full border border-[#E8DCC8] bg-white animate-skeleton-pulse" />
          </div>
        </div>
      )}

      {error && (
        <div className="content-panel p-4 text-sm text-[#8B1A2B]">{error}</div>
      )}

      {data?.narrative && (
        <div className="content-panel mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A3728] text-xs font-bold text-[#F5F0E8]">AI</span>
            <div>
              <p className="text-xs font-semibold text-[#C49A2B]">AI 链路讲解</p>
              <p className="text-[11px] text-[#7C6A5A]">依据人物与史料关系生成</p>
            </div>
          </div>
          <div className="h-56 overflow-y-auto rounded-lg border border-[#E8DCC8] bg-white px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[#7C6A5A]">
              {typedNarrative.text}
              {!typedNarrative.done && <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse bg-[#C49A2B]" />}
            </p>
          </div>
        </div>
      )}

      {graph.graphNodes.length > 0 && (
        <div className="content-panel overflow-hidden p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#4A3728]">信息链</p>
              <p className="text-xs text-[#7C6A5A]">显示前 {graph.graphNodes.length} 个人物关联节点，可缩放、拖拽并点击查看详情。</p>
            </div>
          </div>
          <GraphView
            nodes={graph.graphNodes}
            edges={graph.graphEdges}
            height={460}
            onNodeClick={node => setDetailId(node.id)}
            minimal
          />
        </div>
      )}

      {detailNode && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDetailId(null)}>
          <div className="ml-auto h-full w-full max-w-md overflow-y-auto border-l border-[#E8DCC8] bg-[#FDFBF7] shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 border-b border-[#E8DCC8] bg-[#FDFBF7]/95 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#C49A2B]">{typeLabel(detailNode.type)} 详情</p>
                  <h3 className="mt-1 text-lg font-bold text-[#4A3728]">{detailNode.title}</h3>
                </div>
                <button onClick={() => setDetailId(null)} className="text-lg text-[#7C6A5A] hover:text-[#4A3728]">&times;</button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {detailSource ? (
                <>
                  {detailSource.grade && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">可信度</span>
                      <Badge variant={detailSource.grade as 'A' | 'B' | 'C'}>{detailSource.grade}级</Badge>
                    </div>
                  )}
                  {detailSource.summary && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-gray-500">AI 摘要</p>
                      <p className="text-sm leading-6 text-[#7C6A5A]">{detailSource.summary}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">暂无该节点的详细摘要信息</p>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500">关联关系</p>
                {detailEdges.length > 0 ? detailEdges.map((edge, index) => {
                  const otherId = edge.sourceId === detailId ? edge.targetId : edge.sourceId
                  const otherNode = graph.nodeMap.get(otherId)
                  return (
                    <div key={`${edge.sourceId}-${edge.targetId}-${index}`} className="mb-2 rounded-lg border border-[#E8DCC8] bg-white p-3 text-sm text-[#7C6A5A]">
                      <p className="font-semibold text-[#4A3728]">{RELATION_LABELS[edge.relationType] || edge.relationType} · {Math.round(edge.confidence * 100)}%</p>
                      <p className="mt-1">{otherNode?.title || otherId}</p>
                      {edge.aiReason && <p className="mt-1 text-xs leading-5 text-gray-400">{edge.aiReason}</p>}
                    </div>
                  )
                }) : (
                  <p className="text-sm text-gray-400">暂无关联边</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function typeLabel(type: string) {
  const labels: Record<string, string> = { source: '史料', person: '人物', site: '遗址' }
  return labels[type] || type
}
