'use client'
import { useState, useEffect, useMemo } from 'react'
import MediaPickerField from '@/components/admin/MediaPickerField'
import Pagination from '@/components/shared/Pagination'

export default function AdminCoursesPage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [facts, setFacts] = useState<any[]>([])
  const [sortField, setSortField] = useState('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const load = async () => {
    setLoading(true)
    const [res, factsRes] = await Promise.all([fetch('/api/data?type=courses'), fetch('/api/data?type=facts')])
    const data = await res.json()
    const factsData = await factsRes.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setFacts(factsData.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'courses', data: form, id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'courses', id }) })
    setShowForm(false)
    setEdit(null)
    load()
  }

  const handleSort = (field: string) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }
  const sortArrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const filtered = useMemo(() => {
    let list = items.filter(i => !search || i.title?.includes(search))
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
        <h1 className="text-2xl font-bold">公益课程管理</h1>
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm">+ 新增课程</button>
      </div>
      <input type="text" placeholder="搜索课程标题..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        className="w-full px-4 py-2 border border-[#E8DCC8] rounded-lg mb-4 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <Th field="title">标题</Th><Th field="type">类型</Th>
              <th className="text-left p-3">目标群体</th><th className="text-left p-3">附件</th><th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{paged.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3 font-medium max-w-[150px] truncate" title={item.title}>{item.title}</td>
                <td className="p-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">{item.type || '课程'}</span></td>
                <td className="p-3 text-gray-500 max-w-[120px] truncate" title={item.targetAudience}>{item.targetAudience || '-'}</td>
                <td className="p-3 text-gray-500 text-xs">
                  {[item.pptFile, item.scriptFile, item.taskFile].filter(Boolean).length || '-'}个文件
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
      {showForm && <CourseForm item={edit} facts={facts} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}

function CourseForm({ item, facts, onClose, onSave, onDelete }: { item: any; facts: any[]; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item || { title: '', description: '', type: '课程', targetAudience: '', pptFile: '', scriptFile: '', taskFile: '', keywords: [] as string[], relatedFactIds: [] as string[] })
  const keywordText = Array.isArray(form.keywords) ? form.keywords.join('，') : String(form.keywords || '')
  const keywords = keywordText.split(/[,\s，、]+/).map((word: string) => word.trim()).filter(Boolean)
  const matchedFacts = facts.filter((fact) => {
    const text = [fact.title, fact.claimText, fact.publicExpression, fact.category].join(' ')
    return keywords.length > 0 && keywords.some((word: string) => text.includes(word))
  }).slice(0, 8)

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{item ? '编辑课程' : '新增课程'}</h2>
        <div className="space-y-3">
          {[{key:'title',label:'课程标题'},{key:'targetAudience',label:'目标群体'}].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" value={(form as any)[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]">
              <option value="课程">课程</option><option value="讲稿">讲稿</option><option value="任务单">任务单</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          <MediaPickerField label="PPT文件" value={form.pptFile || ''} onChange={value => setForm({...form, pptFile: value})} />
          <MediaPickerField label="讲稿文件" value={form.scriptFile || ''} onChange={value => setForm({...form, scriptFile: value})} />
          <MediaPickerField label="任务单文件" value={form.taskFile || ''} onChange={value => setForm({...form, taskFile: value})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词（用于自动匹配史实）</label>
            <input type="text" value={keywordText} onChange={e => setForm({...form, keywords: e.target.value.split(/[,\s，、]+/).map((s: string) => s.trim()).filter(Boolean)})}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          {matchedFacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">匹配到的相关史实</label>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-[#E8DCC8] p-2">
                {matchedFacts.map(fact => {
                  const checked = (form.relatedFactIds || []).includes(fact.id)
                  return (
                    <label key={fact.id} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={e => {
                        const current = form.relatedFactIds || []
                        setForm({...form, relatedFactIds: e.target.checked ? [...current, fact.id] : current.filter((id: string) => id !== fact.id)})
                      }} />
                      <span>{fact.claimText || fact.publicExpression || fact.title}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">已关联史实ID</label>
            <input type="text" value={Array.isArray(form.relatedFactIds) ? form.relatedFactIds.join(',') : (form.relatedFactIds || '')} onChange={e => setForm({...form, relatedFactIds: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)})}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除课程</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#C49A2B] text-white rounded-lg text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
