import { db } from '@/lib/dataService';
import { searchAiTokens } from '@/lib/aiTokenService';
import { chatWithMeta } from '@/lib/aiClient';
import { normalizeSearchTerms } from '@/lib/sourceSearch';
import type { Source } from '@/types';

export interface SemanticSearchResult {
  id: string;
  title: string;
  grade: string;
  fileType: string;
  summary: string;
  score: number;
  aiRelevance: string; // AI给出的相关性理由
  intentTags: string[]; // AI理解的检索意图标签
}

/** AI语义检索：先AiToken命中→AI精排top10→返回排序+理由 */
export async function semanticSearchSources(query: string, limit = 10): Promise<SemanticSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];
  const terms = normalizeSearchTerms(keyword);

  // Phase 1: AiToken缓存命中
  const [sources, aiTokens] = await Promise.all([
    db.sources.getAll(),
    searchAiTokens(keyword, 30),
  ]);
  const tokenMap = new Map(aiTokens.filter(t => t.targetType === 'source').map(t => [t.targetId, t]));
  const activeSources = sources.filter(s => !s.isDeleted);

  // 评分：aiToken命中 + 元数据匹配
  const scored = activeSources.map(s => {
    const token = tokenMap.get(s.id);
    let score = 0;
    const haystack = [s.title, s.fileName, s.aiSummary, s.description, s.category || ''].join(' ').toLowerCase();
    for (const term of terms) {
      const q = term.toLowerCase();
      if (haystack.includes(q)) score += q === keyword.toLowerCase() ? 5 : 3;
      if (token) {
        if ((token.summary || '').toLowerCase().includes(q)) score += 5;
        if ((token.keywords || []).some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) score += 3;
        if ((token.entities || []).some(e => e.toLowerCase().includes(q) || q.includes(e.toLowerCase()))) score += 3;
      }
    }
    if (token) {
      score += 8;
    }
    return { source: s, token, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [];
  }

  // Phase 2: top 10 → AI精排
  const topCandidates = scored.slice(0, Math.min(10, scored.length));
  let ranked = topCandidates;

  try {
    const contextParts = topCandidates.map((c, i) =>
      `[${i + 1}] 标题:${c.source.title || c.source.fileName} | 摘要:${c.token?.summary || c.source.aiSummary || ''} | 关键词:${(c.token?.keywords || []).join(',')}`
    );
    const result = await chatWithMeta([
      { role: 'system', content: '你是史料检索精排助手。根据用户查询，对候选史料进行相关性排序并解释原因。只返回JSON: {"ranking":[{"index":1,"relevance":"理由(≤20字)"}],"intentTags":["标签1"]}' },
      { role: 'user', content: `查询: ${query}\n\n候选:\n${contextParts.join('\n')}` },
    ], { timeoutMs: 6000, allowCloudFallback: false });

    const parsed = parseJson(result.content);
    if (parsed?.ranking && Array.isArray(parsed.ranking)) {
      const rankMap = new Map(parsed.ranking.map((r: any) => [Number(r.index), String(r.relevance || '')]));
      const tagged = topCandidates.map((c, i) => ({ ...c, origIndex: i, relevance: rankMap.get(i + 1) || '', intentTags: parsed.intentTags || [] }));
      const rankedSet = new Set(parsed.ranking.map((r: any) => Number(r.index)));
      tagged.sort((a, b) => {
        const aRanked = rankedSet.has(a.origIndex + 1) ? 0 : 1;
        const bRanked = rankedSet.has(b.origIndex + 1) ? 0 : 1;
        return aRanked - bRanked;
      });
      ranked = tagged;
    }
  } catch {
    // AI精排失败，用初始评分排序
  }

  return ranked.slice(0, limit).map(c => ({
    id: c.source.id,
    title: c.source.title || c.source.fileName || '',
    grade: c.source.credibilityLevel || 'C',
    fileType: c.source.fileType || '',
    summary: c.token?.summary || c.source.aiSummary || '',
    score: c.score,
    aiRelevance: (c as any).relevance || '关键词匹配',
    intentTags: (c as any).intentTags || [],
  }));
}

/** 跨实体检索：史料+人物+遗址+史实 */
export async function semanticSearchAll(query: string, limit = 15): Promise<{
  sources: SemanticSearchResult[];
  people: { id: string; name: string; title: string; score: number }[];
  sites: { id: string; name: string; industry: string; score: number }[];
}> {
  const keyword = query.trim();
  if (!keyword) return { sources: [], people: [], sites: [] };

  const [sourcesResult, people, sites] = await Promise.all([
    semanticSearchSources(query, limit),
    db.people.getAll(),
    db.sites.getAll(),
  ]);

  const q = keyword.toLowerCase();
  const peopleResult = people
    .filter(p => !p.isDeleted && (p.name.includes(q) || q.includes(p.name) || (p.biography || '').includes(q)))
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, title: p.title || '', score: p.name.includes(q) ? 10 : 5 }));

  const sitesResult = sites
    .filter(s => !s.isDeleted && (s.name.includes(q) || q.includes(s.name) || (s.description || '').includes(q)))
    .slice(0, 5)
    .map(s => ({ id: s.id, name: s.name, industry: s.industry || '', score: s.name.includes(q) ? 10 : 5 }));

  return { sources: sourcesResult, people: peopleResult, sites: sitesResult };
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
