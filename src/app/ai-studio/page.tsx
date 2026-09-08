'use client'

import { useState } from 'react'
import EmptyState from '@/components/shared/EmptyState'
import { parseLooseJsonObject } from '@/lib/jsonUtils'
import { useTypewriterText } from '@/hooks/useTypewriterText'

const styles = [
  { value: '民国报刊短评', label: '民国报刊短评' },
  { value: '展厅导览词', label: '展厅导览词' },
  { value: '少年读本', label: '少年读本' },
  { value: '诗性散文', label: '诗性散文' },
  { value: '展陈讲解卡', label: '展陈讲解卡' },
]

type StudioResult = {
  success?: boolean
  title?: string
  content?: string
  references?: string
  sources?: Array<{ id: string; title: string; grade: string; fileType: string }>
  message?: string
}

function normalizeStudioResult(value: any, fallbackTitle: string): StudioResult {
  const result: StudioResult = { ...value }
  let content = String(result.content || '').trim()

  for (let i = 0; i < 3; i += 1) {
    const parsed = parseLooseJsonObject(content)
    if (!parsed || (!parsed.content && !parsed.title && !parsed.summary)) break
    result.title = String(parsed.title || result.title || fallbackTitle)
    content = String(parsed.content || parsed.summary || content)
    result.references = String(parsed.references || result.references || '')
  }

  result.title = String(result.title || fallbackTitle)
  result.content = content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  result.references = String(result.references || '').trim()
  return result
}

export default function AIStudioPage() {
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState('展厅导览词')
  const [customStyle, setCustomStyle] = useState('')
  const [length, setLength] = useState('约 400 字')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<any>(null)
  const typedContent = useTypewriterText(result?.content || '', { enabled: Boolean(result?.content), intervalMs: 18, step: 2 })
  const activeStyle = customStyle.trim() || style

  const generate = async () => {
    if (!topic.trim()) { setMessage('请先输入主题'); return }
    setLoading(true)
    setMessage('')
    setResult(null)
    try {
      const res = await fetch('/api/ai-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, targetType: '关键词', style: activeStyle, length }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.message || '生成失败')
        setResult(normalizeStudioResult(data, topic))
      } else {
        setResult(normalizeStudioResult(data, topic))
      }
    } catch {
      setMessage('请求失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-hero text-center">
        <div className="mx-auto max-w-4xl">
          <p className="content-hero-kicker">AI STUDIO</p>
          <h1 className="content-hero-title">工脉文笺</h1>
          <p className="content-hero-desc mx-auto max-w-none whitespace-nowrap text-center">
            把史料库中的企业、人物与事件转化为带引用的公众文本，适合展厅导览、研学课堂和专题传播。
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <section className="content-panel p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#4A3728]">主题</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4}
                placeholder="例如：范旭东与永利铔厂、金陵机器制造局的工业记忆"
                className="content-input min-h-0 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#4A3728]">风格</label>
              <div className="grid grid-cols-1 gap-2">
                {styles.map(item => (
                  <button key={item.value} onClick={() => { setStyle(item.value); setCustomStyle('') }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${!customStyle.trim() && style === item.value ? 'border-[#8B1A2B] bg-[#8B1A2B] text-white' : 'border-[#E8DCC8] bg-white text-[#4A3728] hover:bg-[#F5F0E8]'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <input
                value={customStyle}
                onChange={e => setCustomStyle(e.target.value)}
                placeholder="自定义风格，例如：口述史访谈、城市漫游札记"
                className="content-input mt-2 min-h-0 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#4A3728]">篇幅</label>
              <select value={length} onChange={e => setLength(e.target.value)}
                className="content-input min-h-0 py-2">
                <option>约 200 字</option>
                <option>约 400 字</option>
                <option>约 800 字</option>
              </select>
            </div>
            <button onClick={generate} disabled={loading}
              className="content-button content-button-primary w-full disabled:opacity-50">
              {loading ? '生成中...' : '生成文笺'}
            </button>
            {message && <p className="rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] px-3 py-2 text-sm text-[#8B1A2B]">{message}</p>}
          </div>
        </section>

        <section className="content-panel min-h-[560px] overflow-hidden p-0">
          {!result ? (
            <div className="flex min-h-[560px] items-center justify-center p-6">
              <EmptyState title="等待生成" description="生成结果会带史料引用和参考文献，方便复制到展陈文案或课程讲稿。" />
            </div>
          ) : (
            <div>
              <div className="border-b border-[#D8C6A5] bg-[#4A3728] px-6 py-5 text-white">
                  <p className="text-xs font-semibold tracking-[0.28em] text-[#D9B35A]">{activeStyle}</p>
                <h2 className="mt-2 text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>{result.title || topic}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#F5F0E8]/80">
                  <span className="rounded-full border border-white/15 px-3 py-1">{length}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">{result.sources?.length || 0} 条史料线索</span>
                </div>
              </div>
              <div className="p-6">
                {result.content ? (
                  <div className="content-copy h-56 overflow-y-auto rounded-lg border border-[#E8DCC8] bg-white px-4 py-3 text-[15px] leading-8">
                    <span className="whitespace-pre-wrap">
                      {typedContent.text}
                      {!typedContent.done && <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse bg-[#C49A2B]" />}
                    </span>
                  </div>
                ) : (
                  <EmptyState title="暂未生成正文" description="AI 未启用或没有返回正文时，会在这里显示可检索到的史料线索。" />
                )}
                {result.references && (
                  <div className="mt-6 rounded-lg border border-[#E8DCC8] bg-[#F5F0E8] p-4">
                    <h3 className="mb-2 text-sm font-bold text-[#4A3728]">参考文献</h3>
                    <div className="whitespace-pre-wrap text-xs leading-6 text-gray-700">{result.references}</div>
                  </div>
                )}
                {(result.sources?.length || 0) > 0 && (
                  <div className="mt-5 grid gap-2">
                    {result.sources.map((source: any, index: number) => (
                      <div key={source.id} className="rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-xs text-gray-600">
                        <span className="font-semibold text-[#4A3728]">S{index + 1}. {source.title}</span>
                        <span className="ml-2">{source.grade}级 · {source.fileType}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.message && !result.success && (
                  <div className="mt-5 rounded-lg border border-[#8B1A2B]/20 bg-[#8B1A2B]/10 px-3 py-2 text-sm text-[#8B1A2B]">
                    {result.message}
                  </div>
                )}
                </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
