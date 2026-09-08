import { db } from '@/lib/dataService'
import { chat } from '@/lib/aiClient'
import type { Source, SourceLink, AiToken } from '@/types'

export interface MergeCandidate {
  source1: Source
  source2: Source
  similarity: number
  hashDuplicate: boolean
  mergedTitle: string
  mergedSummary: string
  conflictItems: string[]
}

export interface MergeResult {
  newSource: Source
  oldSourceIds: string[]
  transferredLinks: number
  transferredTokens: number
}

function calcTitleSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  if (na === nb) return 1.0
  const shorter = na.length < nb.length ? na : nb
  const longer = na.length < nb.length ? nb : na
  if (longer.includes(shorter) && shorter.length > 1) return 0.85
  // Simple character overlap ratio
  const setA = new Set(na.replace(/\s/g, ''))
  const setB = new Set(nb.replace(/\s/g, ''))
  let overlap = 0
  for (const c of setA) { if (setB.has(c)) overlap++ }
  return overlap / Math.max(setA.size, setB.size)
}

export async function findMergeCandidates(sourceId: string): Promise<MergeCandidate[]> {
  const source = await db.sources.getById(sourceId)
  if (!source) throw new Error('史料不存在')

  const allSources = await db.sources.getAll()
  const candidates: MergeCandidate[] = []

  for (const other of allSources) {
    if (other.id === sourceId) continue
    if (other.isDeleted) continue

    const hashDup = source.contentHash && other.contentHash && source.contentHash === other.contentHash
    const titleSim = calcTitleSimilarity(source.title, other.title)

    if (hashDup || titleSim >= 0.7) {
      candidates.push({
        source1: source,
        source2: other,
        similarity: hashDup ? 1.0 : titleSim,
        hashDuplicate: hashDup || false,
        mergedTitle: '',
        mergedSummary: '',
        conflictItems: [],
      })
    }
  }

  candidates.sort((a, b) => b.similarity - a.similarity)
  return candidates
}

export async function previewMerge(sourceId1: string, sourceId2: string): Promise<MergeCandidate> {
  const [s1, s2] = await Promise.all([db.sources.getById(sourceId1), db.sources.getById(sourceId2)])
  if (!s1 || !s2) throw new Error('一篇或多篇史料不存在')

  const hashDup = !!(s1.contentHash && s2.contentHash && s1.contentHash === s2.contentHash)
  const titleSim = calcTitleSimilarity(s1.title, s2.title)

  const candidate: MergeCandidate = {
    source1: s1,
    source2: s2,
    similarity: hashDup ? 1.0 : titleSim,
    hashDuplicate: hashDup,
    mergedTitle: s1.title,
    mergedSummary: '',
    conflictItems: [],
  }

  try {
    const prompt = `你是一个史料合并助手。请分析以下两篇史料并生成合并方案。

史料A:
  标题: ${s1.title}
  类别: ${s1.category || '未知'}
  可信度: ${s1.credibilityLevel}级
  摘要: ${(s1.aiSummary || s1.description || '').slice(0, 800)}

史料B:
  标题: ${s2.title}
  类别: ${s2.category || '未知'}
  可信度: ${s2.credibilityLevel}级
  摘要: ${(s2.aiSummary || s2.description || '').slice(0, 800)}

请用JSON格式回复:
{
  "mergedTitle": "合并后的标题（取更规范者）",
  "mergedSummary": "合并后的AI摘要，不超过200字",
  "conflictItems": ["如有内容冲突点，列在这里"]
}

要求:
- mergedTitle: 优先选择更完整、更规范的标题；如两者各有侧重，综合拟定
- mergedSummary: 整合两篇的关键信息，避免重复
- conflictItems: 仅在检测到明显矛盾（时间/地点/人物/数据不一致）时填写，无冲突返回空数组[]`;

    const aiResp = await chat([{ role: 'user', content: prompt }])
    const jsonMatch = aiResp.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      candidate.mergedTitle = parsed.mergedTitle || s1.title
      candidate.mergedSummary = parsed.mergedSummary || ''
      candidate.conflictItems = parsed.conflictItems || []
    }
  } catch {
    // AI unavailable, use basic merge
    candidate.mergedTitle = s1.title.length >= s2.title.length ? s1.title : s2.title
    candidate.mergedSummary = `${s1.title}: ${(s1.aiSummary || s1.description || '').slice(0, 100)} | ${s2.title}: ${(s2.aiSummary || s2.description || '').slice(0, 100)}`
  }

  return candidate
}

export async function executeMerge(sourceId1: string, sourceId2: string, approvedBy: string): Promise<MergeResult> {
  const [s1, s2] = await Promise.all([db.sources.getById(sourceId1), db.sources.getById(sourceId2)])
  if (!s1 || !s2) throw new Error('一篇或多篇史料不存在')

  // 获取合并预览
  const preview = await previewMerge(sourceId1, sourceId2)

  // 确定合并后属性
  const credibilityOrder = { A: 3, B: 2, C: 1 } as const
  const betterGrade = (credibilityOrder[s1.credibilityLevel] || 1) >= (credibilityOrder[s2.credibilityLevel] || 1)
    ? s1.credibilityLevel : s2.credibilityLevel

  // 创建合并后的新记录
  const now = new Date().toISOString()
  const newSource = await db.sources.create({
    title: preview.mergedTitle,
    type: s1.type,
    author: [s1.author, s2.author].filter(Boolean).join(', ') || approvedBy,
    publisher: [s1.publisher, s2.publisher].filter(Boolean).join(', ') || '',
    publishDate: s1.publishDate || s2.publishDate || '',
    url: '',
    fileUrl: s1.fileUrl || s2.fileUrl || '',
    description: preview.mergedSummary || [s1.description, s2.description].filter(Boolean).join('\n---\n'),
    category: s1.category || s2.category || '',
    credibilityLevel: betterGrade,
    fileType: s1.fileType || s2.fileType || '',
    fileName: s1.fileName || s2.fileName || '',
    fileSize: (s1.fileSize || 0) + (s2.fileSize || 0),
    fileExt: s1.fileExt || s2.fileExt || '',
    mimeType: s1.mimeType || s2.mimeType || '',
    sourceFileKind: s1.sourceFileKind || s2.sourceFileKind || '',
    aiReadable: s1.aiReadable || s2.aiReadable || false,
    extractStatus: 'pending',
    summaryStatus: preview.mergedSummary ? 'success' : 'pending',
    aiSummary: preview.mergedSummary || undefined,
    importedBy: approvedBy,
    importedAt: now,
    reviewStatus: 'approved',
    reviewConfidence: Math.max(s1.reviewConfidence || 0, s2.reviewConfidence || 0),
    reviewedBy: approvedBy,
    reviewedAt: now,
    contentHash: undefined,
  } as any)

  // 转移 SourceLinks：所有指向 s1 或 s2 的 link → 指向新 ID
  let transferredLinks = 0
  const allLinks = await db.sourceLinks.all()
  for (const link of allLinks) {
    if (link.isDeleted) continue
    let updated = false
    if (link.sourceId === sourceId1 || link.sourceId === sourceId2) {
      link.sourceId = newSource.id
      updated = true
    }
    if (link.targetId === sourceId1 || link.targetId === sourceId2) {
      link.targetId = newSource.id
      updated = true
    }
    if (updated) {
      await db.sourceLinks.update(link.id, { sourceId: link.sourceId, targetId: link.targetId } as any)
      transferredLinks++
    }
  }

  // 转移 AiTokens：原 token 标记 archived，创建新 token
  let transferredTokens = 0
  const allTokens = await db.aiTokens.all()
  for (const token of allTokens) {
    if (token.isDeleted) continue
    if (token.targetType === 'source' && (token.targetId === sourceId1 || token.targetId === sourceId2)) {
      await db.aiTokens.update(token.id, { isDeleted: true, status: 'archived' } as any)
      await db.aiTokens.create({
        targetType: 'source',
        targetId: newSource.id,
        summary: preview.mergedSummary || token.summary,
        keywords: token.keywords || [],
        entities: token.entities || [],
        tags: token.tags || [],
        traits: token.traits || [],
        category: token.category || '',
        confidenceScore: token.confidenceScore,
        isCredible: token.isCredible,
        doubts: token.doubts || [],
        errorPositions: token.errorPositions || [],
        relatedTargetIds: [],
        sourceIds: [newSource.id],
        status: 'active',
        summaryQuality: preview.mergedSummary ? 'full' : 'partial',
        manualOverride: false,
        modelProvider: token.modelProvider || 'local',
        modelName: token.modelName || '',
      } as any)
      transferredTokens++
    }
  }

  // 转移 Person.sourceIds
  const allPeople = await db.people.all()
  for (const p of allPeople) {
    if (p.isDeleted || !p.sourceIds) continue
    const hasOld = p.sourceIds.some((sid: string) => sid === sourceId1 || sid === sourceId2)
    if (hasOld) {
      const newSourceIds = p.sourceIds
        .filter((sid: string) => sid !== sourceId1 && sid !== sourceId2)
        .concat(newSource.id)
      await db.people.update(p.id, { sourceIds: [...new Set(newSourceIds)] } as any)
    }
  }

  // 转移 Site.sourceIds
  const allSites = await db.sites.all()
  for (const s of allSites) {
    if (s.isDeleted || !s.sourceIds) continue
    const hasOld = s.sourceIds.some((sid: string) => sid === sourceId1 || sid === sourceId2)
    if (hasOld) {
      const newSourceIds = s.sourceIds
        .filter((sid: string) => sid !== sourceId1 && sid !== sourceId2)
        .concat(newSource.id)
      await db.sites.update(s.id, { sourceIds: [...new Set(newSourceIds)] } as any)
    }
  }

  // 软删除原始记录
  await db.sources.update(sourceId1, { isDeleted: true } as any)
  await db.sources.update(sourceId2, { isDeleted: true } as any)

  return {
    newSource,
    oldSourceIds: [sourceId1, sourceId2],
    transferredLinks,
    transferredTokens,
  }
}
