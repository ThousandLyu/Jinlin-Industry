'use client'
import { useState, useEffect, useRef, DragEvent, useCallback, useMemo } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import MediaPickerField from '@/components/admin/MediaPickerField'
import Pagination from '@/components/shared/Pagination'
import SmartImage from '@/components/shared/SmartImage'

interface Source {
  id: string
  title: string
  author?: string
  type?: string
  sourceType?: string
  publishDate?: string
  publicationYear?: number
  publisher?: string
  url?: string
  fileUrl?: string
  description?: string
  category?: string
  credibilityLevel?: 'A' | 'B' | 'C'
  grade?: 'A' | 'B' | 'C'
  fileType?: string
  fileName?: string
  fileSize?: number
  fileExt?: string
  mimeType?: string
  sourceFileKind?: string
  aiReadable?: boolean
  extractStatus?: 'pending' | 'success' | 'failed' | 'unsupported'
  extractError?: string
  textPath?: string
  textCharCount?: number
  summaryStatus?: 'pending' | 'success' | 'failed' | 'unsupported'
  aiSummary?: string
  summaryUpdatedAt?: string
  importedBy?: string
  importedAt?: string
  createdAt?: string
  isDeleted?: boolean
  reviewStatus?: 'pending' | 'approved' | 'rejected'
}

interface ImportResult {
  success: boolean
  baseDir: string
  imported: number
  skipped: number
  errors: Array<{ file: string; message: string }>
  duplicatesFound?: Array<{
    title: string
    existingTitle: string
    existingId: string
    reason: 'exact_hash' | 'similar_title'
  }>
}

const SOURCE_FILE_KINDS = ['pdf', 'txt', 'md', 'docx', 'doc', 'xlsx', 'csv', 'image', 'model', 'audio', 'video', 'other']

/** 智能解析文件名：提取级别（A/B/C）和标题 */
function parseFileNameForGrade(fileName: string): { grade: 'A' | 'B' | 'C'; title: string } {
  const extIdx = fileName.lastIndexOf('.')
  const baseName = extIdx > 0 ? fileName.substring(0, extIdx) : fileName

  // 匹配开头或分隔后的 A/B/C（可选 - 或 _ 或 空格分隔）
  const match = baseName.match(/^[ABC][-_—\s]+(.+)$/i)
  if (match) {
    const grade = match[0].charAt(0).toUpperCase() as 'A' | 'B' | 'C'
    const title = match[1].trim() || baseName
    return { grade, title }
  }
  return { grade: 'C', title: baseName }
}

export default function AdminSourcesPage() {
  const [items, setItems] = useState<Source[]>([])
  const [edit, setEdit] = useState<Source | null>(null)
  const [preview, setPreview] = useState<Source | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [readableFilter, setReadableFilter] = useState('')
  const [summaryFilter, setSummaryFilter] = useState('')
  const [reviewFilter, setReviewFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batching, setBatching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // 拖拽状态
  const [dragOver, setDragOver] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [parsedPreview, setParsedPreview] = useState<{ grade: string; title: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/data?type=sources')
    const data = await res.json()
    setItems(data.filter((i: Source) => !i.isDeleted))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // 获取当前登录用户名
  const getCurrentUserName = async (): Promise<string> => {
    try {
      const res = await fetch('/api/auth')
      const data = await res.json()
      return data.username || 'admin'
    } catch {
      return 'admin'
    }
  }

  // 处理拖拽上传单个文件
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length === 0) return
    const file = files[0]
    setDroppedFile(file)
    const parsed = parseFileNameForGrade(file.name)
    setParsedPreview(parsed)
    setUploadMessage(null)
  }, [])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)

  // 通过文件选择器选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDroppedFile(file)
    const parsed = parseFileNameForGrade(file.name)
    setParsedPreview(parsed)
    setUploadMessage(null)
  }

  // 上传单个文件
  const handleUploadSingle = async () => {
    if (!droppedFile) return
    setUploading(true)
    setUploadMessage(null)
    try {
      const importedBy = await getCurrentUserName()
      const formData = new FormData()
      formData.append('file', droppedFile)
      formData.append('importedBy', importedBy)
      if (parsedPreview) {
        formData.append('grade', parsedPreview.grade)
        formData.append('title', parsedPreview.title)
      }

      const res = await fetch('/api/import/sources/file', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        let msg = `✅ ${droppedFile.name} 导入成功（${parsedPreview?.grade || 'C'}级）`
        if (data.similarWarning && data.similarWarning.length > 0) {
          msg += ` | ⚠ 疑似重复：${data.similarWarning.map((s: any) => s.title).join('、')}`
        }
        setUploadMessage(msg)
        setDroppedFile(null)
        setParsedPreview(null)
        setImportResult(null)
        load()
      } else if (res.status === 409) {
        const err = await res.json()
        setUploadMessage(`⚠ 重复文件：${err.message}（已有：${err.existing?.title || '未知'}，导入时间：${err.existing?.importedAt ? new Date(err.existing.importedAt).toLocaleString('zh-CN') : '未知'}）`)
      } else {
        const err = await res.json()
        setUploadMessage(`❌ 导入失败：${err.message || '未知错误'}`)
      }
    } catch (err) {
      setUploadMessage(`❌ 上传错误：${String(err)}`)
    } finally {
      setUploading(false)
    }
  }

  const clearDrop = () => {
    setDroppedFile(null)
    setParsedPreview(null)
    setUploadMessage(null)
  }

  const handleImport = async () => {
    setImporting(true)
    setImportResult(null)
    try {
      const importedBy = await getCurrentUserName()
      const res = await fetch('/api/import/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importedBy }),
      })
      const result = await res.json()
      setImportResult(result)
      if (res.ok) await load()
    } finally {
      setImporting(false)
    }
  }

  const handleSave = async (form: Partial<Source>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sources', data: normalizeForm(form), id: edit?.id }),
    })
    if (res.ok) { setShowForm(false); setEdit(null); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条史料记录吗？')) return
    const res = await fetch('/api/data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sources', id }),
    })
    if (res.ok) {
      setShowForm(false)
      setEdit(null)
      load()
    }
  }

  const selectedItems = useMemo(() => items.filter(item => selectedIds.includes(item.id)), [items, selectedIds])

  const toggleSelected = (id: string) => {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const togglePageSelected = () => {
    const pageIds = paged.map(item => item.id)
    const allSelected = pageIds.every(id => selectedIds.includes(id))
    setSelectedIds(current => allSelected ? current.filter(id => !pageIds.includes(id)) : Array.from(new Set([...current, ...pageIds])))
  }

  const runBatch = async (action: 'summary' | 'extract_and_summary', ids = selectedIds) => {
    if (ids.length === 0) return
    setBatching(true)
    try {
      await fetch('/api/sources/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      })
      await load()
    } finally {
      setBatching(false)
    }
  }

  const exportSelected = () => {
    if (selectedIds.length === 0) return
    window.location.href = `/api/export?type=sources&format=zip&ids=${encodeURIComponent(selectedIds.join(','))}`
  }

  const handleSort = (field: string) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }

  const sortArrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const filtered = useMemo(() => {
    let list = items.filter((item) => {
      const keyword = search.trim().toLowerCase()
      if (!keyword) return true
      return [
        item.title,
        item.fileName,
        item.fileType,
        item.sourceFileKind,
        item.author,
        item.importedBy,
        item.credibilityLevel || item.grade,
        item.description,
        item.aiSummary,
      ].some(value => String(value || '').toLowerCase().includes(keyword))
    })
    if (fileTypeFilter) list = list.filter(item => normalizeFileType(item.sourceFileKind || item.fileType || item.category || item.type) === fileTypeFilter)
    if (readableFilter) list = list.filter(item => readableFilter === 'readable' ? item.aiReadable : !item.aiReadable)
    if (summaryFilter) list = list.filter(item => (item.summaryStatus || 'pending') === summaryFilter)
    if (reviewFilter) list = list.filter(item => (item.reviewStatus || 'pending') === reviewFilter)
    list = [...list].sort((a, b) => {
      const av = (a as any)[sortField]; const bv = (b as any)[sortField]
      if (av == null && bv == null) return 0
      if (av == null) return 1; if (bv == null) return -1
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv), 'zh-CN') : av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [items, search, fileTypeFilter, readableFilter, summaryFilter, reviewFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const Th = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="text-left p-3 cursor-pointer hover:text-[#C49A2B] select-none whitespace-nowrap" onClick={() => handleSort(field)}>
      {children}{sortArrow(field)}
    </th>
  )

  return (
    <div className="admin-workspace">
      <AdminPageHeader
        title="史料库管理"
        description="拖拽文件即可快速导入，文本类史料会提取为 AI 可读纯文本并生成简述。"
        actions={
          <>
          <button onClick={handleImport} disabled={importing} className="admin-button admin-button-primary">
            {importing ? '导入中...' : '一键导入文件夹'}
          </button>
          <button onClick={() => { setEdit(null); setShowForm(true) }} className="admin-button admin-button-accent">新增史料</button>
          </>
        }
      />

      {/* 拖拽上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#C49A2B] bg-[#C49A2B]/5'
            : 'border-[#E8DCC8] bg-[#FDFBF7] hover:border-[#C49A2B]/50 hover:bg-[#C49A2B]/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="*"
        />
        {droppedFile ? (
          <div className="space-y-2">
            <p className="text-lg font-medium text-[#4A3728]">{droppedFile.name}</p>
            <p className="text-sm text-gray-500">
              大小：{(droppedFile.size / 1024).toFixed(1)} KB
            </p>
            {parsedPreview && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  parsedPreview.grade === 'A' ? 'bg-green-100 text-green-700' :
                  parsedPreview.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {parsedPreview.grade}级
                </span>
                <span className="text-sm text-[#4A3728] font-medium">
                  标题：{parsedPreview.title}
                </span>
              </div>
            )}
            <div className="flex justify-center gap-3 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); clearDrop() }}
                className="px-3 py-1.5 border border-[#E8DCC8] rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleUploadSingle() }}
                disabled={uploading}
                className="px-4 py-1.5 bg-[#C49A2B] text-white rounded-lg text-sm hover:bg-[#B08920] disabled:opacity-50"
              >
                {uploading ? '正在导入...' : '确认导入'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#D9C9AE] text-sm font-semibold text-[#8B6A1B]">导入</div>
            <p className="text-[#4A3728] font-medium">拖拽史料文件到此处</p>
            <p className="text-sm text-gray-400">或点击此处选择文件 · 文件名以 A/B/C 开头自动识别级别</p>
            <p className="text-xs text-gray-400">导入人将自动使用当前登录账户姓名</p>
          </div>
        )}
        {uploadMessage && (
          <p className={`mt-3 text-sm font-medium ${uploadMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {uploadMessage}
          </p>
        )}
      </div>

      {importResult && (
        <div className="mb-4 rounded-lg border border-[#E8DCC8] bg-white p-4 text-sm">
          <p className="font-medium text-[#4A3728]">导入目录：{importResult.baseDir}</p>
          <p className="mt-1 text-gray-600">新增 {importResult.imported} 条，跳过重复 {importResult.skipped} 条，失败 {importResult.errors?.length || 0} 条。</p>
          {importResult.errors?.length > 0 && (
            <div className="mt-2 text-red-600">
              {importResult.errors.slice(0, 3).map(error => <p key={error.file}>{error.file}: {error.message}</p>)}
            </div>
          )}
          {importResult.duplicatesFound && importResult.duplicatesFound.length > 0 && (
            <div className="mt-2 border-t border-[#E8DCC8] pt-2">
              <p className="font-medium text-[#8B6A1B]">重复筛查结果：</p>
              {importResult.duplicatesFound.filter(d => d.reason === 'exact_hash').length > 0 && (
                <p className="text-green-700">
                  精确重复（已跳过）：{importResult.duplicatesFound.filter(d => d.reason === 'exact_hash').length} 条
                  <span className="text-gray-400 ml-2">
                    {importResult.duplicatesFound.filter(d => d.reason === 'exact_hash').slice(0, 5).map(d => d.title).join('、')}
                  </span>
                </p>
              )}
              {importResult.duplicatesFound.filter(d => d.reason === 'similar_title').length > 0 && (
                <p className="text-orange-600">
                  疑似重复（已导入但建议核对）：{importResult.duplicatesFound.filter(d => d.reason === 'similar_title').length} 条
                  <span className="text-gray-400 ml-2">
                    {importResult.duplicatesFound.filter(d => d.reason === 'similar_title').slice(0, 5).map(d => `${d.title} ≈ ${d.existingTitle}`).join('、')}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <input type="text" placeholder="搜索等级、文件名称、文件类型、导入人、说明..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        className="admin-control w-full" />

      <div className="admin-panel grid gap-3 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <select value={fileTypeFilter} onChange={e => { setFileTypeFilter(e.target.value); setPage(1) }}
          className="admin-control">
          <option value="">全部文件类型</option>
          {SOURCE_FILE_KINDS.map(kind => <option key={kind} value={kind}>{typeLabel(kind)}</option>)}
        </select>
        <select value={readableFilter} onChange={e => { setReadableFilter(e.target.value); setPage(1) }}
          className="admin-control">
          <option value="">全部可读状态</option>
          <option value="readable">AI 可读</option>
          <option value="unreadable">AI 不可读</option>
        </select>
        <select value={summaryFilter} onChange={e => { setSummaryFilter(e.target.value); setPage(1) }}
          className="admin-control">
          <option value="">全部简述状态</option>
          <option value="success">已生成</option>
          <option value="pending">待生成</option>
          <option value="failed">失败</option>
          <option value="unsupported">不支持</option>
        </select>
        <select value={reviewFilter} onChange={e => { setReviewFilter(e.target.value); setPage(1) }}
          className="admin-control">
          <option value="">全部审核状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/review" className="admin-button admin-button-accent text-sm no-underline">
            审核中心
          </a>
          <button onClick={exportSelected} disabled={selectedIds.length === 0}
            className="admin-button admin-button-outline">
            导出选中({selectedIds.length})
          </button>
          <button onClick={() => runBatch('summary')} disabled={selectedIds.length === 0 || batching}
            className="admin-button admin-button-primary">
            批量简述
          </button>
          <button onClick={() => runBatch('extract_and_summary')} disabled={selectedIds.length === 0 || batching}
            className="admin-button admin-button-accent">
            重试提取
          </button>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <p className="mb-3 text-xs text-gray-500">已选择 {selectedItems.length} 条史料，可导出 ZIP、批量生成简述或重试文本提取。</p>
      )}

      {loading ? <p className="text-gray-400">加载中...</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="p-3">
                  <input type="checkbox" checked={paged.length > 0 && paged.every(item => selectedIds.includes(item.id))} onChange={togglePageSelected} />
                </th>
                <Th field="credibilityLevel">等级</Th>
                <Th field="fileName">文件名称</Th>
                <Th field="fileType">文件类型</Th>
                <Th field="aiReadable">AI可读</Th>
                <Th field="summaryStatus">简述</Th>
                <Th field="reviewStatus">审核</Th>
                <Th field="textCharCount">字数</Th>
                <Th field="importedBy">导入人</Th>
                <Th field="createdAt">上传时间</Th>
                <th className="text-left p-3 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>{paged.map((item) => (
              <tr key={item.id}>
                <td className="p-3">
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
                </td>
                <td className="p-3"><GradeBadge grade={getGrade(item)} /></td>
                <td className="p-3">
                  <div className="font-medium text-[#4A3728] max-w-[220px] break-all leading-tight" title={item.fileName || item.title}>{(item.fileName || item.title || '').replace(/\.[^.]+$/, '')}</div>
                  {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">查看文件</a>}
                </td>
                <td className="p-3"><span className="text-xs bg-[#C49A2B]/10 text-[#8B6A1B] px-2 py-0.5 rounded">{typeLabel(item.sourceFileKind || item.fileType || item.category || item.type || item.sourceType)}</span></td>
                <td className="p-3"><ReadableBadge item={item} /></td>
                <td className="p-3"><SummaryBadge status={item.summaryStatus} /></td>
                <td className="p-3"><ReviewBadge status={(item as any).reviewStatus || 'pending'} /></td>
                <td className="p-3 text-gray-600">{item.textCharCount ? item.textCharCount.toLocaleString('zh-CN') : '-'}</td>
                <td className="p-3 text-gray-600">{item.importedBy || item.author || '-'}</td>
                <td className="p-3 text-gray-600">{formatDate(item.importedAt || item.createdAt)}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => setPreview(item)} className="text-[#8B6A1B] hover:text-[#4A3728]">预览</button>
                    <button onClick={() => { setEdit(item); setShowForm(true) }} className="text-blue-600 hover:text-blue-800">编辑</button>
                    <button onClick={() => runBatch('summary', [item.id])} className="text-green-700 hover:text-green-900">简述</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      {showForm && <FormModal item={edit} onClose={() => { setShowForm(false); setEdit(null) }} onSave={handleSave} onDelete={handleDelete} />}
      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function FormModal({ item, onClose, onSave, onDelete }: { item: Source | null; onClose: () => void; onSave: (d: Partial<Source>) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState<Partial<Source>>(item || {
    title: '',
    author: '',
    type: 'archive',
    publishDate: '',
    publisher: '',
    url: '',
    fileUrl: '',
    description: '',
    category: '',
    credibilityLevel: 'C',
    fileType: 'other',
    sourceFileKind: 'other',
    aiReadable: false,
    extractStatus: 'pending',
    summaryStatus: 'pending',
  })

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="admin-modal-card max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{item ? '编辑史料' : '新增史料'}</h2>
        <div className="space-y-3">
          <TextField label="标题" value={form.title} onChange={value => setForm({...form, title: value})} />
          <TextField label="作者/导入人" value={form.author} onChange={value => setForm({...form, author: value})} />
          <MediaPickerField label="文件地址" value={form.fileUrl || form.url || ''} onChange={value => setForm({...form, fileUrl: value})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">简述</label>
            <textarea value={form.aiSummary || form.description || ''} onChange={e => setForm({...form, aiSummary: e.target.value, description: e.target.value})} rows={4}
              className="admin-control w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文件类型</label>
              <select value={normalizeFileType(form.sourceFileKind || form.fileType || form.category || form.type || form.sourceType)} onChange={e => setForm({...form, sourceFileKind: e.target.value, fileType: e.target.value, category: e.target.value})}
                className="admin-control w-full">
                {SOURCE_FILE_KINDS.map(kind => <option key={kind} value={kind}>{typeLabel(kind)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
              <select value={form.credibilityLevel || form.grade || 'C'} onChange={e => setForm({...form, credibilityLevel: e.target.value as 'A' | 'B' | 'C'})}
                className="admin-control w-full">
                <option value="A">A级</option>
                <option value="B">B级</option>
                <option value="C">C级</option>
              </select>
            </div>
          </div>
          <div className="rounded-lg border border-[#E8DCC8] bg-[#FDFBF7] p-3 text-xs leading-6 text-gray-600">
            <p>AI 可读：{form.aiReadable ? '是' : '否'} · 提取状态：{form.extractStatus || 'pending'} · 简述状态：{form.summaryStatus || 'pending'}</p>
            <p>文本字数：{form.textCharCount || 0}</p>
            {form.extractError && <p className="text-red-600">提取提示：{form.extractError}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-6">
          {item ? <button onClick={() => onDelete(item.id)} className="admin-button admin-button-danger">删除史料</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="admin-button admin-button-outline">取消</button>
            <button onClick={() => onSave(form)} className="admin-button admin-button-accent">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        className="admin-control w-full" />
    </div>
  )
}

function normalizeForm(form: Partial<Source>) {
  const kind = normalizeFileType(form.sourceFileKind || form.fileType || form.category || form.type)
  return {
    ...form,
    title: form.title || '',
    type: toSourceType(kind),
    author: form.author || form.importedBy || '',
    publisher: form.publisher || '',
    publishDate: form.publishDate || '',
    url: form.url || '',
    fileUrl: form.fileUrl || '',
    description: form.aiSummary || form.description || '',
    category: kind,
    credibilityLevel: form.credibilityLevel || form.grade || 'C',
    fileType: kind,
    sourceFileKind: kind,
    aiSummary: form.aiSummary || form.description || '',
  }
}

function getGrade(item: Source) {
  return item.credibilityLevel || item.grade || 'C'
}

function GradeBadge({ grade }: { grade: string }) {
  const className = grade === 'A'
    ? 'bg-green-100 text-green-700'
    : grade === 'B'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${className}`}>{grade}级</span>
}

function ReadableBadge({ item }: { item: Source }) {
  if (item.aiReadable) return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">可读</span>
  const status = item.extractStatus || 'pending'
  const text = status === 'pending' ? '待提取' : status === 'unsupported' ? '不支持' : '不可读'
  const tone = status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone}`} title={item.extractError || ''}>{text}</span>
}

function SummaryBadge({ status = 'pending' }: { status?: string }) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    unsupported: 'bg-gray-100 text-gray-600',
  }
  const label: Record<string, string> = {
    success: '已生成',
    pending: '待生成',
    failed: '失败',
    unsupported: '不支持',
  }
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${map[status] || map.pending}`}>{label[status] || '待生成'}</span>
}

function ReviewBadge({ status = 'pending' }: { status?: string }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = {
    approved: '已通过',
    pending: '待审核',
    rejected: '已拒绝',
  }
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${map[status] || map.pending}`}>{label[status] || '待审核'}</span>
}

function typeLabel(type?: string) {
  const map: Record<string, string> = {
    pdf: 'PDF',
    txt: 'TXT',
    md: 'Markdown',
    docx: 'Word',
    doc: '旧版Word',
    xlsx: 'Excel',
    csv: 'CSV',
    image: '图片',
    model: '模型',
    audio: '音频',
    video: '视频',
    other: '其他',
    localGazetteer: '地方志',
    bookOrJournal: '书刊',
    document: '文献',
    article: '文章',
    map: '地图',
    spreadsheet: '表格',
    archive: '文献',
    journal: '文章',
    book: '书刊',
    newspaper: '报刊',
    website: '网站',
    oral: '口述',
  }
  return map[type || ''] || type || '其他'
}

function normalizeFileType(type?: string) {
  if (!type) return 'other'
  if (SOURCE_FILE_KINDS.includes(type)) return type
  if (['地方志'].includes(type)) return 'localGazetteer'
  if (['书籍', '书刊', '学术著作', 'book', 'journal', 'newspaper'].includes(type)) return 'bookOrJournal'
  if (['图片', '历史影像'].includes(type)) return 'image'
  if (['spreadsheet'].includes(type)) return 'xlsx'
  if (['article', 'archive', 'document'].includes(type)) return 'other'
  return type
}

function toSourceType(fileType: string): Source['type'] {
  if (fileType === 'bookOrJournal' || fileType === 'pdf' || fileType === 'docx') return 'book'
  if (fileType === 'audio') return 'oral'
  if (fileType === 'image') return 'archive'
  return 'archive'
}

function PreviewModal({ item, onClose }: { item: Source; onClose: () => void }) {
  const fileUrl = item.fileUrl || item.url || ''
  const fileType = normalizeFileType(item.sourceFileKind || item.fileType || item.category || item.type || item.sourceType)
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="admin-modal-card max-w-3xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">{item.title}</h2>
            <p className="text-sm text-gray-500">{typeLabel(fileType)} · {getGrade(item)}级 · {item.author || item.importedBy || '-'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">关闭</button>
        </div>
        {fileUrl ? (
          fileType === 'image' ? (
            <div className="relative h-[60vh] w-full rounded-lg border border-[#E8DCC8] bg-[#F5F0E8]">
              <SmartImage src={fileUrl} alt={item.title} fill sizes="80vw" className="object-contain" />
            </div>
          ) : (
            <iframe src={fileUrl} title={item.title} className="h-[60vh] w-full rounded-lg border border-[#E8DCC8]" />
          )
        ) : (
          <div className="rounded-lg bg-[#F5F0E8] p-6 text-sm text-gray-500">该史料没有绑定文件地址。</div>
        )}
        <div className="mt-4 rounded-lg border border-[#E8DCC8] bg-[#FDFBF7] p-3 text-xs leading-6 text-gray-600">
          <p>AI 可读：{item.aiReadable ? '是' : '否'} · 提取状态：{item.extractStatus || 'pending'} · 文本字数：{item.textCharCount || 0}</p>
          <p>简述状态：{item.summaryStatus || 'pending'}{item.summaryUpdatedAt ? ` · ${formatDate(item.summaryUpdatedAt)}` : ''}</p>
          {item.extractError && <p className="text-red-600">提取提示：{item.extractError}</p>}
        </div>
        {(item.aiSummary || item.description) && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.aiSummary || item.description}</p>}
      </div>
    </div>
  )
}

function formatFileSize(size?: number) {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
