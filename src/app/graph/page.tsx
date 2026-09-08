'use client'

import { useState, useEffect, useCallback } from 'react'
import GraphView from '@/components/shared/GraphView'
import type { GraphNode, GraphEdge } from '@/components/shared/GraphView'

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'source' | 'person' | 'site'>('all')
  const [detailNode, setDetailNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/graph')
        const data = await res.json()
        if (data.success) {
          setNodes(data.nodes || [])
          setEdges(data.edges || [])
        } else {
          setError(data.message || '加载失败')
        }
      } catch {
        setError('图谱数据加载失败')
      }
      setLoading(false)
    })()
  }, [])

  const filteredNodes = filter === 'all' ? nodes : nodes.filter(n => n.type === filter)
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))

  const typeCounts = {
    all: nodes.length,
    source: nodes.filter(n => n.type === 'source').length,
    person: nodes.filter(n => n.type === 'person').length,
    site: nodes.filter(n => n.type === 'site').length,
  }

  const handleNodeClick = useCallback((node: GraphNode) => {
    setDetailNode(detailNode?.id === node.id ? null : node)
  }, [detailNode])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#C49A2B] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-[#7C6A5A]">加载知识图谱数据…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-hero text-center">
        <p className="content-hero-kicker">Knowledge Graph</p>
        <h1 className="content-hero-title">知识图谱</h1>
        <p className="content-hero-desc">人物 · 企业遗址 · 史料 关系网络。拖拽节点、滚轮缩放。</p>
      </div>

      <div className="content-page-narrow">
        {error && (
          <div className="content-panel p-4 mb-4 text-sm text-[#8B1A2B]">{error}</div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {(['all', 'source', 'person', 'site'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === f ? 'bg-[#4A3728] text-white' : 'bg-white text-[#7C6A5A] border border-[#E8DCC8]'
              }`}
            >
              {f === 'all' ? `全部 (${typeCounts.all})` : f === 'source' ? `史料 (${typeCounts.source})` : f === 'person' ? `人物 (${typeCounts.person})` : `遗址 (${typeCounts.site})`}
            </button>
          ))}
        </div>

        {/* Graph */}
        <div className="content-card p-4 mb-4">
          <GraphView
            nodes={filteredNodes}
            edges={filteredEdges}
            width={900}
            height={560}
            onNodeClick={handleNodeClick}
            className="w-full"
          />
        </div>

        {/* Detail card */}
        {detailNode && (
          <div className="content-panel p-5 animate-slideUp">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${
                  detailNode.type === 'source' ? 'bg-[#8B1A2B]' : detailNode.type === 'person' ? 'bg-[#4A3728]' : 'bg-[#C49A2B]'
                }`}>
                  {detailNode.type === 'source' ? '史料' : detailNode.type === 'person' ? '人物' : '遗址'}
                </span>
                <h3 className="text-lg font-bold text-[#4A3728] mt-2">{detailNode.label}</h3>
                {detailNode.subtitle && <p className="text-sm text-[#7C6A5A] mt-1">{detailNode.subtitle}</p>}
              </div>
              <button onClick={() => setDetailNode(null)} className="text-[#7C6A5A] hover:text-[#4A3728] text-lg">&times;</button>
            </div>
            <div className="mt-3">
              {detailNode.href && (
                <a href={detailNode.href} className="content-button content-button-primary inline-block">
                  查看详情
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
