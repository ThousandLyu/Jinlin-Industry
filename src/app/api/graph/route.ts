import { NextResponse } from 'next/server'
import { db } from '@/lib/dataService'

const RELATION_LABELS: Record<string, string> = {
  cites: '引用',
  supports: '支持',
  contradicts: '矛盾',
  extends: '扩展',
  related: '相关',
}

export async function GET() {
  try {
    const [sources, people, sites, allLinks] = await Promise.all([
      db.sources.getAll(),
      db.people.getAll(),
      db.sites.getAll(),
      db.sourceLinks.getAll(),
    ])

    const activeLinks = allLinks.filter(l => !l.isDeleted && l.isApproved)
    const activeSources = sources.filter(s => !s.isDeleted && (!s.reviewStatus || s.reviewStatus === 'approved'))
    const activePeople = people.filter(p => !p.isDeleted)
    const activeSites = sites.filter(s => !s.isDeleted)

    const nodes: Array<{
      id: string
      label: string
      type: 'source' | 'person' | 'site'
      subtitle?: string
      href: string
    }> = [
      ...activeSources.slice(0, 80).map(s => ({
        id: s.id,
        label: s.title.slice(0, 18),
        type: 'source' as const,
        subtitle: `${s.credibilityLevel || 'C'}级 · ${s.category || '史料'}`,
        href: `/sources/${s.id}`,
      })),
      ...activePeople.slice(0, 30).map(p => ({
        id: p.id,
        label: p.name,
        type: 'person' as const,
        subtitle: p.title || '',
        href: `/people/${p.id}`,
      })),
      ...activeSites.slice(0, 30).map(s => ({
        id: s.id,
        label: s.name.slice(0, 12),
        type: 'site' as const,
        subtitle: s.industry || '',
        href: `/sites/${s.slug}`,
      })),
    ]

    // Edges from SourceLinks
    const linkEdges = activeLinks.map(l => ({
      source: l.sourceId,
      target: l.targetId,
      label: RELATION_LABELS[l.relationType] || l.relationType,
      confidence: l.confidence,
    }))

    // Edges from Person.sourceIds and Site.sourceIds (implicit connections)
    const implicitEdges: Array<{ source: string; target: string; label: string; confidence: number }> = []
    activePeople.forEach(p => {
      (p.sourceIds || []).forEach(sid => {
        if (activeSources.some(s => s.id === sid)) {
          implicitEdges.push({ source: p.id, target: sid, label: '关联', confidence: 1 })
        }
      })
      ;(p.siteIds || []).forEach(sid => {
        if (activeSites.some(s => s.id === sid)) {
          implicitEdges.push({ source: p.id, target: sid, label: '所属', confidence: 1 })
        }
      })
    })
    activeSites.forEach(site => {
      (site.sourceIds || []).forEach(sid => {
        if (activeSources.some(s => s.id === sid)) {
          implicitEdges.push({ source: site.id, target: sid, label: '关联', confidence: 1 })
        }
      })
    })

    // Deduplicate edges: keep highest confidence per source-target pair
    const allEdges = [...linkEdges, ...implicitEdges]
    const edgeMap = new Map<string, { source: string; target: string; label: string; confidence: number }>()
    allEdges.forEach(e => {
      const key = [e.source, e.target].sort().join('::')
      const existing = edgeMap.get(key)
      if (!existing || e.confidence > existing.confidence) {
        edgeMap.set(key, e)
      }
    })

    return NextResponse.json({
      success: true,
      nodes,
      edges: Array.from(edgeMap.values()),
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
