import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/dataService'
import { detectRiskWords, assessRiskLevel, canPublishFact } from '@/lib/riskDetector'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  if (!type || !db[type as keyof typeof db]) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  if (searchParams.get('paginated') === 'true') {
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const sortField = searchParams.get('sortField') || undefined
    const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || undefined
    const category = searchParams.get('category') || undefined
    const service = db[type as keyof typeof db] as any

    if (category) {
      const all = await service.getAll()
      const filtered = all.filter((item: any) => (item.category || 'web') === category)
      const total = filtered.length
      const totalPages = Math.ceil(total / pageSize)
      const start = (page - 1) * pageSize
      const items = filtered.slice(start, start + pageSize)
      return NextResponse.json({ items, total, page, pageSize, totalPages })
    }

    const result = await service.getPaginated({ page, pageSize, sortField, sortDir })
    return NextResponse.json(result)
  }

  const data = await (db[type as keyof typeof db] as any).getAll()
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  const { type, data, id } = await request.json()
  if (!type || !db[type as keyof typeof db]) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  const service = db[type as keyof typeof db] as any

  if (type === 'facts') {
    if (!data.skipRiskAuto) {
      const riskWords = detectRiskWords(data.claimText || '')
      data.riskWords = riskWords
      data.riskLevel = assessRiskLevel(riskWords, [])
    }
    delete data.skipRiskAuto

    if (data.reviewStatus === 'approved' || data.isPublished) {
      const allSources = await db.sources.getAll()
      const sourceIds = data.sourceIds || []
      const sources = allSources.filter((s: any) => sourceIds.includes(s.id))
      const check = canPublishFact(data, sources)
      if (!check.canPublish) return NextResponse.json({ error: check.reason }, { status: 400 })
    }
  }

  let result
  if (id) {
    result = await service.update(id, data)
  } else {
    result = await service.create(data)
  }
  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  const { type, id } = await request.json()
  if (!type || !db[type as keyof typeof db] || !id) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  const service = db[type as keyof typeof db] as any
  await service.delete(id)

  // 级联清理：删除史料时联动清理 SourceLinks / AiTokens / Person.refs / Site.refs
  if (type === 'sources') {
    const cascadeInfo = { orphanLinks: 0, orphanTokens: 0, cleanedRefs: 0 }

    // 1. 级联软删除 SourceLinks
    const allLinks = await db.sourceLinks.all()
    for (const link of allLinks) {
      if ((link.sourceId === id || link.targetId === id) && !link.isDeleted) {
        await db.sourceLinks.update(link.id, { isDeleted: true } as any)
        cascadeInfo.orphanLinks++
      }
    }

    // 2. 级联软删除 AiTokens
    const allTokens = await db.aiTokens.all()
    for (const token of allTokens) {
      if (token.targetType === 'source' && token.targetId === id && !token.isDeleted) {
        await db.aiTokens.update(token.id, { isDeleted: true } as any)
        cascadeInfo.orphanTokens++
      }
    }

    // 3. 从 Person.sourceIds 移除
    const allPeople = await db.people.all()
    for (const p of allPeople) {
      if (p.sourceIds?.includes(id) && !p.isDeleted) {
        await db.people.update(p.id, { sourceIds: p.sourceIds.filter((sid: string) => sid !== id) } as any)
        cascadeInfo.cleanedRefs++
      }
    }

    // 4. 从 Site.sourceIds 移除
    const allSites = await db.sites.all()
    for (const s of allSites) {
      if (s.sourceIds?.includes(id) && !s.isDeleted) {
        await db.sites.update(s.id, { sourceIds: s.sourceIds.filter((sid: string) => sid !== id) } as any)
        cascadeInfo.cleanedRefs++
      }
    }

    return NextResponse.json({ success: true, cascadeInfo })
  }

  return NextResponse.json({ success: true })
}
