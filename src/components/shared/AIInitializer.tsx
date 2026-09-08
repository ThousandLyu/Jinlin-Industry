'use client'

import { useEffect, useState } from 'react'

const CACHE_KEY = 'jinling-ai-warmup-at'
const CACHE_TTL = 60_000

interface Props {
  /** 是否显示后台面板（含队列进度） */
  showPanel?: boolean
}

export default function AIInitializer({ showPanel = false }: Props) {
  const [aiStatus, setAiStatus] = useState<'idle' | 'checking' | 'ready' | 'unavailable'>('idle')
  const [queueStatus, setQueueStatus] = useState<{ pending: number; done: number; failed: number } | null>(null)

  useEffect(() => {
    const last = Number(window.localStorage.getItem(CACHE_KEY) || 0)
    if (Date.now() - last < CACHE_TTL) {
      setAiStatus('ready')
      return
    }

    const probe = async () => {
      setAiStatus('checking')
      try {
        const res = await fetch('/api/ai/status?probe=1', { cache: 'no-store' })
        const data = await res.json()
        if (data.ready) {
          window.localStorage.setItem(CACHE_KEY, String(Date.now()))
          setAiStatus('ready')
          // 后台异步触发队列
          fetch('/api/ai/queue', { method: 'POST', cache: 'no-store' }).catch(() => {})
        } else {
          setAiStatus('unavailable')
        }
      } catch {
        setAiStatus('unavailable')
      }
    }

    const idle = (window as any).requestIdleCallback
    if (typeof idle === 'function') {
      const id = idle(probe, { timeout: 2000 })
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const timer = setTimeout(probe, 800)
    return () => clearTimeout(timer)
  }, [])

  // 轮询队列状态（仅后台面板需要）
  useEffect(() => {
    if (!showPanel || aiStatus !== 'ready') return
    const poll = async () => {
      try {
        const res = await fetch('/api/ai/queue', { cache: 'no-store' })
        const data = await res.json()
        if (data.success) setQueueStatus({ pending: data.pending, done: data.done, failed: data.failed })
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [showPanel, aiStatus])

  if (!showPanel) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${aiStatus === 'ready' ? 'bg-green-500' : aiStatus === 'checking' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`} />
        <span className="text-gray-700 font-medium">
          {aiStatus === 'ready' ? 'AI 就绪' : aiStatus === 'checking' ? 'AI 检测中...' : 'AI 未连接'}
        </span>
      </div>
      {queueStatus && (
        <div className="text-gray-500 text-xs">
          待处理: {queueStatus.pending} | 已完成: {queueStatus.done}
          {queueStatus.pending > 0 && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
              <div className="bg-amber-500 h-1 rounded-full transition-all" style={{ width: `${queueStatus.pending > 0 ? Math.max(10, (queueStatus.done / (queueStatus.done + queueStatus.pending || 1)) * 100) : 0}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
