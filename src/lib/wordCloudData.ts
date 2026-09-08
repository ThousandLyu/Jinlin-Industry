import { db } from '@/lib/dataService'
import type { WordCloudItem } from '@/lib/wordCloudUtils'
import { sizeFromWeight } from '@/lib/wordCloudUtils'

export async function buildWordCloudData(): Promise<{ words: WordCloudItem[]; maxWeight: number }> {
  const [sources, links, tokens, people] = await Promise.all([
    db.sources.getAll(),
    db.sourceLinks.getAll(),
    db.aiTokens.getAll(),
    db.people.getAll(),
  ])

  const approvedSources = sources.filter(s => !s.isDeleted && (!s.reviewStatus || s.reviewStatus === 'approved'))
  const approvedLinks = links.filter(l => !l.isDeleted && l.isApproved)
  const activeTokens = tokens.filter(t => !t.isDeleted && t.targetType === 'source')

  // 计算 link 网络中每个 source 的度数中心性
  const sourceDegrees = new Map<string, number>()
  for (const link of approvedLinks) {
    sourceDegrees.set(link.sourceId, (sourceDegrees.get(link.sourceId) || 0) + 1)
    sourceDegrees.set(link.targetId, (sourceDegrees.get(link.targetId) || 0) + 1)
  }

  // 聚合数据
  const wordMap = new Map<string, {
    text: string
    linkWeight: number
    tokenWeight: number
    crossRefWeight: number
    type: WordCloudItem['type']
    relatedSourceIds: Set<string>
    sourceCountMap: Map<string, number>
  }>()

  // Link权重: 从链接网络提取关键词
  for (const source of approvedSources) {
    const degree = sourceDegrees.get(source.id) || 0
    if (degree === 0) continue

    const titleWords = source.title.split(/[\s\-—,_、，。/；;：:（）()]+/).filter(w => w.length >= 2)
    for (const word of titleWords) {
      addWord(word, degree, 0, 0, 'keyword', source.id)
    }
  }

  // Token权重: AiToken中的keywords/entities
  for (const token of activeTokens) {
    for (const kw of token.keywords || []) {
      const k = String(kw).trim()
      if (k.length >= 2 && k !== '[object Object]') addWord(k, 0, 1, 0, 'keyword', token.targetId)
    }
    for (const entity of token.entities || []) {
      const e = String(entity).trim()
      if (e.length >= 2 && e !== '[object Object]') addWord(e, 0, 1, 0, 'entity', token.targetId)
    }
  }

  // CrossRef权重: Person关联的source数量
  for (const person of people) {
    if (person.isDeleted || !person.sourceIds?.length) continue
    const approvedRefs = person.sourceIds.filter(sid => approvedSources.some(s => s.id === sid))
    if (approvedRefs.length === 0) continue
    addWord(person.name, 0, 0, approvedRefs.length, 'person', '')
    for (const sid of approvedRefs) {
      const word = wordMap.get(person.name)
      if (word) word.relatedSourceIds.add(sid)
    }
  }

  // 补充 source 标题关键词的 source 归因
  for (const source of approvedSources) {
    const titleWords = source.title.split(/[\s\-—,_、，。/；;：;（）()]+/).filter(w => w.length >= 2)
    for (const word of titleWords) {
      const entry = wordMap.get(word)
      if (entry) entry.relatedSourceIds.add(source.id)
    }
  }

  // 计算综合权重并转换为WordCloudItem
  const words: WordCloudItem[] = []
  for (const [text, data] of wordMap) {
    const weight = data.linkWeight * 0.5 + data.tokenWeight * 0.3 + data.crossRefWeight * 0.2
    if (weight < 1) continue

    const relatedSources: WordCloudItem['relatedSources'] = []
    for (const sid of data.relatedSourceIds) {
      const s = approvedSources.find(src => src.id === sid)
      if (s) {
        relatedSources.push({
          id: s.id,
          title: s.title,
          grade: s.credibilityLevel,
          count: data.sourceCountMap.get(sid) || 1,
        })
      }
    }
    relatedSources.sort((a, b) => b.count - a.count)

    words.push({
      text,
      size: 0, // will be calculated
      weight,
      type: data.type,
      relatedSources: relatedSources.slice(0, 20),
      totalRelated: data.relatedSourceIds.size,
    })
  }

  words.sort((a, b) => b.weight - a.weight)
  const topWords = words.slice(0, 80)
  const maxWeight = topWords.length > 0 ? topWords[0].weight : 1

  for (const w of topWords) {
    w.size = sizeFromWeight(w.weight, maxWeight)
  }

  return { words: topWords, maxWeight }

  function addWord(
    text: string,
    linkW: number,
    tokenW: number,
    crossW: number,
    type: WordCloudItem['type'],
    sourceId: string,
  ) {
    const existing = wordMap.get(text)
    if (existing) {
      existing.linkWeight += linkW
      existing.tokenWeight += tokenW
      existing.crossRefWeight += crossW
      if (sourceId) {
        existing.relatedSourceIds.add(sourceId)
        existing.sourceCountMap.set(sourceId, (existing.sourceCountMap.get(sourceId) || 0) + 1)
      }
      if (type === 'person') existing.type = 'person'
      else if (type === 'entity' && existing.type !== 'person') existing.type = 'entity'
    } else {
      wordMap.set(text, {
        text,
        linkWeight: linkW,
        tokenWeight: tokenW,
        crossRefWeight: crossW,
        type,
        relatedSourceIds: new Set(sourceId ? [sourceId] : []),
        sourceCountMap: new Map(sourceId ? [[sourceId, 1]] : []),
      })
    }
  }
}
