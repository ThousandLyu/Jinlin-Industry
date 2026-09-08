'use client'
import { useState, useEffect } from 'react'
import MediaPickerField from '@/components/admin/MediaPickerField'

export default function AdminScenesPage() {
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=scenes')
    const data = await res.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSave = async (form: any) => {
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'scenes', data: form, id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch('/api/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'scenes', id }) })
    setShowForm(false)
    setEdit(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">数字复原场景管理</h1>
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="bg-[#C49A2B] hover:bg-[#B08920] text-white px-4 py-2 rounded-lg text-sm">+ 新增场景</button>
      </div>
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="bg-white rounded-xl shadow border border-[#E8DCC8] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <th className="text-left p-3">标题</th><th className="text-left p-3">时期</th>
              <th className="text-left p-3">图片路径</th><th className="text-left p-3">3D模型</th><th className="text-left p-3">热点数</th><th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{items.map((item: any) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3 font-medium">{item.title}</td>
                <td className="p-3"><span className="text-xs bg-[#C49A2B]/10 text-[#C49A2B] px-2 py-0.5 rounded">{item.period || '-'}</span></td>
                <td className="p-3 text-gray-500 truncate max-w-[150px]">{item.imageUrl || item.image || '-'}</td>
                <td className="p-3 text-gray-500 truncate max-w-[150px]">{item.modelUrl ? `${item.modelType || 'glb'} · ${item.modelUrl}` : '-'}</td>
                <td className="p-3 text-gray-500">{item.hotspots?.length || 0}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => { setEdit(item); setShowForm(true) }} className="text-blue-600 hover:text-blue-800">编辑</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}
      {showForm && <SceneForm item={edit} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}

function SceneForm({ item, onClose, onSave, onDelete }: { item: any; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(item ? { ...item, imageUrl: item.imageUrl || item.image || '' } : { title: '', description: '', period: '', imageUrl: '', image: '', modelUrl: '', modelType: 'glb', hotspots: [] })
  const [hotspotStr, setHotspotStr] = useState(item?.hotspots ? JSON.stringify(item.hotspots) : '[]')
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{item ? '编辑场景' : '新增场景'}</h2>
        <div className="space-y-3">
          {[{key:'title',label:'场景标题'},{key:'period',label:'时期'}].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" value={(form as any)[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})}
                className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
            </div>
          ))}
          <MediaPickerField label="图片" value={form.imageUrl || ''} onChange={value => setForm({...form, imageUrl: value})} />
          <MediaPickerField label="3D模型（推荐 .glb，可由 3DMax 导出）" value={form.modelUrl || ''} onChange={value => setForm({...form, modelUrl: value, modelType: detectModelType(value)})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型格式</label>
            <select value={form.modelType || 'glb'} onChange={e => setForm({...form, modelType: e.target.value})}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]">
              <option value="glb">GLB（推荐）</option>
              <option value="gltf">glTF</option>
              <option value="obj">OBJ（暂不预览）</option>
              <option value="fbx">FBX（暂不预览）</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">热点数据（JSON格式）</label>
            <textarea value={hotspotStr} onChange={e => { setHotspotStr(e.target.value); try { setForm({...form, hotspots: JSON.parse(e.target.value)}) } catch {} }} rows={4}
              className="w-full px-3 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B] font-mono text-xs" />
            <p className="text-xs text-gray-400 mt-1">格式：{`[{"x":50,"y":30,"label":"说明文字"}]`}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50">删除场景</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[#E8DCC8] rounded-lg text-sm">取消</button>
            <button onClick={() => onSave({...form, image: form.image || form.imageUrl})} className="px-4 py-2 bg-[#C49A2B] text-white rounded-lg text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function detectModelType(value: string) {
  const lower = value.toLowerCase()
  if (lower.endsWith('.glb')) return 'glb'
  if (lower.endsWith('.gltf')) return 'gltf'
  if (lower.endsWith('.obj')) return 'obj'
  if (lower.endsWith('.fbx')) return 'fbx'
  return 'other'
}
