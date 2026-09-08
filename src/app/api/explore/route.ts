import { NextResponse } from 'next/server'
import { db } from '@/lib/dataService'

const THEME_TOURS = [
  {
    id: 'fanxudong',
    title: '范旭东与永利铔厂',
    description: '从民族实业家范旭东的视角，探索南京永利铔厂的发展历程与技术革新。',
    query: '范旭东 永利铔厂',
  },
  {
    id: 'chemical',
    title: '南京近代化工之路',
    description: '南京作为民国时期重要的化工基地，从永利铔厂到江南水泥厂的发展脉络。',
    query: '南京 化工 近代工业',
  },
  {
    id: 'industry',
    title: '民国工业遗产巡礼',
    description: '漫步南京民国时期留存至今的工业遗产，感受那个时代的工业脉搏。',
    query: '民国 南京 工业 遗址',
  },
  {
    id: 'houdebang',
    title: '侯德榜与制碱工艺',
    description: '从侯德榜的制碱工艺出发，了解中国近代化学工业的自主创新。',
    query: '侯德榜 制碱',
  },
]

export async function GET() {
  try {
    const sources = await db.sources.getAll()
    const activeSources = sources
      .filter(s => !s.isDeleted && (!s.reviewStatus || s.reviewStatus === 'approved'))
      .sort((a, b) => new Date(b.importedAt || b.createdAt).getTime() - new Date(a.importedAt || a.createdAt).getTime())

    // Daily recommendations: 3 high-credibility sources with AI intro
    const highCredSources = activeSources
      .filter(s => s.credibilityLevel === 'A' || s.credibilityLevel === 'B')
      .slice(0, 3)

    const dailyRecommendations = highCredSources.map(s => ({
      id: s.id,
      title: s.title,
      category: s.category || '',
      credibilityLevel: s.credibilityLevel,
      aiIntro: s.aiSummary?.slice(0, 80) || s.description?.slice(0, 80) || '暂无导读',
      fileType: s.fileType || '',
    }))

    // Latest additions: 6 newest
    const latestAdditions = activeSources.slice(0, 6).map(s => ({
      id: s.id,
      title: s.title,
      category: s.category || '',
      credibilityLevel: s.credibilityLevel,
      importedAt: s.importedAt || s.createdAt,
    }))

    return NextResponse.json({
      success: true,
      dailyRecommendations,
      themeTours: THEME_TOURS,
      latestAdditions,
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
