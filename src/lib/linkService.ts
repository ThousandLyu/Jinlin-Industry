import { db } from '@/lib/dataService';
import { chatWithMeta } from '@/lib/aiClient';
import type { SourceLink, Source } from '@/types';

/** 为一条史料发现AI关联 */
export async function discoverLinks(sourceId: string): Promise<SourceLink[]> {
  const source = await db.sources.getById(sourceId);
  if (!source) return [];

  const allSources = await db.sources.getAll();
  const tokens = await db.aiTokens.getAll();
  const sourceToken = tokens.find(t => t.targetType === 'source' && t.targetId === sourceId);

  if (!sourceToken) return [];

  const existingLinks = await db.sourceLinks.getAll();
  const existingPairs = new Set(existingLinks.map(l => `${l.sourceId}::${l.targetId}`));
  const rejectedPairs = new Set(existingLinks.filter(l => !l.isApproved).map(l => `${l.sourceId}::${l.targetId}`));

  // 用AiToken语义匹配候选（取summary+keywords+entities交叠作为候选）
  const candidates = allSources
    .filter(s => !s.isDeleted && s.id !== sourceId)
    .map(s => {
      const sToken = tokens.find(t => t.targetType === 'source' && t.targetId === s.id);
      if (!sToken) return { source: s, token: sToken, overlap: 0 };
      const haystack = [sToken.summary, ...(sToken.keywords || []), ...(sToken.entities || [])].join(' ').toLowerCase();
      const needles = [sourceToken.summary, ...(sourceToken.keywords || []), ...(sourceToken.entities || [])].join(' ').toLowerCase();
      const words = new Set(needles.split(/\s+/).filter(w => w.length >= 2));
      let overlap = 0;
      for (const w of words) { if (haystack.includes(w)) overlap++; }
      return { source: s, token: sToken, overlap };
    })
    .filter(c => c.overlap >= 3)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 10);

  const newLinks: SourceLink[] = [];

  for (const c of candidates) {
    const pairKey = `${sourceId}::${c.source.id}`;
    if (existingPairs.has(pairKey) || rejectedPairs.has(pairKey)) continue;

    // AI评估关系类型+置信度
    try {
      const result = await chatWithMeta([
        { role: 'system', content: '你是文献关联判断助手。判断两条史料之间的关系。只返回JSON: {"relationType":"cites|supports|contradicts|extends|related","confidence":0.7,"aiReason":"理由(≤50字)"}。置信度<0.6不关联。' },
        { role: 'user', content: `史料A: ${source.title}\n摘要: ${sourceToken.summary}\n关键词: ${(sourceToken.keywords||[]).join(',')}\n\n史料B: ${c.source.title}\n摘要: ${c.token?.summary||''}\n关键词: ${(c.token?.keywords||[]).join(',')}` },
      ], { timeoutMs: 6000, allowCloudFallback: false });

      const parsed = parseJson(result.content);
      if (parsed && Number(parsed.confidence) >= 0.6) {
        const confidence = Math.min(1, Math.max(0, Number(parsed.confidence)));
        const link = await db.sourceLinks.create({
          sourceId,
          targetId: c.source.id,
          relationType: ['cites','supports','contradicts','extends','related'].includes(parsed.relationType) ? parsed.relationType : 'related',
          confidence,
          aiReason: String(parsed.aiReason || '').slice(0, 200),
          isApproved: confidence >= 0.9,
          isEdited: false,
        } as Omit<SourceLink, 'id'|'createdAt'|'updatedAt'|'isDeleted'>);
        newLinks.push(link);
      }
    } catch {
      // 单条失败继续
    }
  }

  return newLinks;
}

/** 全库扫描发现关联 */
export async function batchDiscoverLinks(): Promise<{ processed: number; found: number }> {
  const sources = await db.sources.getAll();
  let found = 0;
  for (const s of sources.slice(0, 20)) {
    if (s.isDeleted || s.extractStatus !== 'success') continue;
    try {
      const links = await discoverLinks(s.id);
      found += links.length;
    } catch {}
    await new Promise(r => setTimeout(r, 3000));
  }
  return { processed: Math.min(20, sources.length), found };
}

/** BFS展开N级关联网络 */
export async function getLinkNetwork(sourceIds: string[], maxDepth = 3): Promise<{
  nodes: Array<{ id: string; title: string; type: string }>;
  edges: SourceLink[];
}> {
  const allLinks = await db.sourceLinks.getAll();
  const approved = allLinks.filter(l => l.isApproved && l.confidence >= 0.9);
  const allSources = await db.sources.getAll();
  const sourceMap = new Map(allSources.map(s => [s.id, s]));

  const visited = new Set<string>();
  const nodes: Array<{ id: string; title: string; type: string }> = [];
  const edges: SourceLink[] = [];
  let frontier = new Set(sourceIds);

  for (let depth = 0; depth < maxDepth && frontier.size > 0; depth++) {
    const nextFrontier = new Set<string>();
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      const s = sourceMap.get(id);
      if (s) nodes.push({ id, title: s.title || s.fileName || id, type: 'source' });

      const connected = approved.filter(l => l.sourceId === id || l.targetId === id);
      for (const l of connected) {
        edges.push(l);
        const other = l.sourceId === id ? l.targetId : l.sourceId;
        if (!visited.has(other)) nextFrontier.add(other);
      }
    }
    frontier = nextFrontier;
    if (nodes.length >= 10) break;
  }

  return { nodes: nodes.slice(0, 10), edges };
}

/** 获取某史料的所有关联 */
export async function getLinksBySource(sourceId: string): Promise<SourceLink[]> {
  const all = await db.sourceLinks.getAll();
  return all.filter(l => l.sourceId === sourceId || l.targetId === sourceId);
}

/** 审核操作 */
export async function approveLink(id: string): Promise<SourceLink | null> {
  return db.sourceLinks.update(id, { isApproved: true, isEdited: true } as Partial<SourceLink>);
}
export async function rejectLink(id: string): Promise<SourceLink | null> {
  return db.sourceLinks.update(id, { isApproved: false, isEdited: true } as Partial<SourceLink>);
}
export async function editLink(id: string, data: Partial<SourceLink>): Promise<SourceLink | null> {
  return db.sourceLinks.update(id, { ...data, isEdited: true } as Partial<SourceLink>);
}

/** 全库关联统计 */
export async function getLinkStats(): Promise<{ totalLinks: number; approvedLinks: number; avgConfidence: number }> {
  const all = await db.sourceLinks.getAll();
  const approved = all.filter(l => l.isApproved);
  return {
    totalLinks: all.length,
    approvedLinks: approved.length,
    avgConfidence: all.length > 0 ? Math.round(all.reduce((s, l) => s + l.confidence, 0) / all.length * 100) / 100 : 0,
  };
}

function parseJson(raw: string): any | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}
