'use client'
import { useState, useEffect, useMemo } from 'react'
import MediaPickerField from '@/components/admin/MediaPickerField'
import Pagination from '@/components/shared/Pagination'

export default function AdminPeoplePage() {
  const [items, setItems] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'review'>('create')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [entityFilter, setEntityFilter] = useState('person')
  const [verifyFilter, setVerifyFilter] = useState('all')
  const [batchMsg, setBatchMsg] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const load = async () => {
    setLoading(true)
    const [res, sitesRes] = await Promise.all([
      fetch('/api/data?type=people'),
      fetch('/api/data?type=sites'),
    ])
    const data = await res.json()
    const sitesData = await sitesRes.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setSites(sitesData.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const site = sites.find((item: any) => item.id === form.relatedSiteId)
    const normalized = {
      ...form,
      entityType: form.entityType || 'unknown',
      relatedSiteName: site?.name || form.relatedSiteName || '',
      siteIds: form.relatedSiteId ? [form.relatedSiteId] : [],
    }
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'people', data: normalized, id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleVerify = async (form: any) => {
    const site = sites.find((item: any) => item.id === form.relatedSiteId)
    const normalized = {
      ...form,
      entityType: form.entityType || 'unknown',
      relatedSiteName: site?.name || form.relatedSiteName || '',
      siteIds: form.relatedSiteId ? [form.relatedSiteId] : [],
      verifiedStatus: 'verified',
      verifiedBy: 'admin',
      verifiedAt: new Date().toISOString(),
    }
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'people', data: normalized, id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'people', id }) })
    setShowForm(false); setEdit(null); load()
  }

  const batchVerify = async () => {
    const targets = items.filter((item: any) => selectedIds.includes(item.id))
    if (targets.length === 0) { setBatchMsg('请先勾选需要查验的人物'); return }
    setBatchRunning(true)
    setBatchMsg(`正在批量通过 ${targets.length} 条...`)
    let updated = 0
    try {
      for (const item of targets) {
        const res = await fetch('/api/data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'people', id: item.id, data: { verifiedStatus: 'verified', verifiedBy: 'admin', verifiedAt: new Date().toISOString() } }),
        })
        if (res.ok) updated += 1
      }
      setBatchMsg(`已通过 ${updated} 条`)
      setSelectedIds([])
      await load()
    } catch {
      setBatchMsg('批量通过失败')
    } finally {
      setBatchRunning(false)
    }
  }

  const batchDelete = async () => {
    const targets = items.filter((item: any) => selectedIds.includes(item.id))
    if (targets.length === 0) { setBatchMsg('请先勾选需要删除的人物'); return }
    if (!confirm(`确定删除 ${targets.length} 条记录？`)) return
    setBatchRunning(true)
    setBatchMsg(`正在批量删除 ${targets.length} 条...`)
    let deleted = 0
    try {
      for (const item of targets) {
        const res = await fetch('/api/data', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'people', id: item.id }),
        })
        if (res.ok) deleted += 1
      }
      setBatchMsg(`已删除 ${deleted} 条`)
      setSelectedIds([])
      await load()
    } catch {
      setBatchMsg('批量删除失败')
    } finally {
      setBatchRunning(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id])
  }

  const handleSort = (field: string) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }
  const sortArrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const filtered = useMemo(() => {
    let list = items
      .filter((item: any) => entityFilter === 'all' || (item.entityType || 'unknown') === entityFilter)
      .filter((item: any) => {
        if (verifyFilter === 'all') return true
        const vs = item.verifiedStatus || 'verified'
        return vs === verifyFilter
      })
      .sort((a, b) => {
        const av = a[sortField]; const bv = b[sortField]
        if (av == null && bv == null) return 0
        if (av == null) return 1; if (bv == null) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(String(bv), 'zh-CN') : av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'desc' ? -cmp : cmp
      })
    return list
  }, [items, entityFilter, verifyFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const Th = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="text-left p-3 cursor-pointer hover:text-[#C49A2B] select-none" onClick={() => handleSort(field)}>
      {children}{sortArrow(field)}
    </th>
  )

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">人物管理</h1>
          <p className="mt-1 text-sm text-gray-500">区分人物、企业机构与未分类条目。AI 不再自动链接，改为人工查验。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C49A2B]">
            <option value="all">全部类型</option>
            <option value="person">人物</option>
          </select>
          <select value={verifyFilter} onChange={e => { setVerifyFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C49A2B]">
            <option value="all">全部查验状态</option>
            <option value="verified">已查验</option>
            <option value="unverified">未查验</option>
          </select>
          <button onClick={batchVerify} disabled={batchRunning || selectedIds.length === 0}
            className="border border-[#4A3728] text-[#4A3728] hover:bg-[#4A3728] hover:text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {batchRunning ? '处理中...' : `批量通过(${selectedIds.length})`}
          </button>
          <button onClick={batchDelete} disabled={selectedIds.length === 0}
            className="border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            批量删除({selectedIds.length})
          </button>
          <button onClick={() => { setEdit(null); setFormMode('create'); setShowForm(true) }}
            className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm">+ 新增人物</button>
        </div>
      </div>
      {batchMsg && <p className="mb-3 rounded-lg border border-[#E8DCC8] bg-[#FDFBF7] px-3 py-2 text-sm text-[#4A3728]">{batchMsg}</p>}
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <th className="text-left p-3 w-8">
                <input type="checkbox" checked={paged.length > 0 && paged.every(item => selectedIds.includes(item.id))}
                  onChange={() => {
                    const pageIds = paged.map(item => item.id)
                    setSelectedIds(prev => pageIds.every(id => prev.includes(id))
                      ? prev.filter(id => !pageIds.includes(id))
                      : [...new Set([...prev, ...pageIds])])
                  }} />
              </th>
              <Th field="name">姓名</Th>
              <Th field="entityType">类型</Th>
              <Th field="verifiedStatus">查验状态</Th>
              <Th field="role">身份</Th>
              <th className="text-left p-3">关联企业</th>
              <th className="text-left p-3">生卒年</th>
              <th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{paged.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3">
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
                </td>
                <td className="p-3 font-medium max-w-[120px] truncate" title={item.name}>
                  {item.pinned && <span className="text-[#C49A2B] mr-1" title="已置顶">★</span>}
                  {item.name}
                </td>
                <td className="p-3 whitespace-nowrap"><EntityTypeBadge value={item.entityType} /></td>
                <td className="p-3 whitespace-nowrap"><VerifyBadge status={item.verifiedStatus} /></td>
                <td className="p-3 text-gray-500 max-w-[100px] truncate" title={item.role}>{item.role || '-'}</td>
                <td className="p-3 text-gray-500 max-w-[120px] truncate" title={item.relatedSiteName || item.relatedSiteId}>{item.relatedSiteId ? item.relatedSiteName || item.relatedSiteId : '-'}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{item.birthYear}{item.deathYear ? `-${item.deathYear}` : ''}</td>
                <td className="p-3 flex gap-2">
                  {(item.verifiedStatus || 'verified') !== 'verified' && (
                    <button onClick={() => { setEdit(item); setFormMode('review'); setShowForm(true) }}
                      className="text-[#C49A2B] hover:text-[#8B6A1B]">查验</button>
                  )}
                  <button onClick={() => { setEdit(item); setFormMode('edit'); setShowForm(true) }}
                    className="text-blue-600 hover:text-blue-800">编辑</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      {showForm && (
        <PersonForm
          mode={formMode}
          item={edit}
          sites={sites}
          onClose={() => { setShowForm(false); setEdit(null) }}
          onSave={formMode === 'review' ? handleVerify : handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function PersonForm({ mode, item, sites, onClose, onSave, onDelete }: {
  mode: 'create' | 'edit' | 'review'
  item: any
  sites: any[]
  onClose: () => void
  onSave: (d: any) => void
  onDelete: (id: string) => void
}) {
  const [form, setForm] = useState(item || {
    name: '', role: '', entityType: 'unknown', biography: '', birthYear: '', deathYear: '',
    avatar: '', bgImage: '', relatedSiteId: '', verifiedStatus: 'unverified',
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  const handleAIGenerate = async () => {
    if (!form.name?.trim()) { setAiMsg('请先输入姓名'); return }
    setAiLoading(true); setAiMsg('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_description', name: form.name.trim(), entityType: 'person' }),
      })
      const data = await res.json()
      if (data.success) {
        const generated = normalizeGeneratedPerson(data)
        setForm((f: any) => ({
          ...f,
          biography: generated.biography || f.biography,
          role: generated.role || f.role,
          entityType: generated.entityType || f.entityType || 'unknown',
          birthYear: generated.birthYear || f.birthYear,
          deathYear: generated.deathYear || f.deathYear,
          relatedSiteId: generated.relatedSiteId || f.relatedSiteId,
          relatedSiteName: generated.relatedSiteName || f.relatedSiteName,
        }))
        setAiMsg(`已生成（${entityTypeLabel(generated.entityType)}，匹配 ${data.sourceCount} 份史料）`)
      } else {
        setAiMsg(data.message || 'AI 生成失败，请手动填写')
      }
    } catch {
      setAiMsg('AI 不可用，请手动填写')
    } finally {
      setAiLoading(false)
    }
  }

  const titleText = mode === 'review' ? '查验人物' : mode === 'create' ? '新增人物' : '编辑人物'
  const saveLabel = mode === 'review' ? '标记已查验并保存' : '保存'

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{titleText}</h2>
        {mode === 'review' && (
          <p className="text-sm text-ink-soft mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            查验模式：请核实人物信息并修正，确认无误后点击"标记已查验并保存"。
          </p>
        )}
        <div className="space-y-3">
          {[{key:'name',label:'姓名',ai:true},{key:'role',label:'身份/职务'},{key:'birthYear',label:'出生年份'},{key:'deathYear',label:'逝世年份'}].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <div className="flex gap-2">
                <input type="text" value={(form as any)[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="flex-1 px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
                {f.ai && (
                  <button type="button" onClick={handleAIGenerate} disabled={aiLoading}
                    className="shrink-0 px-3 py-2 bg-[#4A3728] text-white rounded-lg text-xs hover:bg-[#6B5240] disabled:opacity-50 whitespace-nowrap">
                    {aiLoading ? '生成中...' : 'AI 生成'}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">条目类型</label>
            <select value={form.entityType || 'unknown'} onChange={e => setForm({...form, entityType: e.target.value})}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]">
              <option value="person">人物</option>
              <option value="organization">企业/机构</option>
              <option value="unknown">未分类</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pinned" checked={form.pinned || false}
              onChange={e => setForm({...form, pinned: e.target.checked})}
              className="w-4 h-4 text-[#C49A2B] border-[#E8DCC8] rounded focus:ring-[#C49A2B]" />
            <label htmlFor="pinned" className="text-sm font-medium text-gray-700">前台置顶</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联企业</label>
            <select value={form.relatedSiteId || ''} onChange={e => {
              const site = sites.find((item: any) => item.id === e.target.value)
              setForm({...form, relatedSiteId: e.target.value, relatedSiteName: site?.name || ''})
            }}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]">
              <option value="">缺失</option>
              {sites.map((site: any) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </div>
          <MediaPickerField label="头像" value={form.avatar || ''} onChange={value => setForm({...form, avatar: value})} />
          <MediaPickerField label="背景图" value={form.bgImage || ''} onChange={value => setForm({...form, bgImage: value})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生平简介</label>
            <textarea value={form.biography || ''} onChange={e => setForm({...form, biography: e.target.value})} rows={4}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
        </div>
        {aiMsg && <p className={`mt-2 text-xs ${aiMsg.includes('失败') || aiMsg.includes('不可用') || aiMsg.includes('请') ? 'text-red-500' : 'text-green-600'}`}>{aiMsg}</p>}
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除人物</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave(form)}
              className={`px-4 py-2 text-white rounded-lg text-sm ${mode === 'review' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#C49A2B] hover:bg-[#B08920]'}`}>
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VerifyBadge({ status }: { status?: string }) {
  const isVerified = (status || 'verified') === 'verified'
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
      isVerified ? 'border-green-300 bg-green-50 text-green-700' : 'border-yellow-300 bg-yellow-50 text-yellow-700'
    }`}>
      {isVerified ? '已查验' : '待查验'}
    </span>
  )
}

function EntityTypeBadge({ value }: { value?: string }) {
  const type = normalizeEntityType(value)
  const styles: Record<string, string> = {
    person: 'border-[#C49A2B]/30 bg-[#C49A2B]/10 text-[#7A5A13]',
    organization: 'border-[#8B1A2B]/25 bg-[#8B1A2B]/10 text-[#8B1A2B]',
    unknown: 'border-gray-200 bg-gray-50 text-gray-500',
  }
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[type]}`}>{entityTypeLabel(type)}</span>
}

function normalizeGeneratedPerson(data: any) {
  const parsed = parseMaybeJsonObject(data.description) || {}
  return {
    biography: stringifyField(data.biography || parsed.biography || parsed.description || data.description),
    role: stringifyField(data.role || data.category || parsed.role || parsed.category),
    entityType: normalizeEntityType(data.entityType || parsed.entityType),
    birthYear: stringifyField(data.birthYear || parsed.birthYear),
    deathYear: stringifyField(data.deathYear || parsed.deathYear),
    relatedSiteId: stringifyField(data.relatedSiteId || parsed.relatedSiteId),
    relatedSiteName: stringifyField(data.relatedSiteName || parsed.relatedSiteName),
  }
}

function normalizeEntityType(value: unknown): 'person' | 'organization' | 'unknown' {
  const text = stringifyField(value).toLowerCase()
  if (text === 'person' || text === '人物' || text === '个人') return 'person'
  if (text === 'organization' || text === 'org' || text === 'site' || text === '企业' || text === '机构') return 'organization'
  return 'unknown'
}

function entityTypeLabel(value?: string) {
  const type = normalizeEntityType(value)
  if (type === 'person') return '人物'
  if (type === 'organization') return '企业/机构'
  return '未分类'
}

function parseMaybeJsonObject(value: unknown): any | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : cleaned
  try { return JSON.parse(candidate) } catch { return null }
}

function stringifyField(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}
