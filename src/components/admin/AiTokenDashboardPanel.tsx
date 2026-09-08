'use client'

import { useEffect, useMemo, useState } from 'react'

const TARGET_TYPE_LABELS: Record<string, string> = {
  source: '史料',
  submission: '投稿',
  person: '人物',
  site: '遗址',
  fact: '史实',
}
function targetTypeLabel(t: string) { return TARGET_TYPE_LABELS[t] || t }

type AiToken = {
  id: string
  targetType: string
  targetId: string
  summary: string
  keywords: string[]
  entities: string[]
  tags: string[]
  traits: string[]
  category: string
  confidenceScore?: number
  isCredible?: boolean
  doubts: string[]
  errorPositions: string[]
  relatedTargetIds: string[]
  sourceIds: string[]
  status: 'active' | 'pending' | 'failed' | 'archived'
  manualOverride: boolean
  modelProvider: string
  modelName: string
  updatedAt?: string
}

export default function AiTokenDashboardPanel({ initialItems }: { initialItems: AiToken[] }) {
  const [items, setItems] = useState<AiToken[]>(initialItems)
  const [edit, setEdit] = useState<AiToken | null>(null)
  const [q, setQ] = useState('')
  const [targetType, setTargetType] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (targetType) params.set('targetType', targetType)
    const res = await fetch(`/api/ai-tokens?${params.toString()}`)
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    if (initialItems.length === 0) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    const updated = items
      .map(item => item.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1)
    return {
      total: items.length,
      pending: items.filter(item => item.status === 'pending').length,
      failed: items.filter(item => item.status === 'failed').length,
      manual: items.filter(item => item.manualOverride).length,
      updated,
    }
  }, [items])

  const save = async () => {
    if (!edit) return
    const res = await fetch('/api/ai-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: edit.id, data: edit }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setMessage(data.message || '保存失败')
      return
    }
    setEdit(null)
    setMessage('aiToken 已保存为人工覆盖')
    await load()
  }

  const rebuild = async (item: AiToken) => {
    setMessage('正在重建 aiToken...')
    const res = await fetch('/api/ai-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rebuild', targetType: item.targetType, targetId: item.targetId }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setMessage(data.message || '重建失败')
      return
    }
    setMessage('aiToken 已重建')
    await load()
  }

  const remove = async (item: AiToken) => {
    if (!confirm('确认删除这条 aiToken？')) return
    await fetch('/api/ai-tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    await load()
  }

  return (
    <section id="ai-tokens" className="admin-panel overflow-hidden">
      <div className="border-b border-[#E8DCC8] p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-page-kicker">AI DATA LAYER</p>
            <h2 className="text-xl font-bold text-[#4A3728]">AI 数据层</h2>
            <p className="mt-1 text-sm text-gray-500">aiToken 只在后台可见，用于检索增强、投稿校验和史料抽象。</p>
          </div>
          <p className="text-xs text-gray-500">最近更新：{formatDate(stats.updated)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
        <Stat label="aiToken 总数" value={stats.total} />
        <Stat label="待重建" value={stats.pending} />
        <Stat label="失败" value={stats.failed} />
        <Stat label="人工覆盖" value={stats.manual} />
      </div>

      <div className="border-y border-[#E8DCC8] bg-[#F5F0E8]/50 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input value={q} onChange={event => setQ(event.target.value)} placeholder="搜索摘要、关键词、实体或目标 ID..."
            className="admin-control" />
          <select value={targetType} onChange={event => setTargetType(event.target.value)}
            className="admin-control">
            <option value="">全部类型</option>
            <option value="source">史料</option>
            <option value="submission">投稿</option>
            <option value="person">人物</option>
            <option value="site">遗址</option>
            <option value="fact">史实</option>
          </select>
          <button onClick={load} disabled={loading} className="admin-button admin-button-primary">
            {loading ? '检索中...' : '检索'}
          </button>
        </div>
      </div>

      {message && <div className="mx-5 mt-4 rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] px-4 py-2 text-sm text-[#4A3728]">{message}</div>}

      <div className="p-5">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>目标</th>
                <th>摘要</th>
                <th>关键词/实体</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无 aiToken</td></tr>
              ) : items.slice(0, 20).map(item => (
                <tr key={item.id}>
                  <td>
                    <p className="font-semibold text-[#4A3728]">{targetTypeLabel(item.targetType)}</p>
                    <p className="mt-1 max-w-[160px] truncate text-xs text-gray-500" title={item.targetId}>{item.targetId}</p>
                  </td>
                  <td className="max-w-md text-gray-700">
                    <p className="line-clamp-3 leading-6">{item.summary || '缺失'}</p>
                    {item.category && <p className="mt-2 text-xs text-gray-400">分类：{item.category}</p>}
                  </td>
                  <td>
                    <ChipLine items={item.keywords} empty="无关键词" />
                    <div className="mt-2"><ChipLine items={item.entities} empty="无实体" tone="blue" /></div>
                  </td>
                  <td className="text-xs text-gray-500">
                    <span className={item.status === 'failed' ? 'admin-chip-danger' : item.manualOverride ? 'admin-chip-accent' : 'admin-chip-muted'}>
                      {item.manualOverride ? '人工覆盖' : item.status}
                    </span>
                    <p className="mt-2 max-w-[140px] truncate" title={item.modelName}>{item.modelProvider || 'none'}｜{item.modelName || '-'}</p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setEdit(item)} className="text-blue-700 hover:text-blue-900">编辑</button>
                      <button onClick={() => rebuild(item)} className="text-[#8B1A2B] hover:text-[#5F101B]">重建</button>
                      <button onClick={() => remove(item)} className="text-gray-500 hover:text-red-700">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length > 20 && <p className="mt-3 text-xs text-gray-500">当前仅展示前 20 条，可使用检索缩小范围。</p>}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setEdit(null)}>
          <div className="admin-modal-card max-w-3xl p-6" onClick={event => event.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#4A3728]">编辑 aiToken</h2>
            <p className="mt-1 text-xs text-gray-500">{targetTypeLabel(edit.targetType)}｜{edit.targetId}</p>
            <div className="mt-5 grid gap-4">
              <TextArea label="摘要" value={edit.summary} rows={5} onChange={value => setEdit({...edit, summary: value})} />
              <TextInput label="分类" value={edit.category} onChange={value => setEdit({...edit, category: value})} />
              <TextArea label="关键词（逗号或换行分隔）" value={(edit.keywords || []).join('\n')} onChange={value => setEdit({...edit, keywords: splitLines(value)})} />
              <TextArea label="实体（逗号或换行分隔）" value={(edit.entities || []).join('\n')} onChange={value => setEdit({...edit, entities: splitLines(value)})} />
              <TextArea label="标签" value={(edit.tags || []).join('\n')} onChange={value => setEdit({...edit, tags: splitLines(value)})} />
              <TextArea label="人物性格/特征" value={(edit.traits || []).join('\n')} onChange={value => setEdit({...edit, traits: splitLines(value)})} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEdit(null)} className="admin-button admin-button-outline">取消</button>
              <button onClick={save} className="admin-button admin-button-primary">保存人工覆盖</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-stat-card">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#4A3728]">{value}</p>
    </div>
  )
}

function ChipLine({ items, empty, tone = 'gold' }: { items?: string[]; empty: string; tone?: 'gold' | 'blue' }) {
  const color = tone === 'blue' ? 'admin-chip-muted' : 'admin-chip-accent'
  const clean = (items || []).filter(s => s && s !== '[object Object]')
  if (clean.length === 0) return <span className="text-xs text-gray-400">{empty}</span>
  return (
    <div className="flex max-w-xs flex-wrap gap-1">
      {clean.slice(0, 6).map(item => <span key={item} className={color}>{item}</span>)}
    </div>
  )
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input value={value || ''} onChange={event => onChange(event.target.value)}
        className="admin-control w-full" />
    </label>
  )
}

function TextArea({ label, value, rows = 3, onChange }: { label: string; value: string; rows?: number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea rows={rows} value={value || ''} onChange={event => onChange(event.target.value)}
        className="admin-control w-full" />
    </label>
  )
}

function splitLines(value: string) {
  return value.split(/[，,、\n]/).map(item => item.trim()).filter(Boolean)
}

function formatDate(value?: string) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN')
}
