'use client'
import { useState, useEffect, useMemo } from 'react'
import MediaPickerField from '@/components/admin/MediaPickerField'
import Pagination from '@/components/shared/Pagination'

export default function AdminSitesPage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=sites')
    const data = await res.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const normalized = {
      ...form,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      location: form.address || form.location,
    }
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sites', data: normalized, id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'sites', id }) })
    setShowForm(false)
    setEdit(null)
    load()
  }

  const handleQuickUpdate = async (item: any, data: any) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sites', id: item.id, data: { ...item, ...data } }),
    })
    load()
  }

  const handleSort = (field: string) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }
  const sortArrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const filtered = useMemo(() => {
    let list = items.filter(i => !search || i.name?.includes(search) || i.industry?.includes(search))
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
        <h1 className="text-2xl font-bold">企业遗址管理</h1>
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm">+ 新增企业</button>
      </div>
      <input type="text" placeholder="搜索名称或行业..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        className="w-full px-4 py-2 border border-[#E8DCC8] rounded-lg mb-4 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <Th field="name">名称</Th><Th field="industry">行业</Th>
              <th className="text-left p-3">地址</th><th className="text-left p-3 whitespace-nowrap">经纬度</th>
              <Th field="isPublished">状态</Th>
              <Th field="isRecommended">推荐</Th><th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{paged.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3 font-medium max-w-[120px] truncate" title={item.name}>{item.name}</td>
                <td className="p-3"><span className="text-xs bg-[#C49A2B]/10 text-[#C49A2B] px-2 py-0.5 rounded max-w-[100px] truncate inline-block" title={item.industry}>{item.industry}</span></td>
                <td className="p-3 text-gray-500 max-w-[140px] truncate" title={item.location || item.address}>{item.location || item.address || '-'}</td>
                <td className="p-3 text-gray-500 text-xs">
                  {item.longitude != null && item.latitude != null
                    ? `${item.longitude.toFixed(4)}, ${item.latitude.toFixed(4)}`
                    : '-'}
                </td>
                <td className="p-3">
                  <button onClick={() => handleQuickUpdate(item, { isPublished: !item.isPublished })}
                    className={`rounded px-2 py-1 text-xs ${item.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {item.isPublished ? '已发布' : '待审核'}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => handleQuickUpdate(item, { isRecommended: !item.isRecommended })}
                    className={`text-xl ${item.isRecommended ? 'text-[#C49A2B]' : 'text-gray-300'}`} title={item.isRecommended ? '取消推荐' : '设为推荐'}>
                    ★
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
      {showForm && <SiteForm item={edit} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}

function SiteForm({ item, onClose, onSave, onDelete }: { item: any; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item || {
    name: '', slug: '', industry: '', address: '', longitude: '', latitude: '',
    description: '', historicalValue: '', coverImage: '', isPublished: false, isRecommended: false,
    siteImages: [], sourceRefs: '', years: ''
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  const handleAIGenerate = async () => {
    if (!form.name?.trim()) { setAiMsg('请先输入企业名称'); return }
    setAiLoading(true); setAiMsg('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_description', name: form.name.trim(), entityType: 'site' }),
      })
      const data = await res.json()
      if (data.success) {
        setForm((f: any) => ({
          ...f,
          description: f.description || data.description || '',
          historicalValue: f.historicalValue || data.historicalValue || '',
          industry: f.industry || data.category || '',
          address: f.address || f.location || data.address || '',
          location: f.location || f.address || data.address || '',
          years: f.years || data.years || '',
        }))
        setAiMsg(`已生成（匹配 ${data.sourceCount} 份史料）`)
      } else {
        setAiMsg(data.message || 'AI 生成失败')
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
        <h2 className="text-lg font-bold mb-4">{item ? '编辑企业' : '新增企业'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[{key:'name',label:'企业名称',ai:true},{key:'slug',label:'URL标识'},{key:'industry',label:'行业'},{key:'address',label:'地址'},{key:'longitude',label:'经度'},{key:'latitude',label:'纬度'},{key:'years',label:'存续年份'},{key:'sourceRefs',label:'史料来源'}].map(f => (
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
        </div>
        {aiMsg && <p className={`mt-2 text-xs ${aiMsg.includes('失败') || aiMsg.includes('请') ? 'text-red-500' : 'text-green-600'}`}>{aiMsg}</p>}
        <div className="space-y-3 mt-3">
          <MediaPickerField label="封面图" value={form.coverImage || ''} onChange={value => setForm({...form, coverImage: value})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            {!form.description && <p className="mt-1 text-xs text-gray-400">缺失</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">历史价值</label>
            <textarea value={form.historicalValue || ''} onChange={e => setForm({...form, historicalValue: e.target.value})} rows={3}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            {!form.historicalValue && <p className="mt-1 text-xs text-gray-400">缺失</p>}
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} /> 已发布</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isRecommended} onChange={e => setForm({...form, isRecommended: e.target.checked})} /> 推荐展示</label>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除企业</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#C49A2B] text-white rounded-lg text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
