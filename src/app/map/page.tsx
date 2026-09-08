'use client'
import { useState, useEffect, useMemo } from 'react'
import SmartImage from '@/components/shared/SmartImage'
import SectionHeader from '@/components/shared/SectionHeader'

const DOT_COLORS = ['#8B1A2B', '#C49A2B', '#4A3728', '#2D5F7C', '#5B8C5A']
const DOT_COLORS_TAILWIND = [
  { bg: 'bg-[#8B1A2B]', text: 'text-[#8B1A2B]' },
  { bg: 'bg-[#C49A2B]', text: 'text-[#C49A2B]' },
  { bg: 'bg-[#4A3728]', text: 'text-[#4A3728]' },
  { bg: 'bg-[#2D5F7C]', text: 'text-[#2D5F7C]' },
  { bg: 'bg-[#5B8C5A]', text: 'text-[#5B8C5A]' },
]

function dotColorClass(index: number) {
  return DOT_COLORS_TAILWIND[index % DOT_COLORS_TAILWIND.length]
}

function dotColorHex(index: number) {
  return DOT_COLORS[index % DOT_COLORS.length]
}

function pointAddress(point: any) {
  const address = point.address || point.location || point.description || ''
  return address ? `位于${address}` : '暂无明确地址'
}

function pointName(point: any) {
  return point.name || point.siteName || point.alias || '未命名企业'
}

export default function MapPage() {
  const [points, setPoints] = useState<any[]>([])
  const [baseMap, setBaseMap] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch('/api/data?type=mapPoints'),
          fetch('/api/data?type=settings'),
        ])
        if (!pRes.ok || !sRes.ok) throw new Error('数据加载失败')
        const pData = await pRes.json()
        const sData = await sRes.json()
        if (!Array.isArray(pData)) throw new Error('点位数据格式错误')
        setPoints(pData.filter((p: any) => !p.isDeleted))
        setBaseMap(sData[0]?.mapBaseImage || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '地图数据加载失败')
      }
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return points
    const q = search.toLowerCase()
    return points.filter((p: any) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.siteName || '').toLowerCase().includes(q) ||
      (p.alias || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    )
  }, [points, search])

  if (loading) return <div className="content-page text-center text-gray-400">加载中…</div>
  if (error) return <div className="content-page text-center text-[#8B1A2B]">{error}</div>

  return (
    <div className="content-page">
      <SectionHeader
        eyebrow="Industrial Map"
        title="工业地图"
        description="以企业名称进入城市空间，查看南京民族工业遗址的地理分布与现场线索。"
      />

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索点位名称、别名或地址…"
          className="content-input"
        />
      </div>

      <div className="content-panel mx-auto w-full p-4 lg:w-2/3">
        <div className="relative aspect-[16/10] w-full">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl bg-[#F5F0E8]">
            <div className="relative w-full h-full">
              {baseMap ? (
                <SmartImage src={baseMap} alt="南京工业遗址分布底图" fill sizes="1152px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="mx-auto mb-3 h-12 w-12 rounded-full border border-[#C49A2B]/40 bg-white/50" />
                      <p className="text-sm">南京工业遗址分布示意图</p>
                      <p className="text-xs mt-1">
                      {points.map((p: any) => pointName(p)).join(' · ')}
                    </p>
                  </div>
                </div>
              )}
              {filtered.map((point: any, idx: number) => {
                const colorHex = dotColorHex(idx)
                return (
                <div
                  key={point.id}
                  className="map-pulse absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 transform cursor-pointer rounded-full shadow-lg transition-all hover:h-5 hover:w-5 group"
                  style={{ left: `${point.xPercent}%`, top: `${point.yPercent}%`, backgroundColor: colorHex }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                    <div className="rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                      <p className="text-sm font-bold" style={{ color: colorHex }}>{pointName(point)}</p>
                      <p className="text-[#7C6A5A]">{pointAddress(point)}</p>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>
      <div className="content-grid-3 mt-8">
        {filtered.map((point: any, idx: number) => {
          const clr = dotColorClass(idx)
          return (
            <div key={point.id} className="content-card p-4">
              <h3 className={`text-lg font-bold ${clr.text}`}>{pointName(point)}</h3>
              <p className="content-copy mt-2">{pointAddress(point)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
