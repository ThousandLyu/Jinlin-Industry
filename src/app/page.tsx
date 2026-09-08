import Link from 'next/link'
import { db } from '@/lib/dataService'
import SectionHeader from '@/components/shared/SectionHeader'
import SmartImage from '@/components/shared/SmartImage'
import dynamic from 'next/dynamic'

const HomeWordCloud = dynamic(() => import('@/components/front/HomeWordCloud'), { ssr: false })

async function getData() {
  const [sites, people, facts, settingsArr] = await Promise.all([
    db.sites.getAll(),
    db.people.getAll(),
    db.facts.getAll(),
    db.settings.getAll(),
  ])
  const settings = settingsArr[0] || {}
  const publishedSites = sites.filter((s: any) => s.isPublished)
  const publishedFacts = facts.filter((f: any) => f.isPublished && f.reviewStatus === 'approved')
  const recommendedSites = publishedSites.filter((s: any) => s.isRecommended).slice(0, 4)
  const timelineCount = await db.timeline.count()
  const gradeAFacts = publishedFacts.filter((f: any) => {
    const sourceIds = f.sourceIds || []
    return sourceIds.length >= 2
  })
  return { sites: publishedSites, people, facts: publishedFacts, timelineCount, recommendedSites, gradeAFacts, settings }
}

export default async function HomePage() {
  const { sites, people, facts, timelineCount, recommendedSites, gradeAFacts, settings } = await getData()
  const heroImageUrl = settings.heroImageUrl || ''
  const stats = [
    { label: '史料线索', value: facts.length + timelineCount, note: '史实与时间轴' },
    { label: '企业遗址', value: sites.length, note: '南京工业空间' },
    { label: '人物故事', value: people.length, note: '工商业记忆' },
    { label: 'A级史实', value: gradeAFacts.length, note: '多源支撑' },
  ]
  const entrances = [
    { label: '工业时间轴', href: '/timeline', mark: '01', note: '按年代阅读产业变迁' },
    { label: '工业地图', href: '/map', mark: '02', note: '从城市空间进入现场' },
    { label: '人物故事', href: '/people', mark: '03', note: '看见工商业人物群像' },
    { label: '数字复原', href: '/scenes', mark: '04', note: '进入复原场景与模型' },
    { label: '公益课程', href: '/courses', mark: '05', note: '用于研学与课堂讲述' },
  ]

  return (
    <div className="home-page">
      <section className="home-hero">
        {heroImageUrl ? (
          <div className="absolute inset-0">
            <SmartImage src={heroImageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-[#4A3728]/72" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#4A3728] to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#2D1F12]">
            <div className="home-hero-fallback" />
          </div>
        )}
        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker">Nanjing Industrial Archive</p>
            <h1 className="home-title">金陵工脉</h1>
            <p className="home-subtitle">
              南京民族工业记忆数字复原与公益传承
            </p>
            <p className="home-hero-text">
              汇集企业遗址、人物故事、史实核验、数字复原与公益课程，让百年工业文明以可信史料和沉浸叙事重新被看见。
            </p>
            <div className="home-hero-actions">
              <Link href="/sites" className="home-button home-button-accent">
                探索企业遗址
              </Link>
              <Link href="/timeline" className="home-button home-button-ghost">
                查看时间轴
              </Link>
            </div>
          </div>
          <div className="home-curator-card" aria-label="展陈线索">
            <p className="home-curator-label">展陈线索</p>
            <p>从工厂遗址到人物口述，从史料证据到数字场景，项目以“可追溯、可阅读、可参与”为主线组织内容。</p>
            <div className="home-curator-tags">
              <span>史料</span>
              <span>空间</span>
              <span>人物</span>
              <span>复原</span>
            </div>
          </div>
        </div>
      </section>

      <section id="home-search" className="home-search-wrap">
        <div className="home-search-panel">
          <div className="home-search-heading">
            <p>AI融合搜索</p>
            <span>输入企业、人物、史实或史料关键词</span>
          </div>
          <form action="/search" method="GET" className="home-search-form">
            <input name="q" placeholder="搜索企业遗址、人物、史实、课程或史料..." className="home-search-input" />
            <button className="home-button home-button-primary" type="submit">
              AI融合搜索
            </button>
          </form>
        </div>
      </section>

      <section className="home-section home-section-tight">
        <div className="home-stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="home-stat-card">
              <div className="home-stat-value">{stat.value}</div>
              <div className="home-stat-label">{stat.label}</div>
              <div className="home-stat-note">{stat.note}</div>
            </div>
          ))}
        </div>
      </section>

      <HomeWordCloud />

      <section className="home-section">
        <SectionHeader
          eyebrow="Browse"
          title="展陈入口"
          description="按时间、空间、人物、场景与课程进入南京民族工业记忆。"
        />
        <div className="home-entry-grid">
          {entrances.map((item) => (
            <Link key={item.href} href={item.href} className="home-entry-card">
              <div className="home-entry-mark">{item.mark}</div>
              <div className="home-entry-title">{item.label}</div>
              <p>{item.note}</p>
            </Link>
          ))}
        </div>
      </section>

      {recommendedSites.length > 0 && (
        <section className="home-featured">
          <div className="home-section-inner">
            <SectionHeader eyebrow="Featured" title="推荐展区" description="从代表性企业遗址进入城市工业记忆现场。" />
            <div className="home-featured-grid">
              {recommendedSites.map((site: any) => (
                <Link key={site.id} href={`/sites/${site.slug}`} className="home-site-card">
                  <div className="home-site-image">
                    {site.coverImage ? (
                      <SmartImage src={site.coverImage} alt={site.name} fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500" />
                    ) : (
                      <span>{site.name.slice(0, 4)}</span>
                    )}
                    <div className="home-site-image-shade" />
                  </div>
                  <div className="home-site-body">
                    <h3>{site.name}</h3>
                    <p>{site.description?.slice(0, 68)}</p>
                    <span>
                      {site.industry}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-about-panel">
          <SectionHeader eyebrow="About" title="关于项目" description="以数字化方法保存、整理和讲述南京民族工业的公共记忆。" className="mb-5" />
          <p>
            "金陵工脉·薪火传承"项目致力于南京民族工业记忆的数字复原与公益传承。
            通过数字化手段记录、保护并传播南京民族工业的历史文化遗产，
            包括企业遗址、人物故事、重大史实、工业技术等珍贵资料，
            让百年工业文明在新时代焕发新生，传承民族工业精神。
          </p>
          <Link href="/about" className="home-button home-button-outline">
            了解更多
          </Link>
        </div>
      </section>
    </div>
  )
}
