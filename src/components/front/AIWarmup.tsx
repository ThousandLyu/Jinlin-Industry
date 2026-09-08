'use client'

import { useEffect } from 'react'

const CACHE_KEY = 'jinling-ai-warmup-at'
const CACHE_TTL = 60_000

export default function AIWarmup() {
  useEffect(() => {
    const last = Number(window.localStorage.getItem(CACHE_KEY) || 0)
    if (Date.now() - last < CACHE_TTL) return

    const run = () => {
      window.localStorage.setItem(CACHE_KEY, String(Date.now()))
      fetch('/api/ai/status?probe=1', {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {
        window.localStorage.removeItem(CACHE_KEY)
      })
    }

    const idle = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof idle.requestIdleCallback === 'function') {
      const id = idle.requestIdleCallback(run, { timeout: 2000 })
      return () => idle.cancelIdleCallback?.(id)
    }

    const timer = setTimeout(run, 800)
    return () => clearTimeout(timer)
  }, [])

  return null
}
