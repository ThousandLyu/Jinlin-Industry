'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import SmartImage from '@/components/shared/SmartImage'
import Pagination from '@/components/shared/Pagination'

interface MediaItem {
  id: string
  originalName: string
  fileName: string
  url: string
  type: string
  size: number
  mimeType: string
  createdAt: string
  category?: 'historical' | 'web'
  isDeleted?: boolean
}

const MEDIA_TYPES = ['image', 'document', 'course', 'scene'] as const
const TYPE_LABELS: Record<string, string> = { image: '图片', document: '文档', course: '课程', scene: '场景' }
const CATEGORY_LABELS: Record<string, string> = { historical: '史料', web: '网页素材' }
const PAGE_SIZE = 10

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']

function isImageItem(item: MediaItem): boolean {
  if (item.type === 'image') return true
  const ext = (item.originalName || item.fileName).toLowerCase().slice((item.originalName || item.fileName).lastIndexOf('.'))
  return IMAGE_EXTS.includes(ext)
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [category, setCategory] = useState<'all' | 'historical' | 'web'>('all')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ type: 'media', paginated: 'true', page: String(page), pageSize: String(PAGE_SIZE), sortField, sortDir })
    if (category !== 'all') params.set('category', category)
    const res = await fetch('/api/data?' + params.toString())
    const data = await res.json()
    setItems((data.items || []).map(normalizeMediaItem))
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 0)
    setLoading(false)
  }, [page, category, sortField, sortDir])

  useEffect(() => { load() }, [load])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', files[0])
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (res.ok) load()
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该文件？')) return
    await fetch('/api/data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'media', id }),
    })
    load()
  }

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) { setRenamingId(null); return }
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'media', id, data: { originalName: newName.trim() } }),
    })
    load()
    setRenamingId(null)
  }

  const handleTypeToggle = async (item: MediaItem) => {
    const idx = MEDIA_TYPES.indexOf(item.type as typeof MEDIA_TYPES[number])
    const nextType = MEDIA_TYPES[(idx + 1) % MEDIA_TYPES.length]
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'media', id: item.id, data: { type: nextType } }),
    })
    load()
  }

  const getPreviewIcon = (filename: string, type: string) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    if (imageExts.includes(ext) || type === 'image') return '图片'
    return TYPE_LABELS[type] || '文件'
  }

  const truncateFilename = (name: string, max = 30) => {
    if (name.length <= max) return name
    const ext = name.lastIndexOf('.')
    if (ext === -1) return name.slice(0, max) + '...'
    const base = name.slice(0, ext)
    const suffix = name.slice(ext)
    const keep = max - suffix.length - 3
    if (keep < 1) return name.slice(0, max) + '...'
    return base.slice(0, keep) + '...' + suffix
  }

  const formatTime = (t: string) => {
    if (!t) return '-'
    try {
      const d = new Date(t)
      return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return t }
  }

  const filtered = items.filter(i => {
    const keyword = search.toLowerCase()
    return !search || i.originalName?.toLowerCase().includes(keyword) || i.fileName?.toLowerCase().includes(keyword) || i.type?.includes(search)
  })

  const handleCategoryChange = (value: string) => {
    setCategory(value as 'all' | 'historical' | 'web')
    setPage(1)
  }

  return (
    <div>
      <AdminPageHeader
        title="媒体文件管理"
        description="集中维护图片、文档、课程附件和数字场景素材。"
      />

      <div
        className={"relative mb-6 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors " + (dragOver ? "border-[#C49A2B] bg-[#C49A2B]/10" : "border-[#E8DCC8] bg-white hover:border-[#C49A2B]/50 hover:bg-[#FDFBF7]")}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        <input ref={fileInputRef} type="file" className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp4,.mp3" />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-[#C49A2B] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">上传中...</p>
          </div>
        ) : (
          <div>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#D9C9AE] text-sm font-semibold text-[#8B6A1B]">上传</span>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-[#C49A2B] font-medium">点击选择</span> 或拖放文件到此处上传
            </p>
            <p className="text-xs text-gray-400 mt-1">支持图片、文档、压缩包等格式</p>
          </div>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="搜索文件名或类型..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-[#E8DCC8] rounded-lg outline-none focus:ring-2 focus:ring-[#C49A2B]" />
        <select value={category} onChange={e => handleCategoryChange(e.target.value)}
          className="px-4 py-2 border border-[#E8DCC8] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C49A2B] text-sm">
          <option value="all">全部分类</option>
          <option value="historical">史料</option>
          <option value="web">网页素材</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="overflow-x-auto rounded-lg border border-[#E8DCC8] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8]"><tr>
              <th className="text-left p-3">预览</th>
              <th className="text-left p-3 cursor-pointer hover:text-[#C49A2B] select-none" onClick={() => {
                if (sortField === 'originalName') setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                else { setSortField('originalName'); setSortDir('asc') }
              }}>文件名{sortField === 'originalName' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
              <th className="text-left p-3">类型</th>
              <th className="text-left p-3">分类</th>
              <th className="text-left p-3">路径</th>
              <th className="text-left p-3 cursor-pointer hover:text-[#C49A2B] select-none" onClick={() => {
                if (sortField === 'createdAt') setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                else { setSortField('createdAt'); setSortDir('asc') }
              }}>上传时间{sortField === 'createdAt' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
              <th className="text-left p-3">操作</th>
            </tr></thead>
            <tbody>{filtered.map((item: MediaItem) => (
              <tr key={item.id} className="border-t border-[#E8DCC8] hover:bg-[#FDFBF7]">
                <td className="p-3">
                  {isImageItem(item) ? (
                    <button onClick={() => setPreviewItem(item)} title="点击放大预览"
                      className="relative h-12 w-12 overflow-hidden rounded border border-[#E8DCC8] bg-[#F5F0E8] transition-colors hover:border-[#C49A2B]">
                      <SmartImage src={item.url} alt={item.originalName} fill sizes="48px" className="object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </button>
                  ) : (
                    <span className="inline-flex rounded border border-[#E8DCC8] bg-[#F5F0E8] px-2 py-1 text-xs text-[#8B6A1B]">{getPreviewIcon(item.originalName || item.fileName, item.type)}</span>
                  )}
                </td>
                <td className="p-3">
                  {renamingId === item.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      autoFocus
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(item.id, renameValue)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(item.id, renameValue); if (e.key === 'Escape') setRenamingId(null) }}
                      className="w-full px-2 py-1 border border-[#C49A2B] rounded outline-none text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => { setRenamingId(item.id); setRenameValue(item.originalName || item.fileName) }}
                      className="font-medium hover:text-[#C49A2B] text-left"
                      title="点击重命名"
                    >
                      {truncateFilename(item.originalName || item.fileName)}
                    </button>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleTypeToggle(item)}
                    title="点击切换类型"
                    className="text-xs bg-[#C49A2B]/10 text-[#C49A2B] px-2 py-0.5 rounded hover:bg-[#C49A2B]/20 cursor-pointer"
                  >
                    {TYPE_LABELS[item.type] || item.type || '其他'}
                  </button>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${item.category === 'historical' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {CATEGORY_LABELS[item.category || 'web'] || '网页素材'}
                  </span>
                </td>
                <td className="p-3 text-gray-500 max-w-[200px] truncate" title={item.url}>{item.url || '-'}</td>
                <td className="p-3 text-gray-500">{formatTime(item.createdAt)}</td>
                <td className="p-3 flex gap-2">
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800">查看</a>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">删除</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={total} onPageChange={setPage} />

      {/* Preview Lightbox */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8" onClick={() => setPreviewItem(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewItem(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">&times;</button>
            <div className="relative h-[80vh] max-h-[80vh] w-[80vw] max-w-4xl">
              <SmartImage src={previewItem.url} alt={previewItem.originalName}
                fill sizes="80vw" className="rounded-lg object-contain shadow-2xl" />
            </div>
            <p className="text-white text-center mt-3 text-sm">{previewItem.originalName || previewItem.fileName}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function normalizeMediaItem(item: any): MediaItem {
  return {
    ...item,
    originalName: item.originalName || item.filename || item.fileName || '',
    fileName: item.fileName || item.filename || '',
    url: item.url || item.path || '',
    createdAt: item.createdAt || item.uploadTime || '',
    size: item.size || 0,
    mimeType: item.mimeType || '',
  }
}
