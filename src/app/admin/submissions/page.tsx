'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'

type Submission = {
  id: string
  name: string
  contact: string
  title: string
  content: string
  source: string
  fileUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  adminNote?: string
  convertedSourceId?: string
  aiReviewStatus?: 'pending' | 'success' | 'failed'
  aiReviewSummary?: string
  aiKeywords?: string[]
  aiEntities?: string[]
  confidenceScore?: number
  isCredible?: boolean
  doubts?: string[]
  errorPositions?: string[]
  aiReviewUpdatedAt?: string
  createdAt?: string
  isDeleted?: boolean
}

export default function AdminSubmissionsPage() {
  const [items, setItems] = useState<Submission[]>([])
  const [edit, setEdit] = useState<Submission | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [savingReview, setSavingReview] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=sourceSubmissions')
    const data = await res.json()
    setItems(data.filter((item: Submission) => !item.isDeleted))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items
    return items.filter(item => [item.name, item.contact, item.title, item.content, item.source, item.status].some(value => String(value || '').toLowerCase().includes(keyword)))
  }, [items, search])

  const saveSubmission = async (item: Submission, closeAfterSave = true) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sourceSubmissions', id: item.id, data: item }),
    })
    if (res.ok) {
      if (closeAfterSave) setEdit(null)
      load()
    }
  }

  const saveReviewPanel = async () => {
    if (!edit) return
    setSavingReview(true)
    await saveSubmission(edit, false)
    setSavingReview(false)
    setMessage('AI 审核字段已保存')
    setTimeout(() => setMessage(''), 3000)
  }

  const reviewWithAI = async (item: Submission) => {
    setMessage('AI 正在校验投稿...')
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submission_review', id: item.id }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setMessage(data.message || data.error || 'AI 校验失败，请检查模型配置')
      return
    }
    setEdit(data.item)
    await load()
    setMessage('AI 校验已更新')
    setTimeout(() => setMessage(''), 3000)
  }

  const convertToSource = async (item: Submission) => {
    const sourceRes = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'sources',
        data: {
          title: item.title,
          type: 'archive',
          author: item.name,
          publisher: '',
          publishDate: '',
          url: '',
          fileUrl: item.fileUrl || '',
          description: `${item.content}\n\n来源：${item.source}\n联系方式：${item.contact}`,
          category: '投稿史料',
          credibilityLevel: 'C',
          fileType: 'document',
          importedBy: item.name,
          importedAt: new Date().toISOString(),
        },
      }),
    })
    const source = await sourceRes.json()
    if (!sourceRes.ok) {
      setMessage(source.error || '转入史料失败')
      return
    }
    await saveSubmission({ ...item, status: 'approved', convertedSourceId: source.id })
    setMessage('已转入史料库管理')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="admin-workspace">
      <AdminPageHeader
        title="史料投稿"
        description="公众投稿会先进入待审核队列，审核后可转入正式史料库。"
      />
      {message && <div className="rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] px-4 py-2 text-sm text-[#4A3728]">{message}</div>}
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索投稿人、联系方式、标题、内容或状态..."
        className="admin-control w-full" />

      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="p-3 text-left">标题</th>
                <th className="p-3 text-left">投稿人</th>
                <th className="p-3 text-left">状态</th>
                <th className="p-3 text-left">提交时间</th>
                <th className="p-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="p-3 font-medium max-w-[150px] truncate" title={item.title}>{item.title}</td>
                  <td className="p-3 text-gray-600 max-w-[140px] truncate" title={`${item.name} · ${item.contact}`}>{item.name} · {item.contact}</td>
                  <td className="p-3"><StatusBadge status={item.status} /></td>
                  <td className="p-3 text-gray-500">{formatDate(item.createdAt)}</td>
                  <td className="p-3">
                    <button onClick={() => setEdit(item)} className="text-[#8B1A2B] hover:text-[#4A3728]">查看处理</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-8 text-center text-gray-400">暂无投稿</p>}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setEdit(null)}>
          <div className="admin-modal-card max-w-5xl p-0" onClick={event => event.stopPropagation()}>
            <div className="border-b border-[#E8DCC8] bg-[#4A3728] px-6 py-5 text-white">
              <p className="text-xs font-semibold tracking-[0.24em] text-[#D9B35A]">SUBMISSION REVIEW</p>
              <h2 className="mt-2 text-xl font-bold">处理投稿</h2>
            </div>
            <div className="grid max-h-[78vh] gap-5 overflow-y-auto p-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3 text-sm">
                <Info label="投稿人" value={`${edit.name} · ${edit.contact}`} />
                <Info label="史料标题" value={edit.title} />
                <Info label="具体史料" value={edit.content} multiline />
                <Info label="来源说明" value={edit.source} multiline />
                {edit.fileUrl && <a href={edit.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-600 hover:text-blue-800">打开附件链接</a>}
                <label className="block">
                  <span className="mb-1 block font-medium text-gray-700">处理状态</span>
                  <select value={edit.status} onChange={event => setEdit({...edit, status: event.target.value as Submission['status']})}
                    className="admin-control w-full">
                    <option value="pending">待审核</option>
                    <option value="approved">已采纳</option>
                    <option value="rejected">已驳回</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-medium text-gray-700">管理员备注</span>
                  <textarea rows={3} value={edit.adminNote || ''} onChange={event => setEdit({...edit, adminNote: event.target.value})}
                    className="admin-control w-full" />
                </label>
              </div>
              <AIReviewPanel
                item={edit}
                saving={savingReview}
                onReview={() => reviewWithAI(edit)}
                onSave={saveReviewPanel}
                onChange={next => setEdit(next)}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#E8DCC8] px-6 py-4">
              <button onClick={() => setEdit(null)} className="admin-button admin-button-outline">取消</button>
              <button onClick={() => saveSubmission(edit)} className="admin-button admin-button-primary">保存状态</button>
              <button onClick={() => convertToSource(edit)} disabled={Boolean(edit.convertedSourceId)}
                className="admin-button admin-button-accent">
                {edit.convertedSourceId ? '已转入史料' : '采纳并转入史料'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AIReviewPanel({
  item,
  saving,
  onReview,
  onSave,
  onChange,
}: {
  item: Submission
  saving: boolean
  onReview: () => void
  onSave: () => void
  onChange: (item: Submission) => void
}) {
  const hasResult = item.aiReviewStatus === 'success'
  const update = (patch: Partial<Submission>) => onChange({ ...item, ...patch })
  return (
    <div className="rounded-lg border border-[#E8DCC8] bg-[#FDFBF7] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-[#4A3728]">AI 校验辅助</p>
          <p className="text-xs text-gray-500">仅供人工审核参考，不会自动采纳投稿。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onReview} className="admin-button admin-button-outline min-h-8 px-3 text-xs">
            {hasResult ? '重新校验' : 'AI 校验'}
          </button>
          <button onClick={onSave} disabled={saving} className="admin-button admin-button-primary min-h-8 px-3 text-xs disabled:opacity-50">
            {saving ? '保存中...' : '保存审核字段'}
          </button>
        </div>
      </div>
      {!hasResult ? (
        <p className="text-sm text-gray-500">
          {item.aiReviewStatus === 'failed' ? '上次 AI 校验失败，请检查模型配置后重试。' : '尚未生成 AI 校验结果。'}
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="rounded-lg border border-[#E8DCC8] bg-white p-3">
              <span className="mb-1 block text-xs font-semibold text-[#7C6A5A]">置信度</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={typeof item.confidenceScore === 'number' ? formatConfidence(item.confidenceScore) : ''}
                onChange={event => update({ confidenceScore: Number(event.target.value) })}
                className="admin-control w-full"
              />
            </label>
            <label className="rounded-lg border border-[#E8DCC8] bg-white p-3">
              <span className="mb-1 block text-xs font-semibold text-[#7C6A5A]">可信判断</span>
              <select value={item.isCredible ? 'true' : 'false'} onChange={event => update({ isCredible: event.target.value === 'true' })}
                className="admin-control w-full">
                <option value="true">倾向可信</option>
                <option value="false">需重点核验</option>
              </select>
            </label>
          </div>
          <EditableTextArea label="摘要" value={item.aiReviewSummary || ''} rows={3} onChange={value => update({ aiReviewSummary: value })} />
          <EditableTextArea label="关键词" value={(item.aiKeywords || []).join('、')} rows={2} hint="使用顿号、逗号或换行分隔" onChange={value => update({ aiKeywords: splitList(value) })} />
          <EditableTextArea label="实体" value={(item.aiEntities || []).join('、')} rows={2} hint="人物、企业、地点、机构等" onChange={value => update({ aiEntities: splitList(value) })} />
          <EditableTextArea label="疑点分析" value={(item.doubts || []).join('\n')} rows={4} hint="每行一个疑点" onChange={value => update({ doubts: splitLines(value) })} />
          <EditableTextArea label="错误位置提示" value={(item.errorPositions || []).join('\n')} rows={3} hint="每行一个位置或原文片段" onChange={value => update({ errorPositions: splitLines(value) })} />
        </div>
      )}
    </div>
  )
}

function EditableTextArea({ label, value, rows, hint, onChange }: { label: string; value: string; rows: number; hint?: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-lg border border-[#E8DCC8] bg-white p-3">
      <span className="mb-1 block text-xs font-semibold text-[#7C6A5A]">{label}</span>
      <textarea rows={rows} value={value} onChange={event => onChange(event.target.value)}
        className="admin-control w-full resize-y" />
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

function splitList(value: string) {
  return value.split(/[，,、\n]/).map(item => item.trim()).filter(Boolean)
}

function splitLines(value: string) {
  return value.split(/\n/).map(item => item.trim()).filter(Boolean)
}

function StatusBadge({ status }: { status: Submission['status'] }) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const label = status === 'approved' ? '已采纳' : status === 'rejected' ? '已驳回' : '待审核'
  return <span className={`rounded-lg px-2 py-1 text-xs ${map[status]}`}>{label}</span>
}

function Info({ label, value, multiline = false }: { label: string; value?: string; multiline?: boolean }) {
  return (
    <div>
      <p className="font-medium text-gray-700">{label}</p>
      <p className={`${multiline ? 'whitespace-pre-wrap leading-6' : ''} text-gray-600`}>{value || '-'}</p>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN')
}

function formatConfidence(value: number) {
  const score = value > 1 ? value / 100 : value
  return Math.max(0, Math.min(1, score)).toFixed(2)
}
