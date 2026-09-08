'use client'
import { useState, useEffect, useRef } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import MediaPickerField from '@/components/admin/MediaPickerField'
import SmartImage from '@/components/shared/SmartImage'

export default function AdminMapPage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [globalBaseMap, setGlobalBaseMap] = useState('')
  const [uploading, setUploading] = useState(false)
  const mapFileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const [ptsRes, setRes] = await Promise.all([
      fetch('/api/data?type=mapPoints'),
      fetch('/api/data?type=settings'),
    ])
    const ptsData = await ptsRes.json()
    const settingsData = await setRes.json()
    setItems(ptsData.filter((i: any) => !i.isDeleted))
    const settings = settingsData[0]
    if (settings && settings.mapBaseImage) setGlobalBaseMap(settings.mapBaseImage)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'mapPoints', data: normalizeMapPoint(form), id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'mapPoints', id }) })
    setShowForm(false)
    setEdit(null)
    load()
  }

  // Upload base map image
  const handleBaseMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'images')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      setGlobalBaseMap(data.url)
      // Save to settings
      const settingsRes = await fetch('/api/data?type=settings')
      const settingsData = await settingsRes.json()
      const settings = settingsData[0]
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'settings',
          data: { ...settings, mapBaseImage: data.url },
          id: settings?.id,
        }),
      })
    }
    setUploading(false)
  }

  const filtered = items.filter(i => !search || i.name?.includes(search) || i.siteName?.includes(search))

  return (
    <div>
      <div className="space-y-6">
        <AdminPageHeader
          title="地图点位管理"
          description="维护全局地图底图、企业遗址点位和点位专属底图。"
          actions={<button onClick={() => { setEdit(null); setShowForm(true) }} className="archive-button archive-button-accent">新增点位</button>}
        />

        {/* 底图管理区域 */}
        <div className="museum-panel p-6">
          <h2 className="text-lg font-bold mb-3">地图底图管理</h2>
          <div className="flex items-center gap-4">
            {globalBaseMap ? (
              <div className="relative">
                <div className="relative h-40 w-64 overflow-hidden rounded-lg border border-[#E8DCC8] bg-[#F5F0E8]">
                  <SmartImage src={globalBaseMap} alt="地图底图" fill sizes="256px" className="object-cover" />
                </div>
                <button
                  onClick={() => setGlobalBaseMap('')}
                  className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded"
                >清除</button>
              </div>
            ) : (
              <div className="w-64 h-40 bg-[#F5F0E8] rounded-lg border border-dashed border-[#E8DCC8] flex items-center justify-center text-gray-400 text-sm">
                未设置底图
              </div>
            )}
            <div>
              <input ref={mapFileRef} type="file" accept="image/*" onChange={handleBaseMapUpload} className="hidden" />
              <button
                onClick={() => mapFileRef.current?.click()}
                disabled={uploading}
                className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {uploading ? '上传中...' : globalBaseMap ? '更换底图' : '上传底图'}
              </button>
              <p className="text-xs text-gray-400 mt-2">建议上传南京地图图片，点位将按百分比坐标叠加显示</p>
            </div>
          </div>
        </div>

        {/* 点位列表 */}
        <input type="text" placeholder="搜索点位名称..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-[#E8DCC8] rounded-lg mb-4 outline-none focus:ring-2 focus:ring-[#C49A2B]" />
        {loading ? <p className="text-gray-400">加载中...</p> : (
          <div className="overflow-x-auto rounded-lg border border-[#E8DCC8] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]"><tr>
                <th className="text-left p-3">名称</th><th className="text-left p-3">经纬度</th>
                <th className="text-left p-3 whitespace-nowrap">底图</th><th className="text-left p-3">描述</th><th className="text-left p-3">操作</th>
              </tr></thead>
              <tbody>{filtered.map((item: any) => (
                <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                  <td className="p-3 font-medium">{item.name || item.siteName}</td>
                  <td className="p-3 text-gray-500">{coordinateLabel(item)}</td>
                  <td className="p-3 text-gray-400 text-xs">{item.baseMapImage ? '✓' : '全局'}</td>
                  <td className="p-3 max-w-xs truncate text-gray-500" title={item.description}>{item.description}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => { setEdit(item); setShowForm(true) }} className="text-blue-600 hover:text-blue-800">编辑</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}
      {showForm && <MapForm item={edit} baseMapImage={globalBaseMap} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
      </div>
    </div>
  )
}

function MapForm({ item, baseMapImage, onClose, onSave, onDelete }: { item: any; baseMapImage: string; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item || {
    name: '',
    siteName: '',
    xPercent: 50,
    yPercent: 50,
    longitude: '',
    latitude: '',
    description: '',
    siteId: '',
    baseMapImage: '',
  })
  const previewMap = form.baseMapImage || baseMapImage

  const handlePickPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const xPercent = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
    const yPercent = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
    setForm({ ...form, xPercent: Number(xPercent.toFixed(2)), yPercent: Number(yPercent.toFixed(2)) })
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{item ? '编辑点位' : '新增点位'}</h2>
        <div className="space-y-3">
          {[{key:'name',label:'点位名称'},{key:'siteName',label:'别名'},{key:'siteId',label:'关联企业ID'}].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" value={(form as any)[f.key] ?? ''} onChange={e => setForm({...form, [f.key]: e.target.value})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
          ))}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
              <input type="number" step="0.000001" value={form.longitude ?? ''} onChange={e => setForm({...form, longitude: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
              <input type="number" step="0.000001" value={form.latitude ?? ''} onChange={e => setForm({...form, latitude: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">从地图取点</label>
            {previewMap ? (
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[#E8DCC8] bg-[#F5F0E8] cursor-crosshair" onClick={handlePickPoint}>
                <SmartImage src={previewMap} alt="点位取点底图" fill sizes="640px" className="object-cover" />
                <span
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#8B1A2B] shadow-lg"
                  style={{ left: `${form.xPercent ?? 50}%`, top: `${form.yPercent ?? 50}%` }}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#E8DCC8] bg-[#F5F0E8] px-4 py-6 text-sm text-gray-500">
                先上传全局底图，或为点位选择专属底图后即可点击取点。
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">点击底图会保存内部定位；列表和前台仅展示经纬度或缺失状态。</p>
          </div>
          <MediaPickerField label="点位专属底图（可选，留空使用全局底图）" value={form.baseMapImage || ''} onChange={value => setForm({...form, baseMapImage: value})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={2}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除点位</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#C49A2B] text-white rounded-lg text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function coordinateLabel(point: any) {
  const longitude = Number(point.longitude)
  const latitude = Number(point.latitude)
  if (
    point.longitude == null ||
    point.latitude == null ||
    point.longitude === '' ||
    point.latitude === '' ||
    Number.isNaN(longitude) ||
    Number.isNaN(latitude) ||
    (longitude === 0 && latitude === 0)
  ) {
    return '未设定'
  }
  return `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`
}

function normalizeMapPoint(form: any) {
  return {
    ...form,
    xPercent: Number(form.xPercent ?? 50),
    yPercent: Number(form.yPercent ?? 50),
    longitude: form.longitude === '' ? undefined : Number(form.longitude),
    latitude: form.latitude === '' ? undefined : Number(form.latitude),
  }
}
