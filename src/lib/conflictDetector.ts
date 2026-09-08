import { db } from '@/lib/dataService';
import { chatWithMeta } from '@/lib/aiClient';
import { readExtractedSourceText } from '@/lib/sourceTextExtractor';
import type { Source } from '@/types';

export interface ClaimExtraction {
  claim: string;
  subject: string;
  time?: string;
  location?: string;
  confidence: number;
}

export interface ConflictItem {
  claim1: string;
  claim2: string;
  sourceId1: string;
  sourceId2: string;
  sourceTitle1: string;
  sourceTitle2: string;
  type: 'time' | 'attribution' | 'data' | 'location' | 'other';
  severity: 'high' | 'medium' | 'low';
  aiAnalysis: string;
}

export interface ConflictReport {
  sourceId: string;
  sourceTitle: string;
  conflicts: ConflictItem[];
  noConflict: boolean;
  summary: string;
}

/** 用AI从史料文本中提取核心史实声明 */
async function extractClaims(text: string, title: string): Promise<ClaimExtraction[]> {
  try {
    const result = await chatWithMeta([
      { role: 'system', content: '你是史实提取助手。从史料文本中提取核心史实声明(事实性陈述)，每条声明包含claim(声明内容)、subject(主题人物/企业/事件)、time(时间)、location(地点)、confidence(0-1置信度)。没有明确声明时返回空数组。只返回JSON数组。' },
      { role: 'user', content: `标题: ${title}\n\n文本: ${text.slice(0, 6000)}` },
    ]);
    const match = result.content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]).filter((c: any) => c.claim && c.subject);
  } catch {
    return [];
  }
}

/** 检测单条史料与全库的冲突 */
export async function detectConflicts(sourceId: string): Promise<ConflictReport> {
  const source = await db.sources.getById(sourceId);
  if (!source) throw new Error('史料不存在');

  const text = await readExtractedSourceText(source as Source, 8000);
  if (!text) {
    return { sourceId, sourceTitle: source.title || source.fileName || '', conflicts: [], noConflict: true, summary: '无可提取文本，无法检测冲突。' };
  }

  const claims = await extractClaims(text, source.title || source.fileName || '');
  if (claims.length === 0) {
    return { sourceId, sourceTitle: source.title || source.fileName || '', conflicts: [], noConflict: true, summary: '未提取到明确史实声明。' };
  }

  // 获取所有可对比的史料
  const allSources = await db.sources.getAll();
  const conflicts: ConflictItem[] = [];

  for (const claim of claims.filter(c => c.confidence >= 0.6)) {
    // 按subject匹配相关史料
    const subject = claim.subject.toLowerCase();
    const related = allSources.filter(s =>
      !s.isDeleted && s.id !== sourceId &&
      ((s.aiSummary || '').toLowerCase().includes(subject) ||
       (s.title || '').toLowerCase().includes(subject))
    ).slice(0, 5);

    for (const rel of related) {
      const relText = await readExtractedSourceText(rel as Source, 6000);
      if (!relText) continue;

      try {
        const result = await chatWithMeta([
          { role: 'system', content: '你是史实一致性校验助手。比较两条声明是否存在矛盾。只返回JSON: {"hasConflict":true/false,"type":"time|attribution|data|location|other","severity":"high|medium|low","analysis":"分析(≤100字)"}' },
          { role: 'user', content: `声明A(来自${source.title}): ${claim.claim}\n\n文献B(来自${rel.title}): ${relText.slice(0, 3000)}` },
        ], { timeoutMs: 8000, allowCloudFallback: false });

        const parsed = parseJson(result.content);
        if (parsed?.hasConflict) {
          conflicts.push({
            claim1: claim.claim,
            claim2: `[文献内容摘要]`,
            sourceId1: sourceId,
            sourceId2: rel.id,
            sourceTitle1: source.title || source.fileName || '',
            sourceTitle2: rel.title || rel.fileName || '',
            type: parsed.type || 'other',
            severity: parsed.severity || 'low',
            aiAnalysis: parsed.analysis || '',
          });
        }
      } catch {
        // 单条对比失败不中断
      }
    }
  }

  return {
    sourceId,
    sourceTitle: source.title || source.fileName || '',
    conflicts,
    noConflict: conflicts.length === 0,
    summary: conflicts.length === 0
      ? '未检测到与现有文献的冲突。'
      : `检测到 ${conflicts.length} 处潜在冲突。`,
  };
}

/** 批量冲突检测 */
export async function batchDetectConflicts(sourceIds: string[]): Promise<ConflictReport[]> {
  const reports: ConflictReport[] = [];
  for (const id of sourceIds.slice(0, 10)) {
    try {
      reports.push(await detectConflicts(id));
    } catch {
      reports.push({ sourceId: id, sourceTitle: id, conflicts: [], noConflict: true, summary: '检测失败。' });
    }
  }
  return reports;
}

/** 全库冲突概览 */
export async function getConflictOverview(): Promise<{ totalSources: number; checkedSources: number; conflictsFound: number; highCount: number; mediumCount: number }> {
  const sources = await db.sources.getAll();
  const active = sources.filter(s => !s.isDeleted && s.extractStatus === 'success');
  return {
    totalSources: active.length,
    checkedSources: 0,
    conflictsFound: 0,
    highCount: 0,
    mediumCount: 0,
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
