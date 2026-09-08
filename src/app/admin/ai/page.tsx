'use client'

import { useEffect, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'

interface SourceHit {
  id: string
  title: string
  grade: string
  fileType: string
  fileName: string
  fileUrl: string
  importedBy: string
  importedAt: string
  score: number
  snippet: string
}

interface AskResponse {
  enabled: boolean
  answer?: string
  message?: string
  sources?: SourceHit[]
}

export default function AdminAIPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AskResponse | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<{ enabled: boolean; ready?: boolean; model?: string; baseUrl?: string; checkedAt?: string; latencyMs?: number; success?: boolean; message?: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/ai/status?probe=1')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ enabled: false, success: false, message: 'AI 状态检测失败', checkedAt: new Date().toISOString() })
    }
  }

  useEffect(() => {
    loadStatus()
    const timer = window.setInterval(loadStatus, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const ask = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask', text: question, limit: 6 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || '请求失败')
      } else {
        setResult(data)
      }
    } catch {
      setError('请求失败，请确认服务正在运行')
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' }),
      })
      const data = await res.json()
      setStatus(data)
      setTestResult(data.result || data.message || (data.success ? '连接测试完成' : '连接测试失败'))
    } catch {
      setTestResult('连接测试失败，请确认服务地址和模型配置。')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="admin-workspace max-w-5xl">
      <AdminPageHeader
        title="史料问答"
        description="用于测试史料库检索、AI 引用回答和后端模型连接。AI 未启用时不会生成对话回答。"
        actions={
          <button onClick={testConnection} disabled={testing} className="admin-button admin-button-outline">
            {testing ? '测试中...' : '测试连接'}
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="admin-panel p-4 md:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">当前 AI 状态</p>
              <p className="mt-1 text-xl font-semibold text-[#4A3728]">
                {status?.ready ? '已连接' : status?.enabled ? '已启用，待连接' : status?.success === false ? '请求失败' : '未启用'}
                {status?.model ? ` · ${status.model}` : ''}
              </p>
              {status?.baseUrl && <p className="mt-1 text-xs text-gray-400">{status.baseUrl}</p>}
              {status?.message && <p className="mt-2 text-xs text-gray-500">{status.message}</p>}
            </div>
            <div className="rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] px-3 py-2 text-xs text-gray-500">
              <p>每分钟自动刷新</p>
              <p>最近检测：{status?.checkedAt ? formatDate(status.checkedAt) : '-'}</p>
              {status?.latencyMs != null && <p>延迟：{status.latencyMs} ms</p>}
            </div>
          </div>
          {testResult && <p className="mt-3 rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#4A3728]">{testResult}</p>}
        </div>
        <div className="admin-panel p-4">
          <p className="text-sm font-semibold text-[#4A3728]">史料库可检索知识</p>
          <ul className="mt-2 space-y-1 text-xs leading-6 text-gray-600">
            <li>A/B/C 可信等级</li>
            <li>导入文件、题名、摘要</li>
            <li>时间轴与史实引用线索</li>
          </ul>
        </div>
      </div>

      <div className="admin-panel p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">问题</label>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          placeholder="例如：金陵机器制造局有哪些可核验史料？"
          className="admin-control w-full"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="admin-button admin-button-accent"
          >
            {loading ? '检索并回答中...' : '检索史料并回答'}
          </button>
          <button
            onClick={() => { setQuestion(''); setResult(null); setError('') }}
            className="admin-button admin-button-outline"
          >
            清空
          </button>
        </div>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {result?.message && (
        <div className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {result.message}
        </div>
      )}

      {result?.enabled === false && (
        <div className="mb-5 rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] p-5 text-sm text-gray-700">
          <p className="font-semibold text-[#4A3728]">AI 未启用，已停止对话生成。</p>
          <p className="mt-2 leading-6">当前页面只展示史料库检索结果和配置提示；接入模型并通过连接测试后，才会在这里输出带引用的回答。</p>
        </div>
      )}

      {result?.enabled !== false && result?.answer && (
        <div className="admin-panel p-5">
          <h2 className="font-bold text-lg mb-3">回答</h2>
          <div className="whitespace-pre-wrap leading-7 text-gray-800">{result.answer}</div>
        </div>
      )}

      {result?.sources && (
        <div className="admin-table-wrap">
          <div className="p-4 border-b border-[#E8DCC8]">
            <h2 className="font-bold">命中史料</h2>
          </div>
          {result.sources.length === 0 ? (
            <p className="p-5 text-gray-400">没有检索到相关史料</p>
          ) : (
            <div className="divide-y divide-[#E8DCC8]">
              {result.sources.map((source, index) => (
                <div key={source.id} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-[#4A3728]">S{index + 1}. {source.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {source.grade}级 · {typeLabel(source.fileType)} · {formatDate(source.importedAt)} · {source.importedBy || '未知导入人'}
                      </p>
                    </div>
                    {source.fileUrl && (
                      <a href={source.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                        查看文件
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-3 leading-6">{source.snippet || '暂无摘录'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    image: '图片',
    article: '文章',
    map: '地图',
    spreadsheet: '表格',
    audio: '音频',
    video: '视频',
    archive: '档案',
    journal: '文章',
    book: '书籍',
    newspaper: '报刊',
    website: '网站',
    oral: '口述',
    other: '其他',
  }
  return map[type] || type || '其他'
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
