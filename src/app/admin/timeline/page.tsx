'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import Pagination from '@/components/shared/Pagination'
import { reviewLabel } from '@/lib/statusLabels'

export default function AdminTimelinePage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [organizing, setOrganizing] = useState(false)
  const [organizeMessage, setOrganizeMessage] = useState('')
  const [sortField, setSortField] = useState('year')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=timeline')
    const data = await res.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const handleSave = async (form: any) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'timeline', data: normalizeTimelineForm(form), id: edit?.id }),
    })
    if (res.ok) {
      setShowForm(false)
      setEdit(null)
      load()
    }
  }

  const handleQuickUpdate = async (item: any, data: any) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'timeline', id: item.id, data: { ...item, ...data } }),
    })
    load()
  }

  const handleOrganize = async () => {
    setOrganizing(true)
    setOrganizeMessage('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'organize_timeline' }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) {
        setOrganizeMessage(data.message || data.error || 'AI 整理未完成')
      } else {
        setOrganizeMessage(`已生成 ${data.created?.length || 0} 条待审事件，跳过 ${data.skipped || 0} 条重复候选。`)
        load()
      }
    } catch {
      setOrganizeMessage('AI 整理请求失败，请确认后端服务可用。')
    } finally {
      setOrganizing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'timeline', id }),
    })
    setShowForm(false)
    setEdit(null)
    load()
  }

  const sortArrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))] as string[], [items])

  const filtered = useMemo(() => {
    let list = items.filter(i => {
      if (!search) return true
      return i.title?.includes(search) || i.description?.includes(search) || i.category?.includes(search) || String(i.year).includes(search)
    })
    if (categoryFilter) list = list.filter(i => i.category === categoryFilter)
    list = [...list].sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv), 'zh-CN') : av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [items, search, categoryFilter, sortField, sortDir])

  const pendingAI = items.filter(i => i.generatedByAI && (i.reviewStatus || 'pending') === 'pending').length
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const Th = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="p-3 text-left cursor-pointer select-none hover:text-[#C49A2B]" onClick={() => handleSort(field)}>
      {children}{sortArrow(field)}
    </th>
  )

  return (
    <div>
      <AdminPageHeader
        title="时间轴管理"
        description={`维护工业史事件。AI 整理结果默认待审核，当前有 ${pendingAI} 条待核对。`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={handleOrganize} disabled={organizing} className="archive-button archive-button-secondary disabled:opacity-50">
              {organizing ? '整理中...' : 'AI 整理史料'}
            </button>
            <button onClick={() => { setEdit(null); setShowForm(true) }} className="archive-button archive-button-accent">
              新增事件
            </button>
          </div>
        }
      />

      {organizeMessage && (
        <div className="mb-4 rounded-lg border border-[#E8DCC8] bg-white px-4 py-3 text-sm text-[#4A3728] shadow-sm">
          {organizeMessage}
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="搜索事件标题、类别或年份..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 rounded-lg border border-[#E8DCC8] px-4 py-2 outline-none focus:ring-2 focus:ring-[#C49A2B]"
        />
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C49A2B]">
          <option value="">全部类别</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="overflow-x-auto rounded-xl border border-[#E8DCC8] bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]">
              <tr>
                <Th field="title">标题</Th>
                <Th field="year">年份</Th>
                <Th field="category">类别</Th>
                <Th field="reviewStatus">审核</Th>
                <th className="p-3 text-left">发布</th>
                <th className="p-3 text-left">来源</th>
                <th className="p-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>{paged.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 max-w-xs truncate text-xs text-gray-500" title={item.description}>{item.description}</p>
                </td>
                <td className="p-3 text-gray-500">{item.year}</td>
                <td className="p-3"><span className="rounded bg-[#C49A2B]/10 px-2 py-0.5 text-xs text-[#8B6A1B]">{item.category || '-'}</span></td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(item.reviewStatus || 'approved')}`}>
                    {reviewLabel(item.reviewStatus || 'approved')}
                  </span>
                </td>
                <td className="p-3">{item.isPublished === false ? '未发布' : '已发布'}</td>
                <td className="p-3 text-xs text-gray-500">{item.generatedByAI ? 'AI 待核' : '人工录入'} · {(item.sourceIds || []).length} 份史料</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {item.generatedByAI && (item.reviewStatus || 'pending') !== 'approved' && (
                      <button onClick={() => handleQuickUpdate(item, { reviewStatus: 'approved', isPublished: true })}
                        className="text-green-700 hover:text-green-900">通过</button>
                    )}
                    <button onClick={() => { setEdit(item); setShowForm(true) }} className="text-blue-600 hover:text-blue-800">编辑</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 && <p className="py-8 text-center text-gray-400">暂无数据</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      {showForm && <TimelineForm item={edit} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}

function TimelineForm({ item, onClose, onSave, onDelete }: { item: any; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item || {
    title: '',
    year: '',
    description: '',
    category: '',
    era: '',
    sourceIds: [],
    reviewStatus: 'approved',
    isPublished: true,
    generatedByAI: false,
    aiRationale: '',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{item ? '编辑事件' : '新增事件'}</h2>
        <div className="space-y-3">
          {[{ key: 'title', label: '事件标题' }, { key: 'year', label: '年份' }, { key: 'category', label: '类别' }, { key: 'era', label: '时期' }].map(f => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{f.label}</label>
              <input type="text" value={(form as any)[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full rounded-lg border border-[#E8DCC8] px-3 py-2 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">详细描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={4}
              className="w-full rounded-lg border border-[#E8DCC8] px-3 py-2 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">审核状态</label>
              <select value={form.reviewStatus || 'approved'} onChange={e => setForm({ ...form, reviewStatus: e.target.value })}
                className="w-full rounded-lg border border-[#E8DCC8] px-3 py-2 outline-none">
                <option value="pending">待审核</option>
                <option value="approved">已审核</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isPublished !== false} onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
              前台发布
            </label>
          </div>
          {form.generatedByAI && (
            <div className="rounded-lg border border-[#E8DCC8] bg-[#F5F0E8] p-3 text-sm text-gray-700">
              <p className="font-medium text-[#4A3728]">AI 整理依据</p>
              <p className="mt-1 leading-6">{form.aiRationale || 'AI 根据史料摘要整理，需人工审核。'}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          {item ? <button onClick={() => onDelete(item.id)} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50">删除事件</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-lg border border-[#E8DCC8] px-4 py-2 text-sm">取消</button>
            <button onClick={() => onSave(form)} className="rounded-lg bg-[#C49A2B] px-4 py-2 text-sm text-white">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function normalizeTimelineForm(form: any) {
  return {
    ...form,
    year: Number(form.year) || form.year,
    sourceIds: Array.isArray(form.sourceIds) ? form.sourceIds : [],
    reviewStatus: form.reviewStatus || 'approved',
    isPublished: form.isPublished !== false,
  }
}

function statusClass(status: string) {
  if (status === 'approved') return 'bg-green-100 text-green-700'
  if (status === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}
