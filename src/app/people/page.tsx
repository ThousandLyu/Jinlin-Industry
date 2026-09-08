'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { Person } from '@/types'
import Pagination from '@/components/shared/Pagination'
import SmartImage from '@/components/shared/SmartImage'

const PAGE_SIZE = 12

export default function PeoplePage() {
  const [people, setPeople] = useState<(Person & { siteNames?: string[] })[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const carouselRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef(0)

  useEffect(() => {
    ;(async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch('/api/data?type=people'),
          fetch('/api/data?type=sites'),
        ])
        if (!pRes.ok || !sRes.ok) throw new Error('数据加载失败')
        const pData = await pRes.json()
        const sData = await sRes.json()
        const sites = sData.filter((s: any) => !s.isDeleted)

        const enriched = pData
          .filter((p: any) => !p.isDeleted && (!p.verifiedStatus || p.verifiedStatus === 'verified'))
          .map((p: any) => {
            const linkedSites = (p.siteIds || []).map((id: string) => sites.find((s: any) => s.id === id)).filter(Boolean)
            return { ...p, siteNames: linkedSites.map((s: any) => s.name) }
          })
          .sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
        setPeople(enriched)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      }
      setLoading(false)
    })()
  }, [])

  // 置顶人物用于轮播（最多5人，无人置顶时取前5人）
  const carouselPeople = useMemo(() => {
    const pinned = people.filter((p: any) => p.pinned)
    if (pinned.length > 0) return pinned.slice(0, 5)
    return people.slice(0, 5)
  }, [people])

  // Auto-scroll carousel
  useEffect(() => {
    if (carouselPeople.length <= 1) return
    autoScrollRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % carouselPeople.length)
    }, 4000)
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current) }
  }, [carouselPeople.length])

  const goTo = (index: number) => {
    setActiveIndex(index)
    if (autoScrollRef.current) clearInterval(autoScrollRef.current)
    autoScrollRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % carouselPeople.length)
    }, 4000)
  }

  // Touch swipe for carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx > 0) goTo((activeIndex - 1 + carouselPeople.length) % carouselPeople.length)
      else goTo((activeIndex + 1) % carouselPeople.length)
    }
  }

  const totalPages = Math.ceil(people.length / PAGE_SIZE)
  const pagedPeople = useMemo(
    () => people.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [people, page]
  )
  const visibleDots = carouselPeople
    .map((_, index) => index)
    .filter(index => Math.abs(index - activeIndex) <= 4 || index === 0 || index === carouselPeople.length - 1)

  if (loading) return <div className="content-page text-center text-gray-400">加载中…</div>
  if (error) return <div className="content-page text-center text-[#8B1A2B]">加载失败: {error}</div>
  if (people.length === 0) return <div className="content-page text-center text-gray-400">暂无人物数据</div>

  const active = carouselPeople[activeIndex]

  return (
    <div>
      {/* 全宽大屏轮播区域 */}
      <div
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full overflow-hidden"
        style={{ minHeight: '70vh' }}
      >
        {/* 背景渐变/图片 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4A3728] via-[#4A3728] to-[#8B1A2B]" />
        {/* 自定义背景图片（覆盖渐变） */}
        {active.bgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
            style={{ backgroundImage: `url(${active.bgImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/40" />

        {/* 轮播人物内容 */}
        <div
          key={active.id}
          className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4 py-16 text-center text-white animate-fadeIn"
        >
          {/* 头像 */}
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/30 bg-[#F5F0E8] text-4xl font-bold text-[#4A3728] shadow-2xl">
            {active.name?.[0] || '人'}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            {active.name}
          </h1>

          {active.title && (
            <p className="text-2xl text-[#C49A2B] italic mb-3">{active.title}</p>
          )}

          {active.birthYear && (
            <p className="text-sm text-white/70 mb-6">
              {active.birthYear} — {active.deathYear || '至今'}
            </p>
          )}

          {active.biography && (
            <p className="max-w-2xl text-white/90 leading-relaxed text-sm md:text-base">
              {active.biography.length > 180
                ? active.biography.slice(0, 180) + '…'
                : active.biography}
            </p>
          )}

          {/* 贡献/成就 */}
          {active.achievements && (
            <div className="mt-4 max-w-2xl">
              <p className="text-xs text-[#C49A2B] uppercase tracking-wider mb-2">主要成就</p>
              <p className="text-sm text-white/80 leading-relaxed">
                {active.achievements.length > 150
                  ? active.achievements.slice(0, 150) + '…'
                  : active.achievements}
              </p>
            </div>
          )}

          {/* 关联企业 */}
          {active.siteNames && active.siteNames.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {active.siteNames.map((siteName: string, i: number) => (
                <span key={i} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
                  {siteName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 下方指示点 */}
        {people.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {visibleDots.map((i, dotIndex) => (
              <div key={i} className="flex items-center gap-2">
                {dotIndex > 0 && i - visibleDots[dotIndex - 1] > 1 && <span className="h-1 w-1 rounded-full bg-white/30" />}
                <button
                  onClick={() => goTo(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === activeIndex
                      ? 'w-8 bg-[#C49A2B]'
                      : 'w-2.5 bg-white/40 hover:bg-white/60'
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* 左右箭头 */}
        {carouselPeople.length > 1 && (
          <>
            <button
              onClick={() => goTo((activeIndex - 1 + carouselPeople.length) % carouselPeople.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/60 hover:text-white text-3xl transition-colors"
            >‹</button>
            <button
              onClick={() => goTo((activeIndex + 1) % carouselPeople.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/60 hover:text-white text-3xl transition-colors"
            >›</button>
          </>
        )}
      </div>

      {/* 分隔标题 */}
      <div className="content-section-band text-center">
        <h2 className="content-title text-2xl">
          人物列表
        </h2>
        <p className="content-copy mt-1">共 {people.length} 条人物与机构线索</p>
      </div>

      {/* 人物列表卡片区域 */}
      <div className="content-page">
        <div className="content-grid-3">
          {pagedPeople.map((person, idx) => {
            const absoluteIndex = (page - 1) * PAGE_SIZE + idx
            return (
            <Link
              key={person.id}
              href={`/people/${person.id}`}
              className={`content-card flex min-h-[360px] cursor-pointer flex-col overflow-hidden ${
                absoluteIndex === activeIndex ? 'ring-2 ring-[#C49A2B]/30' : ''
              }`}
            >
              <div className="p-6 text-center">
                <div className="relative mx-auto mb-4 flex h-24 w-20 items-center justify-center overflow-hidden rounded-[48%] border border-[#E8DCC8] bg-[#4A3728] text-2xl font-bold text-white shadow-sm">
                  {person.avatar ? (
                    <SmartImage src={person.avatar} alt={person.name} fill sizes="80px" className="object-cover" />
                  ) : (
                    person.name?.[0] || '人'
                  )}
                </div>
                <h3 className="content-title text-3xl">{person.name}</h3>
                {(person.title || person.role) && <p className="text-base text-[#C49A2B] mt-1 italic">{person.title || person.role}</p>}
                {person.birthYear && (
                  <p className="text-xs text-gray-400 mt-1">
                    {person.birthYear} — {person.deathYear || '至今'}
                  </p>
                )}
                {person.siteNames && person.siteNames.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {person.siteNames.map((sn: string, si: number) => (
                      <span key={si} className="content-tag-muted rounded-full">
                        {sn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-auto px-6 pb-6">
                {person.biography && (
                  <p className="content-copy line-clamp-3">
                    {person.biography}
                  </p>
                )}
                {person.achievements && (
                  <div className="mt-3 rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] p-3">
                    <p className="content-title mb-1 text-xs">主要成就</p>
                    <p className="content-copy line-clamp-2">{person.achievements}</p>
                  </div>
                )}
              </div>
            </Link>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={people.length} onPageChange={setPage} />
      </div>
    </div>
  )
}

function EntityTypeBadge({ value }: { value?: string }) {
  const type = value === 'organization' ? 'organization' : value === 'unknown' ? 'unknown' : 'person'
  const styles = {
    person: 'border-[#C49A2B]/30 bg-[#C49A2B]/10 text-[#7A5A13]',
    organization: 'border-[#8B1A2B]/25 bg-[#8B1A2B]/10 text-[#8B1A2B]',
    unknown: 'border-gray-200 bg-white text-[#7C6A5A]',
  }
  const label = type === 'organization' ? '企业/机构' : type === 'unknown' ? '待查验' : '人物'
  return <span className={`mb-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[type]}`}>{label}</span>
}
