import { db } from '@/lib/dataService'
import Link from 'next/link'
import SmartImage from '@/components/shared/SmartImage'

export default async function SiteDetailPage({ params }: { params: { slug: string } }) {
  const allSites = await db.sites.getAll()
  const site = allSites.find((s: any) => s.slug === params.slug && s.isPublished) as any
  if (!site) return <div className="max-w-4xl mx-auto px-4 py-12 text-center"><p className="text-gray-400">企业遗址未找到</p></div>

  const allPeople = await db.people.getAll()
  const relatedPeople = allPeople.filter((p: any) => site.representativePeople?.includes(p.id))
  const allFacts = await db.facts.getAll()
  const relatedFacts = allFacts.filter((f: any) => f.siteIds?.includes(site.id) && f.isPublished && f.reviewStatus === 'approved')
  const allSources = await db.sources.getAll()
  const relatedSources = allSources.filter((s: any) => site.sourceIds?.includes(s.id))

  return (
    <div className="content-page-narrow">
      <Link href="/sites" className="content-button content-button-outline mb-4">&larr; 返回企业列表</Link>
      <article className="content-panel overflow-hidden">
        <div className="content-card-media h-72 text-4xl">
          {site.coverImage ? (
            <SmartImage src={site.coverImage} alt={site.name} fill sizes="960px" className="object-cover" />
          ) : (
            <span className="relative z-10">{site.name}</span>
          )}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="content-tag-accent">{site.industry}</span>
             {site.status && <span className="content-tag-muted">{site.status}</span>}
            {site.isRecommended && <span className="content-tag-danger">推荐展区</span>}
          </div>
          <h1 className="content-title mb-4 text-3xl">{site.name}</h1>
          {site.description && <p className="content-copy mb-6 text-base">{site.description}</p>}
          {site.historicalValue && <section className="content-reading mb-6 shadow-none"><h2>历史价值</h2><p>{site.historicalValue}</p></section>}
          <div className="mb-6 grid gap-3 text-sm md:grid-cols-2">
            {site.establishedYear && <p className="content-tag-muted">创建年份：{site.establishedYear}</p>}
            {site.location && <p className="content-tag-muted">地址：{site.location}</p>}
          </div>

          {site.images && site.images.length > 0 && (
            <div className="mb-6"><h2 className="content-title mb-3 text-xl">相关图片</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {site.images.map((img: string, i: number) => (
                  <div key={i} className="flex h-36 items-center justify-center rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] text-sm text-gray-400">{img.split('/').pop()}</div>
                ))}
              </div>
            </div>
          )}

          {relatedPeople.length > 0 && (
            <div className="mb-6"><h2 className="content-title mb-3 text-xl">代表人物</h2>
              <div className="space-y-2">
                {relatedPeople.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#E8DCC8] bg-[#FDFBF7] p-3">
                    <div className="w-10 h-10 rounded-full bg-[#4A3728] flex items-center justify-center text-white text-sm">{p.name[0]}</div>
                    <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.title}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedFacts.length > 0 && (
            <div className="mb-6"><h2 className="content-title mb-3 text-xl">关联史实</h2>
              <div className="space-y-2">
                {relatedFacts.map((f: any) => (
                  <div key={f.id} className="rounded-xl border border-[#E8DCC8] bg-[#FDFBF7] p-3">
                    <p className="text-sm font-medium">{f.publicExpression || f.claimText}</p>
                    <span className="content-tag-accent mt-2">{f.riskLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedSources.length > 0 && (
            <div><h2 className="content-title mb-3 text-xl">史料来源</h2>
              <div className="space-y-1">
                {relatedSources.map((s: any) => (
                  <p key={s.id} className="content-copy">· {s.title}{s.author ? ` — ${s.author}` : ''}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
