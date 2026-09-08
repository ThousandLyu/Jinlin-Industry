'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import SmartImage from '@/components/shared/SmartImage'

const ModelViewer = dynamic(() => import('@/components/shared/ModelViewer'), { ssr: false, loading: () => (
  <div className="aspect-video rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center gap-4">
    <div className="relative h-16 w-16">
      <div className="absolute inset-0 rounded-full border-4 border-[#C49A2B]/30" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#C49A2B] animate-spin" />
    </div>
    <div className="text-center">
      <p className="text-white/80 text-sm">3D 模型加载中…</p>
      <p className="text-white/40 text-xs mt-1">首次加载较慢，请稍候</p>
    </div>
  </div>
) })

export default function SceneDetailClient({
  scene,
  relatedSite,
}: {
  scene: any | null
  relatedSite: any | null
}) {
  const [imgLoaded, setImgLoaded] = useState(false)

  if (!scene) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="empty-state mx-4">
          <p className="text-lg">场景不存在</p>
          <a href="/scenes" className="text-sm text-[#C49A2B] hover:underline mt-2 inline-block">
            返回场景列表
          </a>
        </div>
      </div>
    )
  }

  const imageSrc = scene.imageUrl || scene.image

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="relative h-64 overflow-hidden md:h-80">
        <div className="absolute inset-0 bg-[#4A3728]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#4A3728_0%,#4A3728_58%,#8B1A2B_100%)] opacity-90" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
          <p className="content-hero-kicker">Digital Scene</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {scene.title}
          </h1>
          <p className="text-sm text-white/70">数字复原场景</p>
        </div>
      </div>

      <div className="content-page">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左栏：3D 模型（优先）或场景图 */}
          <div className="lg:col-span-2">
            {/* 3D 模型 — 优先显示 */}
            {scene.modelUrl ? (
              <div className="content-panel p-6 mb-6">
                <h2 className="text-lg font-bold text-[#4A3728] mb-3">3D 数字复原模型</h2>
                <ModelViewer modelUrl={scene.modelUrl} modelType={scene.modelType} />
              </div>
            ) : null}

            {/* 复原图 */}
            <div className="content-panel overflow-hidden">
              {imageSrc ? (
                <div className="relative aspect-video overflow-hidden bg-[#F0EBE0]">
                  {!imgLoaded && (
                    <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-[#F0EBE0] to-[#E8DCC8]">
                      <div className="absolute left-6 top-6 h-3 w-32 rounded bg-white/60" />
                      <div className="absolute bottom-6 left-6 h-3 w-48 rounded bg-white/50" />
                    </div>
                  )}
                  <SmartImage
                    src={imageSrc}
                    alt={scene.title}
                    fill
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    className={`object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoadingComplete={() => setImgLoaded(true)}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-[#4A3728] to-[#8B1A2B] flex items-center justify-center text-white text-2xl font-bold">
                  {scene.title}
                </div>
              )}
            </div>
          </div>

          {/* 右栏：详情 */}
          <div className="space-y-6">
            {/* 描述 */}
            <div className="content-panel p-6">
              <h2 className="text-lg font-bold text-[#4A3728] mb-3">场景简介</h2>
              <p className="content-copy">
                {scene.description || '暂无描述'}
              </p>
            </div>

            {/* 关联企业 */}
            {relatedSite && (
              <div className="content-panel p-6">
                <h2 className="text-lg font-bold text-[#4A3728] mb-3">关联企业遗址</h2>
                <a
                  href={`/sites/${relatedSite.slug}`}
                  className="flex items-center gap-3 p-3 bg-[#F5F0E8] rounded-lg hover:bg-[#F0EBE0] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4A3728] to-[#C49A2B] flex items-center justify-center text-white font-bold text-sm">
                    {relatedSite.name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-[#4A3728]">{relatedSite.name}</p>
                    <p className="text-xs text-gray-400">{relatedSite.industry || ''}</p>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
