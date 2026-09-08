import { db } from '@/lib/dataService';
import { chatWithMeta } from '@/lib/aiClient';
import { readExtractedSourceText } from '@/lib/sourceTextExtractor';
import type { Source, Person, HeritageSite } from '@/types';

export interface LinkSuggestion {
  targetType: 'person' | 'site' | 'fact' | 'timeline';
  targetId: string;
  targetName: string;
  confidence: number;
  reason: string;
}

/** AI分析史料内容，推荐关联的 Person/Site/Fact/Timeline */
export async function suggestLinks(sourceId: string): Promise<{
  sourceTitle: string;
  suggestions: LinkSuggestion[];
}> {
  const source = await db.sources.getById(sourceId);
  if (!source) throw new Error('史料不存在');

  const sourceTitle = source.title || source.fileName || '未命名';
  const text = await readExtractedSourceText(source as Source, 8000);

  const [people, sites] = await Promise.all([
    db.people.getAll(),
    db.sites.getAll(),
  ]);

  if (!text) {
    return { sourceTitle, suggestions: [] };
  }

  try {
    const contextParts = [
      `史料: ${sourceTitle}`,
      `文本: ${text.slice(0, 4000)}`,
      '',
      '可关联人物:',
      ...people.filter((p: Person) => !p.isDeleted).slice(0, 30).map((p: Person) => `  - ID:${p.id} | 名称:${p.name} | 简介:${(p.biography || '').slice(0, 60)}`),
      '',
      '可关联企业遗址:',
      ...sites.filter((s: HeritageSite) => !s.isDeleted).slice(0, 20).map((s: HeritageSite) => `  - ID:${s.id} | 名称:${s.name} | 行业:${s.industry || ''}`),
    ].join('\n');

    const result = await chatWithMeta([
      { role: 'system', content: '你是史料关联分析助手。根据史料文本，推荐应关联的人物和企业遗址。只返回JSON数组: [{"targetType":"person|site","targetId":"","targetName":"","confidence":0.8,"reason":"理由(≤30字)"}]。置信度≥0.7才推荐。无明确关联返回[]。' },
      { role: 'user', content: contextParts },
    ], { timeoutMs: 8000, allowCloudFallback: false });

    const parsed = parseJsonArray(result.content);
    if (parsed && Array.isArray(parsed)) {
      return {
        sourceTitle,
        suggestions: parsed
          .filter((s: any) => s.targetId && s.targetType && Number(s.confidence) >= 0.7)
          .map((s: any) => ({
            targetType: s.targetType,
            targetId: String(s.targetId),
            targetName: String(s.targetName || ''),
            confidence: Number(s.confidence),
            reason: String(s.reason || ''),
          }))
          .slice(0, 10),
      };
    }
    return { sourceTitle, suggestions: [] };
  } catch {
    return { sourceTitle, suggestions: [] };
  }
}

function parseJsonArray(raw: string): any | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}
