'use client'
import { useState, useEffect, useRef } from 'react'
import SmartImage from '@/components/shared/SmartImage'

interface MediaItem {
  id: string
  originalName: string
  fileName: string
  url: string
  type: string
  size: number
  mimeType: string
}

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}

const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'document', label: '文档' },
  { value: 'course', label: '课程' },
  { value: 'scene', label: '场景' },
]

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']

function isImage(filename: string, type: string): boolean {
  if (type === 'image') return true
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return IMAGE_EXTS.includes(ext)
}

export default function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=media')
    const data = await res.json()
    setItems(data.filter((i: any) => !i.isDeleted))
    setLoading(false)
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', files[0])
    const uploadType = typeFilter === 'scene' ? 'scenes' : typeFilter === 'course' ? 'courses' : typeFilter === 'document' ? 'documents' : 'images'
    const res = await fetch(`/api/upload?type=${uploadType}`, { method: 'POST', body: formData })
    if (res.ok) load()
    setUploading(false)
  }

  const filtered = items.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false
    if (!search) return true
    const kw = search.toLowerCase()
    return (
      item.originalName?.toLowerCase().includes(kw) ||
      item.fileName?.toLowerCase().includes(kw)
    )
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#E8DCC8]">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#8B6A1B]">MEDIA</p>
            <h2 className="text-lg font-bold">媒体库</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex flex-col gap-3 border-b border-[#E8DCC8] p-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="搜索文件名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-[#E8DCC8] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#C49A2B]"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#E8DCC8] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#C49A2B]"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp4,.mp3,.glb,.gltf,.obj,.fbx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-[#C49A2B] hover:bg-[#B08920] text-white rounded-lg text-sm whitespace-nowrap disabled:opacity-50"
          >
            {uploading ? '上传中...' : '+ 上传'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-gray-400 py-8">加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无媒体文件</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.url); onClose() }}
                  className="group rounded-lg border border-[#E8DCC8] p-2 text-left transition-colors hover:border-[#C49A2B] hover:bg-[#FDFBF7]"
                >
                  {isImage(item.fileName || item.originalName, item.type) ? (
                    <div className="relative mb-2 aspect-square overflow-hidden rounded bg-[#F5F0E8]">
                      <SmartImage
                        src={item.url}
                        alt={item.originalName}
                        fill
                        sizes="160px"
                        className="object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="mb-2 flex aspect-square items-center justify-center rounded bg-[#F5F0E8] text-sm font-semibold text-[#8B6A1B]">
                      {item.type === 'course' ? '课件' : item.type === 'scene' ? '场景' : '文档'}
                    </div>
                  )}
                  <p className="text-xs text-gray-700 truncate group-hover:text-[#4A3728]" title={item.originalName || item.fileName}>
                    {item.originalName || item.fileName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.type || '其他'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
