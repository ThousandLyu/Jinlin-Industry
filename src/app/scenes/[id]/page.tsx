import { db } from '@/lib/dataService'
import SceneDetailClient from './SceneDetailClient'

export default async function SceneDetailPage({ params }: { params: { id: string } }) {
  const scenes = await db.scenes.getAll()
  const scene = scenes.find((s: any) => !s.isDeleted && s.id === params.id) || null

  let relatedSite = null
  if (scene?.siteId) {
    const sites = await db.sites.getAll()
    relatedSite = sites.find((s: any) => !s.isDeleted && s.id === scene.siteId) || null
  }

  return <SceneDetailClient scene={scene} relatedSite={relatedSite} />
}
