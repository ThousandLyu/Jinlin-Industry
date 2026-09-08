'use client'

import { useEffect, useState } from 'react'

export function useTypewriterText(text: string, options?: { enabled?: boolean; intervalMs?: number; step?: number }) {
  const enabled = options?.enabled ?? true
  const intervalMs = options?.intervalMs ?? 18
  const step = options?.step ?? 1
  const [visibleText, setVisibleText] = useState(enabled ? '' : text)

  useEffect(() => {
    if (!enabled) {
      setVisibleText(text)
      return
    }

    setVisibleText(current => {
      if (!text.startsWith(current)) return ''
      return current.slice(0, text.length)
    })
  }, [enabled, text])

  useEffect(() => {
    if (!enabled || visibleText.length >= text.length) return
    const timer = window.setTimeout(() => {
      setVisibleText(text.slice(0, Math.min(text.length, visibleText.length + step)))
    }, intervalMs)
    return () => window.clearTimeout(timer)
  }, [enabled, intervalMs, step, text, visibleText])

  return {
    text: visibleText,
    done: visibleText.length >= text.length,
  }
}
