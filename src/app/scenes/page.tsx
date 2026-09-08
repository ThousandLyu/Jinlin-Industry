import Link from 'next/link'
import { db } from '@/lib/dataService'
import EmptyState from '@/components/shared/EmptyState'
import SectionHeader from '@/components/shared/SectionHeader'
import SmartImage from '@/components/shared/SmartImage'

export default async function ScenesPage() {
  const scenes = await db.scenes.getAll()

  return (
    <div className="content-page">
      <SectionHeader
        eyebrow="Digital Scenes"
        title="数字复原场景"
        description="以图像、热点和 3D 模型呈现南京民族工业遗址的历史空间。"
      />
      <div className="content-grid-2">
        {scenes.map((scene: any) => (
          <Link key={scene.id} href={`/scenes/${scene.id}`} className="content-card group block cursor-pointer overflow-hidden">
            <div className="content-card-media h-64 text-2xl">
              {scene.imageUrl ? (
                <SmartImage src={scene.imageUrl} alt={scene.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500" />
              ) : scene.image ? (
                <SmartImage src={scene.image} alt={scene.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500" />
              ) : (
                <span>{scene.title}</span>
              )}
            </div>
            <div className="content-card-body">
              <h2 className="content-title mb-2 text-xl">{scene.title}</h2>
              {scene.description && <p className="content-copy mb-4 line-clamp-2">{scene.description}</p>}
              {scene.siteId && <span className="content-tag-muted mt-3">关联企业</span>}
            </div>
          </Link>
        ))}
      </div>
      {scenes.length === 0 && <EmptyState title="暂无数字复原场景" description="后台发布数字场景后，将在这里展示复原图、热点和模型。" />}
    </div>
  )
}
