import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/dataService'
import { chat } from '@/lib/aiClient'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id1 = searchParams.get('id1')
  const id2 = searchParams.get('id2')

  if (!id1 || !id2) {
    return NextResponse.json({ success: false, message: '需要 id1 和 id2 参数' }, { status: 400 })
  }

  try {
    const [source1, source2] = await Promise.all([
      db.sources.getById(id1),
      db.sources.getById(id2),
    ])

    if (!source1 || !source2) {
      return NextResponse.json({ success: false, message: '一篇或多篇史料不存在' }, { status: 404 })
    }

    // Try AI analysis
    let aiAnalysis = {
      similarities: [] as string[],
      differences: [] as string[],
      overallSummary: '',
    }

    try {
      const prompt = `比较以下两篇史料，找出相同点和差异点。用JSON格式回复，包含similarities(相同点数组)和differences(差异点数组)，每个条目不超过30字。

史料A标题: ${source1.title}
史料A摘要: ${(source1.aiSummary || source1.description || '(无)').slice(0, 500)}

史料B标题: ${source2.title}
史料B摘要: ${(source2.aiSummary || source2.description || '(无)').slice(0, 500)}`

      const aiResp = await chat([{ role: 'user', content: prompt }])
      const jsonMatch = aiResp.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        aiAnalysis = {
          similarities: parsed.similarities || [],
          differences: parsed.differences || [],
          overallSummary: parsed.overallSummary || '',
        }
      }
    } catch {
      // AI unavailable, use basic comparison
      if (source1.category === source2.category) aiAnalysis.similarities.push(`均为${source1.category}类史料`)
      if (source1.credibilityLevel === source2.credibilityLevel) aiAnalysis.similarities.push(`可信度均为${source1.credibilityLevel}级`)
      if (source1.category !== source2.category) {
        aiAnalysis.differences.push(`史料A为${source1.category || '未知'}类，史料B为${source2.category || '未知'}类`)
      }
    }

    const getText = (s: typeof source1) => ({
      title: s.title,
      category: s.category || '未分类',
      credibilityLevel: s.credibilityLevel,
      author: s.author || '',
      publishDate: s.publishDate || '',
      type: s.type || '',
      summary: s.aiSummary || s.description || '',
      description: s.description || '',
    })

    return NextResponse.json({
      success: true,
      source1: getText(source1),
      source2: getText(source2),
      aiAnalysis,
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 })
  }
}
