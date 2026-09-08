'use client'

import { useEffect, useRef, useState } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force'
import type { SimulationNodeDatum, SimulationLinkDatum, Simulation } from 'd3-force'
import { select, pointer } from 'd3-selection'
import { zoom, zoomTransform } from 'd3-zoom'

export interface GraphNode {
  id: string
  label: string
  type: 'source' | 'person' | 'site'
  subtitle?: string
  href?: string
}

export interface GraphEdge {
  source: string
  target: string
  label: string
  confidence?: number
}

export interface GraphViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width?: number
  height?: number
  onNodeClick?: (node: GraphNode) => void
  className?: string
  /** 极简模式：无图标，名字在圈内，仅 person 类型 */
  minimal?: boolean
}

interface SimNode extends SimulationNodeDatum {
  id: string
  label: string
  type: 'source' | 'person' | 'site'
  subtitle?: string
  href?: string
  x?: number
  y?: number
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
  label: string
  confidence?: number
}

const NODE_STYLES: Record<string, { fill: string; stroke: string; radius: number }> = {
  source: { fill: '#FDFBF7', stroke: '#C49A2B', radius: 22 },
  person: { fill: '#4A3728', stroke: '#C49A2B', radius: 22 },
  site: { fill: '#8B1A2B', stroke: '#C49A2B', radius: 22 },
}

const ICON_PATHS: Record<GraphNode['type'], string> = {
  source: 'M5 3h10a1 1 0 0 1 1 1v13l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z',
  person: 'M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 8a7 7 0 0 1 14 0H3z',
  site: 'M3 9l7-6 7 6v9H3z',
}

const RELATION_LABELS: Record<string, string> = {
  cites: '引用',
  supports: '支持',
  contradicts: '矛盾',
  extends: '扩展',
  related: '相关',
}

export default function GraphView({ nodes, edges, width = 800, height = 500, onNodeClick, className = '', minimal = false }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const viewportRef = useRef<SVGGElement>(null)
  const simRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null)
  const draggingRef = useRef<string | null>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [simLinks, setSimLinks] = useState<SimLink[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  useEffect(() => {
    const sn: SimNode[] = nodes.map(n => ({ ...n }))
    const sl: SimLink[] = edges.map(e => ({
      source: e.source,
      target: e.target,
      label: e.label,
      confidence: e.confidence,
    }))

    const sim = forceSimulation<SimNode>(sn)
      .force('link', forceLink<SimNode, SimLink>(sl).id((d: SimNode) => d.id).distance(90))
      .force('charge', forceManyBody().strength(-260))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide(minimal ? 46 : 38))
      .alphaDecay(0.02)
      .on('tick', () => {
        setSimNodes([...sn])
        setSimLinks([...sl])
      })

    simRef.current = sim
    setSimNodes([...sn])
    setSimLinks([...sl])

    return () => { sim.stop() }
  }, [nodes, edges, width, height, minimal])

  useEffect(() => {
    if (!svgRef.current || !viewportRef.current) return
    const svg = select(svgRef.current)
    const viewport = select(viewportRef.current)
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2.5])
      .on('zoom', event => {
        viewport.attr('transform', event.transform.toString())
      })

    svg.call(zoomBehavior)
    return () => {
      svg.on('.zoom', null)
    }
  }, [])

  const pointerToGraph = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return [0, 0] as [number, number]
    const point = pointer(event, svgRef.current)
    return zoomTransform(svgRef.current).invert(point) as [number, number]
  }

  const startDrag = (event: React.PointerEvent, node: SimNode) => {
    event.stopPropagation()
    draggingRef.current = node.id
    const [x, y] = pointerToGraph(event as React.PointerEvent<SVGSVGElement>)
    node.fx = x
    node.fy = y
    simRef.current?.alphaTarget(0.25).restart()
  }

  const dragNode = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return
    const node = simNodes.find(item => item.id === draggingRef.current)
    if (!node) return
    const [x, y] = pointerToGraph(event)
    node.fx = x
    node.fy = y
    setSimNodes([...simNodes])
  }

  const stopDrag = () => {
    if (!draggingRef.current) return
    const node = simNodes.find(item => item.id === draggingRef.current)
    if (node) {
      node.fx = null
      node.fy = null
    }
    draggingRef.current = null
    simRef.current?.alphaTarget(0)
  }

  const neighborIds = hoveredNode
    ? new Set(simLinks.filter(l => {
        const sourceId = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
        const targetId = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
        return (sourceId === hoveredNode || targetId === hoveredNode)
      }).flatMap(l => {
        const sourceId = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
        const targetId = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
        return [sourceId, targetId]
      }))
    : null

  const getNodeOpacity = (nodeId: string) => {
    if (!neighborIds) return 1
    if (nodeId === hoveredNode) return 1
    return neighborIds.has(nodeId) ? 0.8 : 0.15
  }

  const renderNode = (node: SimNode) => {
    const style = NODE_STYLES[node.type]
    const opacity = getNodeOpacity(node.id)
    const x = node.x ?? 0
    const y = node.y ?? 0
    const label = `${node.label.slice(0, 8)}${node.label.length > 8 ? '…' : ''}`

    if (minimal) {
      const r = style.radius + 10
      const displayName = node.label.length > 4 ? `${node.label.slice(0, 4)}…` : node.label
      const fontSize = node.label.length > 4 ? 13 : 15
      return (
        <g key={node.id} transform={`translate(${x}, ${y})`} style={{ cursor: 'grab', opacity }} onPointerDown={event => startDrag(event, node)} onClick={() => onNodeClick?.(node)} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}>
          <circle r={r} fill={style.fill} stroke={style.stroke} strokeWidth={2.5} />
          <text textAnchor="middle" dy="0.35em" fill="#F5F0E8" fontSize={fontSize} fontWeight={700} fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>{displayName}</text>
        </g>
      )
    }

    const iconFill = node.type === 'source' ? '#4A3728' : '#F5F0E8'

    return (
      <g key={node.id} transform={`translate(${x}, ${y})`} style={{ cursor: 'grab', opacity }} onPointerDown={event => startDrag(event, node)} onClick={() => onNodeClick?.(node)} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}>
        <circle r={style.radius} fill={style.fill} stroke={style.stroke} strokeWidth={2} />
        <path d={ICON_PATHS[node.type]} transform="translate(-10,-10)" fill={iconFill} />
        <g transform="translate(0, 32)">
          <rect x={-44} y={-3} width={88} height={20} rx={5} fill="#FDFBF7" stroke="#E8DCC8" strokeWidth={0.75} />
          <text textAnchor="middle" y={12} fill="#4A3728" fontSize={12} fontWeight={700} fontFamily="system-ui, sans-serif">{label}</text>
        </g>
      </g>
    )
  }

  const renderEdge = (link: SimLink, i: number) => {
    const source = link.source as SimNode
    const target = link.target as SimNode
    const sx = source.x ?? 0
    const sy = source.y ?? 0
    const tx = target.x ?? 0
    const ty = target.y ?? 0
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nodeRadius = minimal ? 32 : 24
    const sx2 = sx + (dx / len) * nodeRadius
    const sy2 = sy + (dy / len) * nodeRadius
    const tx2 = tx - (dx / len) * nodeRadius
    const ty2 = ty - (dy / len) * nodeRadius
    const edgeOpacity = hoveredNode && neighborIds
      ? (neighborIds.has(source.id) && neighborIds.has(target.id) ? 0.7 : 0.05)
      : 0.4

    return (
      <g key={i}>
        <line
          x1={sx2}
          y1={sy2}
          x2={tx2}
          y2={ty2}
          stroke="#C49A2B"
          strokeWidth={1.6}
          opacity={edgeOpacity}
          markerEnd="url(#graphArrow)"
          strokeDasharray={(link.confidence ?? 1) < 0.6 ? '4 3' : undefined}
        />
        {link.label && (
          <g transform={`translate(${mx}, ${my})`}>
            <rect x={-18} y={-9} width={36} height={16} rx={3} fill="#FDFBF7" stroke="#E8DCC8" strokeWidth={0.5} opacity={edgeOpacity} />
            <text textAnchor="middle" dy={4} fill="#7C6A5A" fontSize={9} fontFamily="system-ui, sans-serif" opacity={edgeOpacity}>
              {RELATION_LABELS[link.label] || link.label}
            </text>
          </g>
        )}
      </g>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-lg border border-[#E8DCC8] bg-[#F5F0E8]"
        onPointerMove={dragNode}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        <defs>
          <marker id="graphArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#C49A2B" />
          </marker>
        </defs>
        <g ref={viewportRef}>
          {simLinks.map((l, i) => renderEdge(l, i))}
          {simNodes.map(n => renderNode(n))}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/85 px-2 py-1 text-[11px] text-[#7C6A5A] shadow-sm">
        滚轮缩放 · 拖拽节点
      </div>
    </div>
  )
}
