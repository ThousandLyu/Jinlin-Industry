'use client'
import { useState, useEffect, useMemo } from 'react'
import Pagination from '@/components/shared/Pagination'
import { reviewLabel } from '@/lib/statusLabels'

export default function AdminFactsPage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<any[]>([])
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const load = async () => {
    setLoading(true)
    const [factsRes, sourcesRes] = await Promise.all([
      fetch('/api/data?type=facts'),
      fetch('/api/data?type=sources'),
    ])
    const factsData = await factsRes.json()
    const sourcesData = await sourcesRes.json()
    setItems(factsData.filter((i: any) => !i.isDeleted))
    setSources(sourcesData.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'facts', data: form, id: edit?.id }),
    })
    const result = await res.json()
    if (res.ok) { setShowForm(false); setEdit(null); load() }
    else { alert(result.error || '保存失败') }
  }

  const handleSort = (field: string) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'facts', id }) })
    setShowForm(false)
    setEdit(null)
    load()
  }

  const handleQuickUpdate = async (item: any, data: any) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'facts', id: item.id, data: { ...item, ...data, skipRiskAuto: true } }),
    })
    load()
  }

  const sortArrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const filtered = useMemo(() => {
    let list = items.filter(i => !search || i.claimText?.includes(search) || i.publicExpression?.includes(search))
    list = [...list].sort((a, b) => {
      const av = a[sortField]; const bv = b[sortField]
      if (av == null && bv == null) return 0
      if (av == null) return 1; if (bv == null) return -1
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv), 'zh-CN') : av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [items, search, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const Th = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="text-left p-3 cursor-pointer hover:text-[#C49A2B] select-none" onClick={() => handleSort(field)}>
      {children}{sortArrow(field)}
    </th>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">史实核验管理</h1>
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm">+ 新增史实</button>
      </div>
      <input type="text" placeholder="搜索史实内容..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        className="w-full px-4 py-2 border border-[#E8DCC8] rounded-lg mb-4 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <th className="text-left p-3">史实（摘要）</th>
              <th className="text-left p-3">史料等级</th>
              <Th field="reviewStatus">审核状态</Th>
              <th className="text-left p-3">发布</th><th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{paged.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3 max-w-xs truncate">{item.claimText?.substring(0, 60) || '-'}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#C49A2B]/10 text-[#7A5A13]"
                    title={item.verificationGrade === 'A' ? 'A级史料：基于一手档案或多源交叉验证，可信度最高'
                      : item.verificationGrade === 'B' ? 'B级史料：基于可靠文献或官方资料，可信度较高'
                      : item.verificationGrade === 'C' ? 'C级史料：单一来源或待进一步核实，仅供参考'
                      : ''}>
                    {item.verificationGrade ? `${item.verificationGrade}级史料` : '-'}
                  </span>
                </td>
                <td className="p-3">{reviewLabel(item.reviewStatus)}</td>
                <td className="p-3">
                  <button onClick={() => handleQuickUpdate(item, { isPublished: !item.isPublished })}
                    className={`rounded px-2 py-1 text-xs ${item.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {item.isPublished ? '已发布' : '未发布'}
                  </button>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => { setEdit(item); setShowForm(true) }} className="text-blue-600 hover:text-blue-800">编辑</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      {showForm && <FactForm item={edit} sources={sources} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}

function FactForm({ item, sources, onClose, onSave, onDelete }: { item: any; sources: any[]; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item || {
    claimText: '', publicExpression: '', verificationGrade: 'B', reviewStatus: 'pending',
    isPublished: false, riskLevel: 'low', riskWords: [], sourceIds: [], relatedSiteId: '', relatedPersonIds: []
  })
  const [newSource, setNewSource] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  const handleAIRiskCheck = async () => {
    const text = form.publicExpression || form.claimText
    if (!text?.trim()) { setAiMsg('请先输入史实正文或公开表述'); return }
    setAiLoading(true)
    setAiMsg('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'risk_check', text }),
      })
      const data = await res.json()
      if (data.success) {
        const riskWords = Array.isArray(data.result?.riskWords) ? data.result.riskWords : []
        setForm((current: any) => ({
          ...current,
          riskWords,
          riskLevel: riskWords.length > 0 ? 'high' : current.riskLevel || 'low',
          publicExpression: data.result?.suggestion || current.publicExpression,
        }))
        setAiMsg(riskWords.length > 0 ? `发现 ${riskWords.length} 个风险词，已填入建议表述。` : '未发现明显高风险词。')
      } else {
        setAiMsg(data.message || 'AI 风险检查失败')
      }
    } catch {
      setAiMsg('请求失败，请检查 AI 配置')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{item ? '编辑史实' : '新增史实'}</h2>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700">史实正文</label>
              <button type="button" onClick={handleAIRiskCheck} disabled={aiLoading}
                className="rounded-md bg-[#4A3728] px-3 py-1.5 text-xs text-white hover:bg-[#6B5240] disabled:opacity-50">
                {aiLoading ? '检查中...' : 'AI 风险检查'}
              </button>
            </div>
            <textarea value={form.claimText || ''} onChange={e => setForm({...form, claimText: e.target.value})} rows={3}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            {aiMsg && <p className={`mt-1 text-xs ${aiMsg.includes('失败') || aiMsg.includes('请') ? 'text-red-500' : 'text-green-600'}`}>{aiMsg}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公开展示表述</label>
            <textarea value={form.publicExpression || ''} onChange={e => setForm({...form, publicExpression: e.target.value})} rows={2}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">史料等级</label>
              <select value={form.verificationGrade} onChange={e => setForm({...form, verificationGrade: e.target.value})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none">
                <option value="A">A级</option><option value="B">B级</option><option value="C">C级</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">审核状态</label>
              <select value={form.reviewStatus} onChange={e => setForm({...form, reviewStatus: e.target.value})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none">
                <option value="pending">待审核</option><option value="approved">已审核</option><option value="rejected">已驳回</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联史料来源</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(form.sourceIds || []).map((sid: string) => {
                const s = sources.find(s => s.id === sid)
                return <span key={sid} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                  {s?.title || sid}
                  <button onClick={() => setForm({...form, sourceIds: (form.sourceIds || []).filter((i: string) => i !== sid)})} className="text-blue-900 font-bold">×</button>
                </span>
              })}
            </div>
            <div className="flex gap-2">
              <select value={newSource} onChange={e => setNewSource(e.target.value)} className="flex-1 px-3 py-2 border border-[#E8DCC8] rounded-lg text-sm outline-none">
                <option value="">选择史料...</option>
                {sources.filter(s => !(form.sourceIds || []).includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <button onClick={() => { if (newSource) { setForm({...form, sourceIds: [...(form.sourceIds || []), newSource]}); setNewSource('') }}}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm border">添加</button>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} /> 发布</label>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除史实</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#C49A2B] text-white rounded-lg text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function nextRiskLevel(value?: string) {
  if (value === 'high') return 'medium'
  if (value === 'medium') return 'low'
  return 'high'
}
