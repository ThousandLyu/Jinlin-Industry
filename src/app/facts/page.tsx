import { db } from '@/lib/dataService'
import EmptyState from '@/components/shared/EmptyState'
import SectionHeader from '@/components/shared/SectionHeader'

export default async function FactsPage() {
  const allFacts = await db.facts.getAll()
  const facts = allFacts.filter((f: any) => f.isPublished && f.reviewStatus === 'approved')

  return (
    <div className="content-page-narrow">
      <SectionHeader
        eyebrow="Verified Facts"
        title="工业第一与标杆史实"
        description="已核验发布的南京民族工业重要史实，以史料等级辅助阅读。"
      />

      <div className="content-grid-2">
        {facts.map((fact: any) => (
          <div key={fact.id} className="content-card p-5">
            <p className="content-title leading-8">{fact.publicExpression || fact.claimText}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={gradeTagClass(fact.verificationGrade)}
                title={fact.verificationGrade === 'A' ? 'A级史料：基于一手档案或多源交叉验证，可信度最高'
                  : fact.verificationGrade === 'B' ? 'B级史料：基于可靠文献或官方资料，可信度较高'
                  : fact.verificationGrade === 'C' ? 'C级史料：单一来源或待进一步核实，仅供参考' : ''}
              >
                {fact.verificationGrade}级史料
              </span>
              {fact.category && (
                <span className="content-tag">{fact.category}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {facts.length === 0 && <EmptyState title="暂无已核验发布的史实" description="后台发布并审核通过后，将在这里形成可阅读的史实档案。" />}
    </div>
  )
}

function gradeTagClass(grade: string) {
  if (grade === 'A') return 'content-tag-danger'
  if (grade === 'B') return 'content-tag-accent'
  if (grade === 'C') return 'content-tag-muted'
  return 'content-tag'
}
