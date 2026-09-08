import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { findMergeCandidates, previewMerge, executeMerge } from '@/lib/mergeService'

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  if (!sourceId) return NextResponse.json({ success: false, message: '需要 sourceId 参数' }, { status: 400 })

  try {
    const candidates = await findMergeCandidates(sourceId)
    return NextResponse.json({ success: true, candidates })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const action = body.action || 'execute'

    if (action === 'preview') {
      const { sourceId1, sourceId2 } = body
      if (!sourceId1 || !sourceId2) {
        return NextResponse.json({ success: false, message: '需要 sourceId1 和 sourceId2 参数' }, { status: 400 })
      }
      const preview = await previewMerge(sourceId1, sourceId2)
      return NextResponse.json({ success: true, preview })
    }

    // execute
    const { sourceId1, sourceId2, approvedBy } = body
    if (!sourceId1 || !sourceId2) {
      return NextResponse.json({ success: false, message: '需要 sourceId1 和 sourceId2 参数' }, { status: 400 })
    }
    const result = await executeMerge(sourceId1, sourceId2, approvedBy || 'admin')
    return NextResponse.json({ success: true, mergeResult: result })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
