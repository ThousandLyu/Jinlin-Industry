'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import Pagination from '@/components/shared/Pagination'
import SmartImage from '@/components/shared/SmartImage'

interface RelatedDetail {
  id: string
  title: string
  category: string
  credibilityLevel: string
  aiSummary: string
  fileType: string
  fileUrl: string
  fileExt: string
}

interface ReviewItem {
  id: string
  title: string
  type: string
  category: string
  credibilityLevel: 'A' | 'B' | 'C'
  author: string
  description: string
  aiSummary?: string
  fileType: string
  fileName: string
  fileUrl: string
  fileExt: string
  mimeType: string
  reviewStatus: 'pending' | 'approved' | 'rejected'
  reviewConfidence: number
  reviewReason: string
  reviewedBy?: string
  reviewedAt?: string
  relatedDetails: RelatedDetail[]
  importedAt: string
}

export default function AdminReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // 合并相关状态
  const [mergeSource, setMergeSource] = useState<ReviewItem | null>(null)
  const [mergePreview, setMergePreview] = useState<any>(null)
  const [merging, setMerging] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState<string>('')
  const [candidates, setCandidates] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/review?status=${filter}`)
    const data = await res.json()
    if (data.success) {
      setItems(data.items || [])
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0 })
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'approve' | 'reject', note?: string) => {
    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewedBy: 'admin', note }),
    })
    const data = await res.json()
    if (data.success) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, reviewStatus: action === 'approve' ? 'approved' : 'rejected' } as ReviewItem : i))
      load()
    }
  }

  const openMergeModal = async (source: ReviewItem) => {
    setMergeSource(source)
    setMergePreview(null)
    setCandidates([])
    setMergeTargetId('')
    const res = await fetch(`/api/admin/merge?sourceId=${source.id}`)
    const data = await res.json()
    if (data.success && data.candidates?.length > 0) {
      setCandidates(data.candidates.filter((c: any) => c.similarity >= 0.7))
    }
  }

  const loadMergePreview = async (targetId: string) => {
    if (!mergeSource) return
    setMergeTargetId(targetId)
    const res = await fetch('/api/admin/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview', sourceId1: mergeSource.id, sourceId2: targetId }),
    })
    const data = await res.json()
    if (data.success) setMergePreview(data.preview)
  }

  const confirmMerge = async () => {
    if (!mergeSource || !mergeTargetId) return
    setMerging(true)
    const res = await fetch('/api/admin/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId1: mergeSource.id, sourceId2: mergeTargetId, approvedBy: 'admin' }),
    })
    const data = await res.json()
    setMerging(false)
    if (data.success) {
      setMergeSource(null)
      setMergePreview(null)
      setCandidates([])
      setMergeTargetId('')
      load()
    } else {
      alert('合并失败: ' + (data.message || '未知错误'))
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: '待审核', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { label: '已通过', cls: 'bg-green-100 text-green-800 border-green-300' },
      rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-800 border-red-300' },
    }
    const s = map[status] || map.pending
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
  }

  const getConfidenceColor = (v: number) => {
    if (v >= 0.8) return 'text-green-700'
    if (v >= 0.6) return 'text-yellow-700'
    return 'text-red-700'
  }

  const isImageFile = (item: RelatedDetail) => {
    const ext = (item.fileExt || '').toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)
  }

  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(items.length / PAGE_SIZE)

  return (
    <div className="admin-review-page">
      <AdminPageHeader title="史料审核" />

      {/* 筛选标签 */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'pending', label: `待审核 ${counts.pending}` },
          { key: 'approved', label: `已通过 ${counts.approved}` },
          { key: 'rejected', label: `已拒绝 ${counts.rejected}` },
          { key: 'all', label: '全部' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1) }}
            className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === tab.key
                ? 'bg-brown text-cream border-brown'
                : 'bg-white text-brown border-border hover:bg-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-ink-soft py-12">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-ink-soft py-12">暂无{filter === 'pending' ? '待审核' : filter === 'approved' ? '已通过' : filter === 'rejected' ? '已拒绝' : ''}史料</div>
      ) : (
        <div className="space-y-4">
          {paginated.map(item => (
            <div key={item.id} className="admin-review-card bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-archive transition-shadow">
              <div className="flex gap-6">
                {/* AI 置信度 */}
                <div className="flex-shrink-0 w-20 text-center">
                  <div className={`text-2xl font-bold ${getConfidenceColor(item.reviewConfidence)}`}>
                    {item.reviewConfidence ? `${Math.round(item.reviewConfidence * 100)}%` : '—'}
                  </div>
                  <div className="text-xs text-ink-soft mt-1">AI置信度</div>
                  {item.reviewReason && (
                    <div className="text-xs text-ink-soft mt-2 leading-relaxed">{item.reviewReason.slice(0, 60)}</div>
                  )}
                </div>

                {/* 史料信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(item.reviewStatus || 'pending')}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.credibilityLevel === 'A' ? 'bg-green-50 text-green-700' :
                      item.credibilityLevel === 'B' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{item.credibilityLevel}级</span>
                    <span className="text-xs text-ink-soft">{item.category || '未分类'}</span>
                  </div>
                  <div className="font-semibold text-brown text-base mb-1 truncate" title={item.title}>{item.title}</div>
                  <div className="text-sm text-ink-soft line-clamp-2 mb-2">
                    {item.aiSummary || item.description || '暂无摘要'}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {item.author || '未知作者'} · {item.importedAt ? new Date(item.importedAt).toLocaleDateString('zh-CN') : ''}
                    {item.fileName && ` · ${item.fileName}`}
                  </div>
                </div>

                {/* 操作按钮 */}
                {item.reviewStatus === 'pending' || !item.reviewStatus ? (
                  <div className="flex-shrink-0 flex flex-col gap-2 justify-center">
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'reject')}
                      className="px-5 py-2 bg-red text-white text-sm rounded-lg hover:bg-red-dark transition-colors"
                    >
                      拒绝
                    </button>
                    <button
                      onClick={() => openMergeModal(item)}
                      className="px-5 py-2 bg-gold text-white text-sm rounded-lg hover:opacity-90 transition-colors"
                    >
                      合并
                    </button>
                  </div>
                ) : (
                  <div className="flex-shrink-0 flex flex-col items-end gap-1 text-xs text-ink-soft">
                    <span>{item.reviewStatus === 'approved' ? '已通过' : '已拒绝'}</span>
                    {item.reviewedBy && <span>审核人: {item.reviewedBy}</span>}
                    {item.reviewedAt && <span>{new Date(item.reviewedAt).toLocaleDateString('zh-CN')}</span>}
                  </div>
                )}
              </div>

              {/* 关联史料 */}
              {item.relatedDetails && item.relatedDetails.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-medium text-ink-soft mb-2">
                    库内相关史料（{item.relatedDetails.length}条）
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {item.relatedDetails.map((related, idx) => (
                      <a
                        key={related.id}
                        href={isImageFile(related) ? (related.fileUrl || '#') : (related.fileUrl ? related.fileUrl : '#')}
                        target={isImageFile(related) ? '_blank' : (related.fileUrl ? '_blank' : undefined)}
                        rel="noopener noreferrer"
                        download={!isImageFile(related) && related.fileUrl ? true : undefined}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-cream transition-colors group cursor-pointer"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/20 text-gold text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </span>
                        {isImageFile(related) ? (
                          <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-cream">
                            <SmartImage src={related.fileUrl} alt={related.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-12 h-12 rounded bg-brown/5 flex items-center justify-center text-brown/40">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-brown truncate group-hover:text-gold transition-colors">
                            {related.title}
                          </div>
                          <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-1">
                            <span className={`${
                              related.credibilityLevel === 'A' ? 'text-green-600' :
                              related.credibilityLevel === 'B' ? 'text-blue-600' : 'text-gray-500'
                            }`}>[{related.credibilityLevel}级]</span>
                            <span>{related.category}</span>
                          </div>
                          {related.aiSummary && (
                            <div className="text-xs text-ink-soft mt-1 line-clamp-1">{related.aiSummary}</div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} totalItems={items.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* 合并 Modal */}
      {mergeSource && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setMergeSource(null); setMergePreview(null); setCandidates([]) }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-panel p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-brown mb-4">史料合并</h2>
            <p className="text-sm text-ink-soft mb-4">
              主史料: <span className="font-medium text-brown">{mergeSource.title}</span>
            </p>

            {!mergePreview ? (
              <>
                <p className="text-sm font-medium text-ink-soft mb-2">选择要合并的目标史料:</p>
                {candidates.length === 0 ? (
                  <p className="text-sm text-ink-soft">未找到高度相似的史料（相似度 ≥ 70%），无法合并。</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {candidates.map((c: any) => (
                      <div
                        key={c.source2.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          mergeTargetId === c.source2.id ? 'border-gold bg-gold/5' : 'border-border hover:bg-cream'
                        }`}
                        onClick={() => loadMergePreview(c.source2.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-brown">{c.source2.title}</div>
                            <div className="text-xs text-ink-soft mt-1">
                              {c.hashDuplicate ? '内容哈希完全一致' : `标题相似度 ${Math.round(c.similarity * 100)}%`}
                              {' · '}{c.source2.credibilityLevel}级 · {c.source2.category || '未分类'}
                            </div>
                          </div>
                          <span className="text-xs text-gold">选择 →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* 合并预览 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cream rounded-lg">
                    <div className="text-xs text-ink-soft mb-1">史料A</div>
                    <div className="text-sm font-medium text-brown">{mergePreview.source1.title}</div>
                    <div className="text-xs text-ink-soft mt-2 line-clamp-3">{mergePreview.source1.aiSummary || mergePreview.source1.description}</div>
                  </div>
                  <div className="p-4 bg-cream rounded-lg">
                    <div className="text-xs text-ink-soft mb-1">史料B</div>
                    <div className="text-sm font-medium text-brown">{mergePreview.source2.title}</div>
                    <div className="text-xs text-ink-soft mt-2 line-clamp-3">{mergePreview.source2.aiSummary || mergePreview.source2.description}</div>
                  </div>
                </div>

                {/* AI 合并建议 */}
                <div className="p-4 bg-gold/5 border border-gold/20 rounded-lg">
                  <div className="text-sm font-medium text-brown mb-2">AI 合并建议</div>
                  <div className="mb-2">
                    <span className="text-xs text-ink-soft">合并标题: </span>
                    <span className="text-sm text-brown font-medium">{mergePreview.mergedTitle}</span>
                  </div>
                  {mergePreview.mergedSummary && (
                    <div className="mb-2">
                      <span className="text-xs text-ink-soft">合并摘要: </span>
                      <p className="text-sm text-brown mt-1">{mergePreview.mergedSummary}</p>
                    </div>
                  )}
                  {mergePreview.conflictItems?.length > 0 && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs font-medium text-red-700 mb-1">检测到内容冲突:</div>
                      <ul className="list-disc list-inside text-xs text-red-600">
                        {mergePreview.conflictItems.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setMergePreview(null); setMergeTargetId('') }}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-cream transition-colors"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={confirmMerge}
                    disabled={merging}
                    className="px-5 py-2 bg-gold text-white text-sm rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    {merging ? '合并中...' : '确认合并'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => { setMergeSource(null); setMergePreview(null); setCandidates([]) }}
              className="absolute top-4 right-4 text-ink-soft hover:text-brown"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
