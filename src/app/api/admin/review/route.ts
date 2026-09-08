import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/dataService'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  try {
    const allSources = await db.sources.all()
    let filtered = allSources.filter(s => !s.isDeleted)

    if (status !== 'all') {
      filtered = filtered.filter(s => (s.reviewStatus || 'pending') === status)
    } else {
      filtered = filtered.filter(s => s.reviewStatus)
    }

    filtered.sort((a, b) => new Date(b.importedAt || b.createdAt).getTime() - new Date(a.importedAt || a.createdAt).getTime())

    const counts = {
      pending: allSources.filter(s => !s.isDeleted && (s.reviewStatus || 'pending') === 'pending').length,
      approved: allSources.filter(s => !s.isDeleted && s.reviewStatus === 'approved').length,
      rejected: allSources.filter(s => !s.isDeleted && s.reviewStatus === 'rejected').length,
    }

    // 为每条待审核史料附带关联史料详情
    const items = await Promise.all(filtered.map(async (s) => {
      const relatedDetails: any[] = []
      if (s.relatedSources?.length) {
        for (const rid of s.relatedSources) {
          const related = await db.sources.getById(rid)
          if (related) {
            relatedDetails.push({
              id: related.id,
              title: related.title,
              category: related.category || '',
              credibilityLevel: related.credibilityLevel,
              aiSummary: (related.aiSummary || related.description || '').slice(0, 100),
              fileType: related.fileType || '',
              fileUrl: related.fileUrl || '',
              fileExt: related.fileExt || '',
            })
          }
        }
      }
      return { ...s, relatedDetails }
    }))

    return NextResponse.json({ success: true, items, counts })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id, action, reviewedBy, note } = await request.json()
    if (!id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: '参数无效' }, { status: 400 })
    }

    const source = await db.sources.getById(id)
    if (!source) {
      return NextResponse.json({ success: false, message: '史料不存在' }, { status: 404 })
    }

    const updateData: any = {
      reviewStatus: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: reviewedBy || 'admin',
      reviewedAt: new Date().toISOString(),
    }
    if (note) updateData.reviewReason = (source.reviewReason || '') + ` [审核备注: ${note}]`

    const updated = await db.sources.update(id, updateData)

    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
