'use client'

import { FormEvent, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const KNOWLEDGE = [
  '史料库按 A/B/C 标注可信等级，便于核验引用。',
  'AI 整理出的时间轴事件会先进入后台待审核。',
  '地图点位支持底图定位，前台只展示经纬度状态。',
  '未接入 AI 时，我只展示史料库知识，不生成对话。',
]

export default function DigitalHuman() {
  const pathname = usePathname()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setIndex(value => (value + 1) % KNOWLEDGE.length), 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setOpen(false)
    setQuery('')
    setMessage('')
  }, [pathname])

  if (pathname?.startsWith('/admin')) return null

  const openDialog = () => {
    setOpen(true)
    setMessage('')
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setMessage('请先输入想查询的内容。')
      return
    }

    setMessage('正在为您检索，请稍等。')
    window.setTimeout(() => {
      setOpen(false)
      setQuery('')
      setMessage('')
      router.push(`/search?q=${encodeURIComponent(value)}`)
    }, 260)
  }

  return (
    <aside className="pointer-events-none fixed bottom-16 right-4 z-40 hidden w-72 sm:block">
      <div className="digital-human-float pointer-events-auto flex items-end gap-3">
        <div className="min-w-0 flex-1 rounded-2xl border border-[#E8DCC8] bg-white/95 p-3 text-xs leading-6 text-[#4A3728] shadow-xl backdrop-blur">
          <p className="mb-1 font-semibold text-[#8B1A2B]">史料助手</p>
          {open ? (
            <form onSubmit={submitSearch}>
              <p>{message || '您好，请问有什么可以帮您的吗？'}</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={query}
                  onChange={event => { setQuery(event.target.value); if (message) setMessage('') }}
                  placeholder="输入搜索内容…"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#E8DCC8] bg-white px-3 text-xs outline-none focus:border-[#C49A2B]"
                />
                <button type="submit" className="h-9 rounded-lg bg-[#8B1A2B] px-3 text-xs font-semibold text-white transition hover:bg-[#6F1422]">
                  发送
                </button>
              </div>
            </form>
          ) : (
            <p>{KNOWLEDGE[index]}</p>
          )}
        </div>
        <button
          type="button"
          onClick={openDialog}
          className="relative h-20 w-16 shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A2B]"
          aria-label="打开史料助手对话"
        >
          <div className="absolute bottom-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-[40%_40%_45%_45%] border border-[#8B6A1B]/20 bg-[#C49A2B]/20 shadow-lg" />
          <div className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-full border border-[#8B6A1B]/30 bg-[#F5F0E8] shadow">
            <span className="absolute left-3 top-5 h-1.5 w-1.5 rounded-full bg-[#4A3728]" />
            <span className="absolute right-3 top-5 h-1.5 w-1.5 rounded-full bg-[#4A3728]" />
            <span className="absolute bottom-3 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-[#8B1A2B]/60" />
          </div>
          <div className="absolute left-1/2 top-1 h-3 w-8 -translate-x-1/2 rounded-full bg-[#4A3728]" />
        </button>
      </div>
    </aside>
  )
}
