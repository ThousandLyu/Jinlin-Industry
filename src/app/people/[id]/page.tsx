import { db } from '@/lib/dataService'
import Link from 'next/link'
import Timeline from '@/components/shared/Timeline'
import SmartImage from '@/components/shared/SmartImage'
import type { HeritageSite } from '@/types'

export default async function PersonPage({ params }: { params: { id: string } }) {
  const person = await db.people.getById(params.id)
  if (!person) {
    return (
      <div className="content-page-narrow py-20 text-center">
        <p className="text-lg text-[#7C6A5A]">人物不存在或已删除</p>
        <Link href="/people" className="content-button content-button-primary mt-4 inline-block">返回人物列表</Link>
      </div>
    )
  }

  const [allSites, allFacts] = await Promise.all([
    db.sites.getAll(),
    db.facts.getAll(),
  ])

  const personSites = (person.siteIds || [])
    .map(sid => allSites.find(s => s.id === sid))
    .filter(Boolean) as HeritageSite[]

  const personFacts = (person.factIds || [])
    .map(fid => allFacts.find(f => f.id === fid))
    .filter(Boolean)

  // Build timeline events
  const timelineEvents: Array<{ year: number; title: string; description?: string; sourceRef?: string }> = []
  if (person.birthYear) timelineEvents.push({ year: person.birthYear, title: '出生', description: person.name + '出生' })
  personFacts.forEach(f => {
    const yearStr = (f as any).occurredAt || (f as any).year
    if (yearStr && !isNaN(Number(yearStr))) {
      timelineEvents.push({
        year: Number(yearStr),
        title: (f as any).title || (f as any).summary || '史实事件',
        description: (f as any).description || '',
        sourceRef: (f as any).sourceRef || '',
      })
    }
  })
  if (person.deathYear) timelineEvents.push({ year: person.deathYear, title: '逝世', description: person.name + '逝世' })

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="content-page-narrow py-8">
        <Link href="/people" className="text-sm text-[#C49A2B] hover:underline mb-4 inline-block">&larr; 返回人物列表</Link>

        <div className="flex items-start gap-6 mb-8">
          <div className="relative flex h-36 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[48%] border-4 border-[#C49A2B]/20 bg-[#4A3728] text-4xl font-bold text-[#F5F0E8] shadow-lg">
            {person.avatar ? (
              <SmartImage src={person.avatar} alt={person.name} fill sizes="112px" className="object-cover" />
            ) : (
              person.name?.[0] || '人'
            )}
          </div>
          <div>
            {(person.entityType === 'organization' || person.entityType === 'unknown') && (
              <span className={`mb-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${person.entityType === 'organization' ? 'border-[#8B1A2B]/25 bg-[#8B1A2B]/10 text-[#8B1A2B]' : 'border-gray-200 bg-white text-[#7C6A5A]'}`}>
                {person.entityType === 'organization' ? '企业/机构' : '待查验'}
              </span>
            )}
            <h1 className="text-3xl font-bold text-[#4A3728]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {person.name}
            </h1>
            {person.title && <p className="text-lg text-[#C49A2B] italic mt-1">{person.title}</p>}
            {(person.birthYear || person.deathYear) && (
              <p className="text-sm text-[#7C6A5A] mt-2">
                {person.birthYear || '?'} — {person.deathYear || '至今'}
              </p>
            )}
          </div>
        </div>

        {person.biography && (
          <div className="content-panel p-6 mb-6">
            <h2 className="text-lg font-bold text-[#4A3728] mb-3">生平简介</h2>
            <p className="text-sm leading-7 text-[#7C6A5A] whitespace-pre-wrap">{person.biography}</p>
          </div>
        )}

        {person.achievements && (
          <div className="content-panel p-6 mb-6">
            <h2 className="text-lg font-bold text-[#4A3728] mb-3">主要成就</h2>
            <p className="text-sm leading-7 text-[#7C6A5A] whitespace-pre-wrap">{person.achievements}</p>
          </div>
        )}

        {/* Timeline */}
        {timelineEvents.length > 1 && (
          <div className="content-panel p-6 mb-6">
            <h2 className="text-lg font-bold text-[#4A3728] mb-4">人物时间轴</h2>
            <Timeline events={timelineEvents} />
          </div>
        )}

        {/* Related Sites */}
        {personSites.length > 0 && (
          <div className="content-panel p-6 mb-6">
            <h2 className="text-lg font-bold text-[#4A3728] mb-3">关联遗址</h2>
            <div className="space-y-2">
              {personSites.map(s => (
                <a key={s.id} href={`/sites/${s.slug}`} className="block content-card p-4 hover:shadow-archive transition-shadow">
                  <span className="font-medium text-[#4A3728]">{s.name}</span>
                  {s.location && <span className="text-xs text-[#7C6A5A] ml-3">{s.location}</span>}
                  {s.industry && <span className="ml-2 text-xs text-[#C49A2B]">{s.industry}</span>}
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
