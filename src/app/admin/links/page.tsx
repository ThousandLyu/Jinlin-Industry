'use client'

import { useEffect, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import type { SourceLink } from '@/types'

export default function AdminLinksPage() {
  const [links, setLinks] = useState<SourceLink[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all')

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/links')
      const data = await res.json()
      if (data.success) setLinks(data.links || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLinks() }, [])

  const approve = async (id: string) => {
    await fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) })
    fetchLinks()
  }

  const reject = async (id: string) => {
    await fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'reject' }) })
    fetchLinks()
  }

  const discover = async () => {
    await fetch('/api/links/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    fetchLinks()
  }

  const filtered = links.filter(l => {
    if (filter === 'approved') return l.isApproved
    if (filter === 'pending') return !l.isApproved
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <AdminPageHeader title="文献关联管理" description="AI自动发现+人工审核文献之间的关联关系" />

      <div className="flex gap-3 mb-4">
        {(['all', 'approved', 'pending'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {f === 'all' ? `全部 (${links.length})` : f === 'approved' ? `已确认 (${links.filter(l => l.isApproved).length})` : `待审核 (${links.filter(l => !l.isApproved).length})`}
          </button>
        ))}
        <button onClick={discover} className="px-3 py-1 rounded text-sm bg-amber-600 text-white hover:bg-amber-700 ml-auto">
          AI发现关联
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">暂无关联。点击"AI发现关联"按钮开始。关联发现过程可能需要几分钟，请在AI处理完成后刷新页面。</p>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map(link => (
            <div key={link.id} className="border rounded p-3 bg-white flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  史料A: {link.sourceId} → 史料B: {link.targetId}
                </div>
                <div className="flex gap-2 mt-1 text-xs text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded ${link.confidence >= 0.9 ? 'bg-green-100 text-green-700' : link.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}`}>
                    {link.relationType} · 置信度 {(link.confidence * 100).toFixed(0)}%
                  </span>
                  {link.aiReason && <span className="truncate">{link.aiReason}</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                {!link.isApproved ? (
                  <>
                    <button onClick={() => approve(link.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded">确认</button>
                    <button onClick={() => reject(link.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded">拒绝</button>
                  </>
                ) : (
                  <span className="text-xs text-green-600">已确认</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
