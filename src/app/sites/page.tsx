import Link from 'next/link'
import { db } from '@/lib/dataService'
import EmptyState from '@/components/shared/EmptyState'
import SectionHeader from '@/components/shared/SectionHeader'
import SmartImage from '@/components/shared/SmartImage'

const PAGE_SIZE = 6

export default async function SitesPage({ searchParams }: { searchParams: { category?: string; q?: string; page?: string } }) {
  const allSites = await db.sites.getAll()
  const publishedSites = allSites.filter((s: any) => s.isPublished)
  const categories = [...new Set(publishedSites.map((s: any) => s.industry))] as string[]

  let filtered = [...publishedSites]
  if (searchParams.category) {
    filtered = filtered.filter((s: any) => s.industry === searchParams.category)
  }
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase()
    filtered = filtered.filter((s: any) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
  }
  const currentPage = Math.max(1, Number(searchParams.page || 1) || 1)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="content-page">
      <SectionHeader
        eyebrow="Sites"
        title="企业遗址展厅"
        description="按行业与关键词探索南京民族工业企业遗址，进入每处空间背后的史实、人物和资料。"
      />

      <div className="filter-strip mb-6">
        <Link href={buildSitesUrl({ q: searchParams.q })} className={`filter-pill ${!searchParams.category ? 'filter-pill-active' : ''}`}>全部</Link>
        {categories.map(cat => (
          <Link key={cat} href={buildSitesUrl({ category: cat, q: searchParams.q })}
            className={`filter-pill ${searchParams.category === cat ? 'filter-pill-active' : ''}`}>
            {cat}
          </Link>
        ))}
      </div>

      <form className="content-filter-panel max-w-xl" method="GET" action="/sites">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input name="q" defaultValue={searchParams.q} placeholder="搜索企业名称..." className="content-input flex-1" />
          {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
          <button type="submit" className="content-button content-button-primary">搜索</button>
        </div>
      </form>

      <div className="content-grid-3">
        {paged.map((site: any) => (
          <Link key={site.id} href={`/sites/${site.slug}`} className="content-card group overflow-hidden">
            <div className="content-card-media h-52 text-2xl">
              {site.coverImage ? (
                <SmartImage src={site.coverImage} alt={site.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500" />
              ) : (
                <span>{site.name.slice(0, 4)}</span>
              )}
            </div>
            <div className="content-card-body">
              <div className="flex items-start justify-between mb-2">
                <h3 className="content-title text-lg">{site.name}</h3>
                {site.isRecommended && <span className="content-tag-danger">推荐</span>}
              </div>
              <p className="content-copy line-clamp-2 mb-3">{site.description?.slice(0, 80)}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="content-tag">{site.industry}</span>
                {site.establishedYear && <span className="content-tag-muted">{site.establishedYear}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState title="暂无企业遗址数据" description="可以调整筛选条件，或在后台补充已发布的企业遗址。" />
      )}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          <Link href={buildSitesUrl({ category: searchParams.category, q: searchParams.q, page: Math.max(1, page - 1) })}
            className={`content-button content-button-outline ${page === 1 ? 'pointer-events-none opacity-40' : ''}`}>
            上一页
          </Link>
          <span className="px-3 py-2 text-gray-500">第 {page} / {totalPages} 页，共 {filtered.length} 个</span>
          <Link href={buildSitesUrl({ category: searchParams.category, q: searchParams.q, page: Math.min(totalPages, page + 1) })}
            className={`content-button content-button-outline ${page === totalPages ? 'pointer-events-none opacity-40' : ''}`}>
            下一页
          </Link>
        </div>
      )}
    </div>
  )
}

function buildSitesUrl(params: { category?: string; q?: string; page?: number }) {
  const query = new URLSearchParams()
  if (params.category) query.set('category', params.category)
  if (params.q) query.set('q', params.q)
  if (params.page && params.page > 1) query.set('page', String(params.page))
  const value = query.toString()
  return value ? `/sites?${value}` : '/sites'
}
