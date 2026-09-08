import { db } from '@/lib/dataService'
import EmptyState from '@/components/shared/EmptyState'
import SectionHeader from '@/components/shared/SectionHeader'
import SmartImage from '@/components/shared/SmartImage'

export default async function ActivitiesPage() {
  const activities = await db.activities.getAll()
  const totalServed = activities.reduce((sum: number, a: any) => sum + (a.servedCount || 0), 0)

  return (
    <div className="content-page">
      <SectionHeader
        eyebrow="Activities"
        title="活动记录"
        description="记录南京民族工业公益传承活动的时间、地点、服务人数与现场反馈。"
      />
      {totalServed > 0 && (
        <p className="content-tag-accent mx-auto mb-8 w-fit px-5 py-2 text-sm font-bold">累计服务人数：{totalServed} 人</p>
      )}
      <div className="space-y-6">
        {activities.map((activity: any) => (
          <div key={activity.id} className="content-panel overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="content-title text-xl">{activity.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {activity.date && <span>{activity.date}</span>}
                    {activity.location && <span> · {activity.location}</span>}
                  </p>
                </div>
                {activity.servedCount && (
                  <span className="content-tag-accent whitespace-nowrap">
                    服务 {activity.servedCount} 人
                  </span>
                )}
              </div>
              {activity.description && <p className="content-copy mb-3 line-clamp-3">{activity.description}</p>}
              {activity.feedback && (
                <div className="mb-3 rounded-xl border border-[#E8DCC8] bg-[#F5F0E8] p-3">
                  <p className="content-title mb-1 text-xs">反馈摘要</p>
                  <p className="content-copy line-clamp-2">{activity.feedback}</p>
                </div>
              )}
              {activity.photos && (() => {
                const photoList = typeof activity.photos === 'string' ? activity.photos.split(',').filter(Boolean) : activity.photos
                if (photoList.length === 0) return null
                return (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {photoList.map((img: string, i: number) => (
                      <a key={i} href={img.trim()} target="_blank" rel="noopener noreferrer" className="relative block h-20 w-20 overflow-hidden rounded-lg border border-[#E8DCC8] bg-[#F5F0E8] transition hover:opacity-85">
                        <SmartImage src={img.trim()} alt={`活动照片 ${i + 1}`} fill sizes="80px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        ))}
      </div>
      {activities.length === 0 && <EmptyState title="暂无活动记录" description="后台发布活动后，将在这里形成公益传承活动档案。" />}
    </div>
  )
}
