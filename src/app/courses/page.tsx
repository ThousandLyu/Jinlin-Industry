import { db } from '@/lib/dataService'
import EmptyState from '@/components/shared/EmptyState'
import SectionHeader from '@/components/shared/SectionHeader'
import fs from 'fs'
import path from 'path'

export default async function CoursesPage() {
  const courses = await db.courses.getAll()

  return (
    <div className="content-page">
      <SectionHeader
        eyebrow="Courses"
        title="公益课程资源"
        description="面向课堂、研学和社区活动整理的南京民族工业公益教育课程包。"
      />
      <div className="content-grid-3">
        {courses.map((course: any) => (
          <div key={course.id} className="content-card overflow-hidden">
            <div className="content-card-body">
              <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8B6A1B]">COURSE</p>
              <h2 className="content-title mb-2 text-xl">{course.title}</h2>
              {course.description && <p className="content-copy mb-4 line-clamp-3">{course.description}</p>}
              {course.type && <p className="text-xs text-gray-500 mb-2">类型：{course.type}</p>}
              {course.targetAudience && <p className="text-xs text-gray-500 mb-4">适合人群：{course.targetAudience}</p>}
              <div className="flex flex-wrap gap-2">
                <DownloadLink href={course.pptFile} label="下载PPT" tone="gold" />
                <DownloadLink href={course.scriptFile} label="下载讲稿" tone="brown" />
                <DownloadLink href={course.taskFile} label="下载任务单" tone="red" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {courses.length === 0 && <EmptyState title="暂无课程资源" description="后台发布课程后，可在这里提供 PPT、讲稿和任务单下载。" />}
    </div>
  )
}

function DownloadLink({ href, label, tone }: { href?: string; label: string; tone: 'gold' | 'brown' | 'red' }) {
  if (!href) return null
  const available = isDownloadAvailable(href)
  const classMap = {
    gold: 'bg-[#C49A2B]/10 text-[#8B6A1B] hover:bg-[#C49A2B]/20',
    brown: 'bg-[#4A3728]/10 text-[#4A3728] hover:bg-[#4A3728]/20',
    red: 'bg-[#8B1A2B]/10 text-[#8B1A2B] hover:bg-[#8B1A2B]/20',
  }
  if (!available) {
    return <span className="rounded-lg border border-[#E8DCC8] bg-[#F5F0E8] px-3 py-1 text-xs text-gray-400 cursor-not-allowed">{label} · 待上传</span>
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" download className={`rounded-lg border border-transparent px-3 py-1 text-xs transition ${classMap[tone]}`}>{label}</a>
}

function isDownloadAvailable(href: string) {
  if (/^https?:\/\//i.test(href)) return true
  if (!href.startsWith('/uploads/')) return false
  const fullPath = path.join(process.cwd(), 'public', href.replace(/^\/+/, ''))
  return fs.existsSync(fullPath)
}
