import { db } from '@/lib/dataService'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AiTokenDashboardPanel from '@/components/admin/AiTokenDashboardPanel'

export default async function AdminDashboardPage() {
  const [sources, sites, people, facts, timeline, scenes, courses, activities, submissions, aiTokens] = await Promise.all([
    db.sources.getAll(),
    db.sites.getAll(),
    db.people.getAll(),
    db.facts.getAll(),
    db.timeline.getAll(),
    db.scenes.getAll(),
    db.courses.getAll(),
    db.activities.getAll(),
    db.sourceSubmissions.getAll(),
    db.aiTokens.getAll(),
  ])

  const aGradeFacts = facts.filter((f: any) => (f.verificationGrade || f.credibilityLevel || f.grade) === 'A')
  const highRiskPending = facts.filter((f: any) => f.riskLevel === 'high' && f.reviewStatus === 'pending')
  const pendingSubmissions = submissions.filter((s: any) => s.status === 'pending')
  const pendingAITimeline = timeline.filter((t: any) => t.generatedByAI && (t.reviewStatus || 'pending') === 'pending')
  const totalServed = activities.reduce((sum: number, a: any) => sum + (a.servedCount || 0), 0)

  const focusCards = [
    { label: '待审投稿', value: pendingSubmissions.length, hint: '公众线索待处理', tone: 'text-[#8B1A2B]', ring: 'border-[#8B1A2B]/25' },
    { label: '高风险待审核', value: highRiskPending.length, hint: '史实发布前需复核', tone: 'text-red-700', ring: 'border-red-200 bg-red-50/60' },
    { label: 'AI 时间轴待审', value: pendingAITimeline.length, hint: 'AI 整理结果需人工核对', tone: 'text-[#8B6A1B]', ring: 'border-[#C49A2B]/30' },
    { label: '累计服务人数', value: totalServed, hint: '公益活动触达', tone: 'text-[#8B6A1B]', suffix: '人', ring: 'border-[#E8DCC8]' },
  ]

  const cards = [
    { label: '史料总数', value: sources.length },
    { label: '企业遗址', value: sites.length },
    { label: '人物故事', value: people.length },
    { label: '史实总数', value: facts.length },
    { label: '课程数', value: courses.length },
    { label: '活动数', value: activities.length },
    { label: '时间轴事件', value: timeline.length },
    { label: '数字场景', value: scenes.length },
  ]

  return (
    <div className="admin-workspace">
      <AdminPageHeader
        title="数据看板"
        description="集中查看内容资产、待处理事项与公益触达情况。"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {focusCards.map(card => (
          <div key={card.label} className={`admin-panel p-5 ${card.ring}`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}{card.suffix && <span className="ml-1 text-base">{card.suffix}</span>}</p>
            <p className="mt-2 text-xs text-gray-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="admin-stat-card">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <AiTokenDashboardPanel initialItems={aiTokens.filter((item: any) => !item.isDeleted)} />
    </div>
  )
}
