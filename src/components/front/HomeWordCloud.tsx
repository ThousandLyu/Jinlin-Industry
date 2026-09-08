'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WordCloud from '@/components/front/WordCloud'
import type { WordCloudItem } from '@/lib/wordCloudUtils'

export default function HomeWordCloud() {
  const [words, setWords] = useState<WordCloudItem[]>([])
  const [maxWeight, setMaxWeight] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/wordcloud')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setWords(data.words || [])
          setMaxWeight(data.maxWeight || 1)
        } else {
          setError(data.message || '词云数据加载失败')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : '请求失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleWordClick = (word: WordCloudItem) => {
    router.push(`/search?q=${encodeURIComponent(word.text)}`)
  }

  if (loading) {
    return (
      <section className="home-section">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-soft mt-3">加载文献关联词云...</p>
        </div>
      </section>
    )
  }

  if (words.length === 0) {
    if (error) {
      return (
        <section className="home-section">
          <p className="text-sm text-center text-[#7C6A5A]">{error}</p>
        </section>
      )
    }
    return null
  }

  return (
    <section className="home-section">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold mb-1">Word Cloud</p>
        <h2 className="text-2xl font-bold text-brown">文献关联词云</h2>
        <p className="text-sm text-ink-soft mt-1">基于史料关联网络的重量级关键词。字号越大，关联文献越多。点击词语进行检索。</p>
      </div>
      <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
        <WordCloud
          words={words}
          maxWeight={maxWeight}
          width={800}
          height={500}
          onWordClick={handleWordClick}
        />
      </div>
    </section>
  )
}
