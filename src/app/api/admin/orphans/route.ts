import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/dataService'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const sources = await db.sources.all()
    const links = await db.sourceLinks.all()
    const tokens = await db.aiTokens.all()
    const people = await db.people.all()
    const sites = await db.sites.all()

    const activeSourceIds = new Set(sources.filter(s => !s.isDeleted).map(s => s.id))
    const deletedSourceIds = new Set(sources.filter(s => s.isDeleted).map(s => s.id))

    const orphanLinks = links.filter(l =>
      !l.isDeleted &&
      (!activeSourceIds.has(l.sourceId) || !activeSourceIds.has(l.targetId))
    )

    const orphanTokens = tokens.filter(t =>
      !t.isDeleted &&
      t.targetType === 'source' &&
      !activeSourceIds.has(t.targetId)
    )

    const stalePeopleRefs = people.filter(p =>
      !p.isDeleted &&
      p.sourceIds?.some((sid: string) => !activeSourceIds.has(sid))
    ).map(p => ({
      id: p.id,
      name: p.name,
      staleSourceIds: p.sourceIds?.filter((sid: string) => !activeSourceIds.has(sid)) || [],
    }))

    const staleSiteRefs = sites.filter(s =>
      !s.isDeleted &&
      s.sourceIds?.some((sid: string) => !activeSourceIds.has(sid))
    ).map(s => ({
      id: s.id,
      name: s.name,
      staleSourceIds: s.sourceIds?.filter((sid: string) => !activeSourceIds.has(sid)) || [],
    }))

    return NextResponse.json({
      success: true,
      orphanLinks: { count: orphanLinks.length, items: orphanLinks },
      orphanTokens: { count: orphanTokens.length, items: orphanTokens },
      staleReferences: {
        people: { count: stalePeopleRefs.length, items: stalePeopleRefs },
        sites: { count: staleSiteRefs.length, items: staleSiteRefs },
      },
      totalOrphans: orphanLinks.length + orphanTokens.length + stalePeopleRefs.length + staleSiteRefs.length,
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const sources = await db.sources.all()
    const links = await db.sourceLinks.all()
    const tokens = await db.aiTokens.all()
    const people = await db.people.all()
    const sites = await db.sites.all()

    const activeSourceIds = new Set(sources.filter(s => !s.isDeleted).map(s => s.id))
    let cleanedLinks = 0
    let cleanedTokens = 0
    let cleanedRefs = 0

    // 清理孤儿 links
    for (const l of links) {
      if (!l.isDeleted && (!activeSourceIds.has(l.sourceId) || !activeSourceIds.has(l.targetId))) {
        await db.sourceLinks.update(l.id, { isDeleted: true } as any)
        cleanedLinks++
      }
    }

    // 清理孤儿 tokens
    for (const t of tokens) {
      if (!t.isDeleted && t.targetType === 'source' && !activeSourceIds.has(t.targetId)) {
        await db.aiTokens.update(t.id, { isDeleted: true } as any)
        cleanedTokens++
      }
    }

    // 清理 stale person refs
    for (const p of people) {
      if (!p.isDeleted && p.sourceIds) {
        const stale = p.sourceIds.filter((sid: string) => !activeSourceIds.has(sid))
        if (stale.length > 0) {
          await db.people.update(p.id, { sourceIds: p.sourceIds.filter((sid: string) => activeSourceIds.has(sid)) } as any)
          cleanedRefs += stale.length
        }
      }
    }

    // 清理 stale site refs
    for (const s of sites) {
      if (!s.isDeleted && s.sourceIds) {
        const stale = s.sourceIds.filter((sid: string) => !activeSourceIds.has(sid))
        if (stale.length > 0) {
          await db.sites.update(s.id, { sourceIds: s.sourceIds.filter((sid: string) => activeSourceIds.has(sid)) } as any)
          cleanedRefs += stale.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      cleaned: { orphanLinks: cleanedLinks, orphanTokens: cleanedTokens, staleRefs: cleanedRefs },
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
