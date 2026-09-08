'use client'
import { useState, useEffect, useMemo } from 'react'
import Pagination from '@/components/shared/Pagination'
import MediaPickerField from '@/components/admin/MediaPickerField'

export default function AdminActivitiesPage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=activities')
    const data = await res.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'activities', data: form, id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'activities', id }) })
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
        <h1 className="text-2xl font-bold">活动记录管理</h1>
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm">+ 新增活动</button>
      </div>
      <input type="text" placeholder="搜索活动标题..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        className="w-full px-4 py-2 border border-[#E8DCC8] rounded-lg mb-4 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <Th field="title">标题</Th><Th field="date">日期</Th>
              <Th field="location">地点</Th><Th field="servedCount">服务人数</Th><th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{paged.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3 font-medium max-w-[150px] truncate" title={item.title}>{item.title}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{item.date ? item.date.split('T')[0] : '-'}</td>
                <td className="p-3 text-gray-500 max-w-[100px] truncate" title={item.location}>{item.location || '-'}</td>
                <td className="p-3"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{item.servedCount ?? item.participantCount ?? '-'}</span></td>
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
      {showForm && <ActivityForm item={edit} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}

function ActivityForm({ item, onClose, onSave, onDelete }: { item: any; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item || { title: '', date: new Date().toISOString().split('T')[0], location: '', description: '', servedCount: 0, feedback: '', photos: '' })
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{item ? '编辑活动' : '新增活动'}</h2>
        <div className="space-y-3">
          {[{key:'title',label:'活动标题'},{key:'date',label:'日期',type:'date'},{key:'location',label:'地点'},{key:'servedCount',label:'服务人数',type:'number'}].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type || 'text'} value={(form as any)[f.key] ?? ''} onChange={e => setForm({...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">反馈摘要</label>
            <textarea value={form.feedback || ''} onChange={e => setForm({...form, feedback: e.target.value})} rows={2}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          <MediaPickerField label="照片" value={form.photos || ''}
            onChange={value => setForm({...form, photos: value})} />
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除活动</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#C49A2B] text-white rounded-lg text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
