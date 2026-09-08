import { db } from '@/lib/dataService'
import { getLinksBySource } from '@/lib/linkService'
import type { Source, Person, HeritageSite } from '@/types'
import Link from 'next/link'
import SourceDetail from '@/components/front/SourceDetail'

export default async function SourcePage({ params }: { params: { id: string } }) {
  const source = await db.sources.getById(params.id)
  if (!source) {
    return (
      <div className="content-page-narrow py-20 text-center">
        <p className="text-lg text-[#7C6A5A]">史料不存在或已删除</p>
        <Link href="/search" className="content-button content-button-primary mt-4 inline-block">返回搜索</Link>
      </div>
    )
  }

  const [allPeople, allSites, allSources, links] = await Promise.all([
    db.people.getAll(),
    db.sites.getAll(),
    db.sources.getAll(),
    getLinksBySource(params.id).catch(() => []),
  ])

  const relatedPeople = allPeople.filter(p => p.sourceIds?.includes(params.id) && !p.isDeleted)
  const relatedSites = allSites.filter(s => s.sourceIds?.includes(params.id) && !s.isDeleted)

  // Related sources by shared people/sites
  const relatedSourceIds = new Set<string>()
  relatedPeople.forEach(p => p.sourceIds?.forEach(sid => relatedSourceIds.add(sid)))
  relatedSites.forEach(s => s.sourceIds?.forEach(sid => relatedSourceIds.add(sid)))
  relatedSourceIds.delete(params.id)
  const relatedSources = Array.from(relatedSourceIds)
    .map(sid => allSources.find(s => s.id === sid))
    .filter(Boolean)
    .slice(0, 6) as Source[]

  // Text file reading will be done on client side via API
  const hasText = source.extractStatus === 'success' && !!source.textPath

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-page-narrow py-8">
        <Link href="/search" className="text-sm text-[#C49A2B] hover:underline mb-4 inline-block">&larr; 返回</Link>

        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-block rounded px-2.5 py-1 text-xs font-bold text-white ${source.credibilityLevel === 'A' ? 'bg-[#8B1A2B]' : source.credibilityLevel === 'B' ? 'bg-[#C49A2B]' : 'bg-gray-400'}`}>
            {source.credibilityLevel}级
          </span>
          {source.category && <span className="text-xs text-[#7C6A5A]">{source.category}</span>}
        </div>

        <h1 className="text-2xl font-bold text-[#4A3728]">{source.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#7C6A5A]">
          {source.author && <span>{source.author}</span>}
          {source.publishDate && <span>{source.publishDate}</span>}
          {source.type && <span>{source.type}</span>}
          {source.fileName && <span className="text-xs text-gray-400">{source.fileName}</span>}
        </div>

        <SourceDetail
          sourceId={params.id}
          source={source}
          relatedPeople={relatedPeople}
          relatedSites={relatedSites}
          relatedSources={relatedSources}
          links={links}
          hasText={hasText}
        />
      </div>
    </div>
  )
}
