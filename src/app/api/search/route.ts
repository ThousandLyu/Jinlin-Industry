import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/dataService'
import { answerWithSources, generateDeepSearchAnalysis, generateSearchBrief, isAIEnabledAsync, stringifyField, normalizeArray, normalizeUnitScore } from '@/lib/aiClient'
import { buildSourceContext, normalizeSearchTerms, searchSourceLibrary } from '@/lib/sourceSearch'
import { buildAiTokenContext, searchAiTokens } from '@/lib/aiTokenService'
import { streamAI } from '@/lib/aiProvider'
import { parseLooseJsonObject } from '@/lib/jsonUtils'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''
  const includeBrief = request.nextUrl.searchParams.get('includeBrief') === '1'
  const keyword = q.trim().toLowerCase()
  const terms = normalizeSearchTerms(q)

  if (!keyword) {
    return NextResponse.json({ results: [], total: 0, aiBrief: null, aiBriefStatus: 'no_sources' })
  }

  // 并行搜索所有数据类型
  const [sites, people, facts, timeline, sources, scenes, courses, activities] = await Promise.all([
    db.sites.getAll(),
    db.people.getAll(),
    db.facts.getAll(),
    db.timeline.getAll(),
    db.sources.getAll(),
    db.scenes.getAll(),
    db.courses.getAll(),
    db.activities.getAll(),
  ])

  const match = (text: unknown) => {
    const haystack = String(text || '').toLowerCase()
    return terms.some(term => haystack.includes(term.toLowerCase()))
  }

  const allResults: Array<{
    id: string
    type: string
    typeLabel: string
    title: string
    subtitle?: string
    url: string
    snippet?: string
  }> = []

  // 企业遗址
  sites.filter((s: any) => !s.isDeleted && s.isPublished).forEach((s: any) => {
    if (match(s.name) || match(s.description) || match(s.industry) || match(s.period) || match(s.historicalValue)) {
      allResults.push({
        id: s.id, type: 'site', typeLabel: '企业遗址',
        title: s.name, subtitle: s.industry,
        url: `/sites/${s.slug}`,
        snippet: s.description?.slice(0, 100),
      })
    }
  })

  // 人物
  people.filter((p: any) => !p.isDeleted).forEach((p: any) => {
    if (match(p.name) || match(p.title) || match(p.bio) || match(p.biography) || match(p.stories)) {
      allResults.push({
        id: p.id, type: 'person', typeLabel: '人物故事',
        title: p.name, subtitle: p.title,
        url: `/people#${p.id}`,
        snippet: (p.bio || p.biography)?.slice(0, 100),
      })
    }
  })

  // 史实
  facts.filter((f: any) => !f.isDeleted && f.isPublished).forEach((f: any) => {
    if (match(f.claimText) || match(f.publicExpression) || match(f.claimTime) || match(f.industry)) {
      allResults.push({
        id: f.id, type: 'fact', typeLabel: '史实核验',
        title: f.claimText?.slice(0, 60), subtitle: f.claimTime,
        url: `/facts#${f.id}`,
        snippet: f.publicExpression?.slice(0, 100) || f.claimText?.slice(0, 100),
      })
    }
  })

  // 时间轴
  timeline.filter((t: any) => !t.isDeleted).forEach((t: any) => {
    if (match(t.title) || match(t.description)) {
      allResults.push({
        id: t.id, type: 'timeline', typeLabel: '时间轴',
        title: t.title, subtitle: `${t.year}年`,
        url: `/timeline#${t.id}`,
        snippet: t.description?.slice(0, 100),
      })
    }
  })

  // 史料
  sources.filter((src: any) => !src.isDeleted).forEach((src: any) => {
    if (match(src.title) || match(src.author) || match(src.description) || match(src.content)) {
      allResults.push({
        id: src.id, type: 'source', typeLabel: '史料来源',
        title: src.title,
        url: `/sources/${src.id}`,
        snippet: src.description?.slice(0, 100),
      })
    }
  })

  // 数字复原
  scenes.filter((sc: any) => !sc.isDeleted).forEach((sc: any) => {
    if (match(sc.title) || match(sc.description)) {
      allResults.push({
        id: sc.id, type: 'scene', typeLabel: '数字复原',
        title: sc.title, subtitle: '',
        url: `/scenes/${sc.id}`,
        snippet: sc.description?.slice(0, 100),
      })
    }
  })

  // 课程
  courses.filter((c: any) => !c.isDeleted).forEach((c: any) => {
    if (match(c.title) || match(c.description) || match(c.topic)) {
      allResults.push({
        id: c.id, type: 'course', typeLabel: '公益课程',
        title: c.title, subtitle: c.topic,
        url: `/courses#${c.id}`,
        snippet: c.description?.slice(0, 100),
      })
    }
  })

  // 活动
  activities.filter((a: any) => !a.isDeleted).forEach((a: any) => {
    if (match(a.title) || match(a.description) || match(a.location)) {
      allResults.push({
        id: a.id, type: 'activity', typeLabel: '活动记录',
        title: a.title, subtitle: a.location,
        url: `/activities#${a.id}`,
        snippet: a.description?.slice(0, 100),
      })
    }
  })

  const payload: any = {
    keyword: q,
    results: allResults.slice(0, 50),
    total: allResults.length,
  }

  if (includeBrief) {
    const brief = await buildBrief(q)
    payload.aiBrief = brief.aiBrief
    payload.aiBriefStatus = brief.aiBriefStatus
  }

  return NextResponse.json(payload)
}

// POST 用于AI问答
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, mode, stream } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ success: false, message: '请提供问题' }, { status: 400 })
    }

    const enabled = await isAIEnabledAsync()

    // 先搜索史料库
    const sources = await searchSourceLibrary(question, 6)
    const directSources = sources.filter(source => source.score > 0)
    const sourceContext = buildSourceContext(mode === 'deep' ? directSources : sources)

    if (mode === 'deep') {
      const aiTokens = await searchAiTokens(question, 8)
      const aiTokenContext = buildAiTokenContext(aiTokens)

      if (!enabled) {
        return NextResponse.json({
          success: false,
          enabled: false,
          message: 'AI 未启用，本次仅返回史料库检索结果。',
          summary: 'AI 未启用，无法生成深度分析。',
          keywords: [],
          entities: [],
          analysis: '',
          confidence: 0,
          evidence: [],
          sources,
        })
      }

      if (stream) {
        return handleDeepStream(question, sourceContext, aiTokenContext)
      }

      const result = await generateDeepSearchAnalysis({
        query: question,
        sourceContext,
        aiTokenContext,
      })
      return NextResponse.json({
        success: true,
        enabled: true,
        ...result,
        sources,
      })
    }

    if (!enabled) {
      return NextResponse.json({
        aiEnabled: false,
        message: '当前未配置AI模型。已为你检索到相关史料：',
        sources,
        sourceContext,
      })
    }

    const answer = await answerWithSources(question, sourceContext)
    return NextResponse.json({
      aiEnabled: true,
      answer,
      sources,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'AI请求失败', error: String(error) },
      { status: 500 }
    )
  }
}

async function buildBrief(query: string): Promise<{ aiBrief: string | null; aiBriefStatus: string }> {
  const enabled = await isAIEnabledAsync()
  if (!enabled) return { aiBrief: null, aiBriefStatus: 'disabled' }

  const sources = await searchSourceLibrary(query, 4)
  const directSources = sources.filter(source => source.score > 0)
  if (directSources.length === 0) return { aiBrief: '暂无结果', aiBriefStatus: 'no_sources' }

  try {
    const aiBrief = await generateSearchBrief({
      query,
      sourceContext: buildSourceContext(directSources),
    })
    return { aiBrief, aiBriefStatus: 'success' }
  } catch (error) {
    const message = String(error).toLowerCase()
    return {
      aiBrief: null,
      aiBriefStatus: message.includes('abort') || message.includes('timeout') ? 'timeout' : 'failed',
    }
  }
}

async function handleDeepStream(question: string, sourceContext: string, aiTokenContext: string) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ type: 'start', sourcesCount: sourceContext ? 1 : 0 })

        const messages = [
          {
            role: 'system' as const,
            content: [
              '你是"金陵工脉"史料深度解读助手。',
              '信息优先级必须是：1. 史料库上下文；2. aiToken 摘要、标签、实体；3. 模型推理。',
              '必须明确区分"已有史料内容"和"AI推断内容"。',
              '没有史料直接支撑的内容只能放入 AI 推断，并说明待核验，不得当作事实。',
              '如果没有直接史料，summary 必须包含"当前史料库未检索到直接记载"。',
              '只返回 JSON 对象，不要 Markdown 代码块。',
              '格式：{"summary":"","keywords":[],"entities":[],"analysis":"","confidence":0,"evidence":[{"sourceId":"","title":"","quote":"","ref":"S1"}]}',
              'confidence 使用 0-1 小数。',
            ].join('\n'),
          },
          {
            role: 'user' as const,
            content: [
              `用户问题：${question}`,
              '史料库上下文：',
              sourceContext || '未检索到相关史料。',
              'aiToken 上下文：',
              aiTokenContext || '未检索到相关 aiToken。',
            ].join('\n\n'),
          },
        ]

        let fullText = ''
        for await (const chunk of streamAI(messages, { timeoutMs: 8000, maxTokens: 1800, allowCloudFallback: true })) {
          fullText += chunk
          send({ type: 'chunk', text: chunk })
        }

        const parsed = parseLooseJsonObject(fullText)
        const value = parsed || {}
        const evidence = Array.isArray(value.evidence) ? value.evidence : []

        send({
          type: 'done',
          summary: stringifyField(value.summary) || (sourceContext ? '' : '当前史料库未检索到直接记载。'),
          keywords: normalizeArray(value.keywords),
          entities: normalizeArray(value.entities),
          analysis: parsed ? stringifyField(value.analysis || value.content) : stringifyField(fullText),
          confidence: normalizeUnitScore(value.confidence),
          evidence: evidence.map((item: any) => ({
            sourceId: stringifyField(item.sourceId),
            title: stringifyField(item.title),
            quote: stringifyField(item.quote),
            ref: stringifyField(item.ref),
          })).filter((item: any) => item.sourceId || item.title || item.quote).slice(0, 8),
        })
      } catch (error) {
        send({ type: 'error', message: String(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
