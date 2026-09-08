'use client'
import { useEffect, useRef, useState } from 'react'
import d3Cloud from 'd3-cloud'
import type { WordCloudItem } from '@/lib/wordCloudUtils'
import { weightToColor } from '@/lib/wordCloudUtils'

interface LayoutWord extends d3Cloud.Word {
  text: string
  size: number
  weight: number
  type: 'keyword' | 'entity' | 'person'
  totalRelated: number
  x?: number
  y?: number
  rotate?: number
}

interface WordCloudProps {
  words: WordCloudItem[]
  maxWeight: number
  width?: number
  height?: number
  onWordClick?: (word: WordCloudItem) => void
  className?: string
}

export default function WordCloud({ words, maxWeight, width = 800, height = 500, onWordClick, className }: WordCloudProps) {
  const [positions, setPositions] = useState<LayoutWord[]>([])
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (words.length === 0) return

    const layoutWords: LayoutWord[] = words.map(w => ({
      text: w.text,
      size: w.size,
      weight: w.weight,
      type: w.type,
      totalRelated: w.totalRelated,
      rotate: 0,
    }))

    const layout = d3Cloud<LayoutWord>()
      .size([width, height])
      .words(layoutWords)
      .padding(4)
      .rotate(() => 0)
      .spiral('archimedean' as any)
      .fontSize((d: LayoutWord) => d.size)
      .on('end', (laidOut: LayoutWord[]) => {
        setPositions(laidOut.filter(w => w.x != null && w.y != null))
      })

    layout.start()
    return () => { layout.stop() }
  }, [words, width, height])

  // Fix Bug 1: use native non-passive wheel listener to prevent page scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale(prev => Math.min(2.5, Math.max(0.5, prev + delta)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const dragRef = useRef<{ active: boolean; startX: number; startY: number; tx: number; ty: number }>({
    active: false, startX: 0, startY: 0, tx: 0, ty: 0,
  })

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, tx: translate.x, ty: translate.y }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    setTranslate({
      x: dragRef.current.tx + (e.clientX - dragRef.current.startX),
      y: dragRef.current.ty + (e.clientY - dragRef.current.startY),
    })
  }
  const handleMouseUp = () => { dragRef.current.active = false }

  return (
    <div ref={containerRef} className={`wordcloud-container w-full flex items-center justify-center overflow-hidden ${className || ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        width={width}
        height={height}
        style={{ display: 'block' }}
        className="w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${width / 2 + translate.x},${height / 2 + translate.y}) scale(${scale})`}>
          {positions.map((word, i) => {
            const isHovered = hoveredWord === word.text
            const fillColor = weightToColor(word.weight, maxWeight)
            return (
              <text
                key={`${word.text}-${i}`}
                x={word.x || 0}
                y={word.y || 0}
                textAnchor="middle"
                dominantBaseline="alphabetic"
                fontSize={word.size}
                fontWeight={word.weight > maxWeight * 0.5 ? 700 : word.weight > maxWeight * 0.25 ? 500 : 400}
                fill={isHovered ? '#C49A2B' : fillColor}
                stroke={isHovered ? '#C49A2B' : 'none'}
                strokeWidth={isHovered ? 1 : 0}
                style={{
                  cursor: 'pointer',
                  transition: 'fill 0.2s, font-size 0.2s, opacity 0.2s',
                  fontSize: isHovered ? `${word.size * 1.3}px` : `${word.size}px`,
                  opacity: hoveredWord && !isHovered ? 0.3 : 1,
                }}
                onMouseEnter={() => setHoveredWord(word.text)}
                onMouseLeave={() => setHoveredWord(null)}
                onClick={() => onWordClick?.(words.find(w => w.text === word.text)!)}
              >
                {word.text}
              </text>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
