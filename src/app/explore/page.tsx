'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SkeletonCard from '@/components/shared/SkeletonCard'

interface Recommendation {
  id: string
  title: string
  category: string
  credibilityLevel: string
  aiIntro: string
  fileType?: string
}

interface ThemeTour {
  id: string
  title: string
  description: string
  query: string
}

interface LatestItem {
  id: string
  title: string
  category: string
  credibilityLevel: string
  importedAt: string
}

export default function ExplorePage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [themeTours, setThemeTours] = useState<ThemeTour[]>([])
  const [latest, setLatest] = useState<LatestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/explore')
        const data = await res.json()
        if (data.success) {
          setRecommendations(data.dailyRecommendations || [])
          setThemeTours(data.themeTours || [])
          setLatest(data.latestAdditions || [])
        } else {
          setError(data.message || '数据加载失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求失败')
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-hero text-center">
        <p className="content-hero-kicker">AI Curated</p>
        <h1 className="content-hero-title">AI 策展 · 发现金陵工脉</h1>
        <p className="content-hero-desc">AI 每日推荐精选史料、预设主题漫游路线，助你探索南京民族工业的百年脉络。</p>
      </div>

      <div className="content-page-narrow py-8 space-y-10">
        {error && (
          <div className="content-panel p-4 text-sm text-[#8B1A2B]">
            加载失败: {error}
          </div>
        )}

        {/* Daily Recommendations */}
        <section>
          <h2 className="text-xl font-bold text-[#4A3728] mb-4">今日推荐</h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <SkeletonCard key={i} hasImage lines={2} />)}
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-sm text-[#7C6A5A]">暂无推荐内容</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map(item => (
                <Link key={item.id} href={`/sources/${item.id}`} className="content-card p-5 hover:shadow-archive transition-shadow block">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${item.credibilityLevel === 'A' ? 'bg-[#8B1A2B]' : 'bg-[#C49A2B]'}`}>
                      {item.credibilityLevel}级
                    </span>
                    {item.category && <span className="text-[10px] text-[#7C6A5A]">{item.category}</span>}
                  </div>
                  <h3 className="font-bold text-[#4A3728] mb-2">{item.title}</h3>
                  <p className="text-xs leading-6 text-[#7C6A5A]">{item.aiIntro}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Theme Tours */}
        <section>
          <h2 className="text-xl font-bold text-[#4A3728] mb-4">主题漫游</h2>
          {themeTours.length === 0 ? (
            <p className="text-sm text-[#7C6A5A]">暂无主题路线</p>
          ) : (
            <div className="space-y-3">
              {themeTours.map(tour => (
                <Link
                  key={tour.id}
                  href={`/search?q=${encodeURIComponent(tour.query)}`}
                  className="content-card p-5 flex items-center justify-between hover:shadow-archive transition-shadow block"
                >
                  <div>
                    <h3 className="font-bold text-[#4A3728]">{tour.title}</h3>
                    <p className="text-sm text-[#7C6A5A] mt-1">{tour.description}</p>
                  </div>
                  <span className="text-[#C49A2B] text-xl shrink-0 ml-4">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Latest Additions */}
        <section>
          <h2 className="text-xl font-bold text-[#4A3728] mb-4">最新入库</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 content-card animate-pulse" />)}
            </div>
          ) : latest.length === 0 ? (
            <p className="text-sm text-[#7C6A5A]">暂无最新入库</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-[#E8DCC8]" />
              {latest.map((item, i) => (
                <div key={item.id} className="relative pb-4 last:pb-0 animate-timelineRise" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="absolute left-[-1.15rem] top-1.5 w-2.5 h-2.5 rounded-full bg-[#C49A2B] border-2 border-[#F5F0E8]" />
                  <Link href={`/sources/${item.id}`} className="content-card p-3 block hover:shadow-archive transition-shadow">
                    <span className="text-xs text-[#C49A2B]">{item.importedAt?.slice(0, 10) || ''}</span>
                    <h4 className="text-sm font-medium text-[#4A3728] mt-0.5">{item.title}</h4>
                    <span className="text-[10px] text-[#7C6A5A]">{item.category}</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
