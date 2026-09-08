import { db } from '@/lib/dataService';
import { analyzeSourceDocument, reviewSourceSubmission, type StructuredAIResult } from '@/lib/aiActions';
import { readExtractedSourceText } from '@/lib/sourceTextExtractor';
import type { AiToken, Source, SourceSubmission } from '@/types';

export async function listAiTokens(options: { q?: string; targetType?: string } = {}): Promise<AiToken[]> {
  const items = await db.aiTokens.getAll();
  const q = (options.q || '').trim().toLowerCase();
  return items.filter(item => {
    if (options.targetType && item.targetType !== options.targetType) return false;
    if (!q) return true;
    return [
      item.targetType,
      item.targetId,
      item.summary,
      item.category,
      ...(item.keywords || []),
      ...(item.entities || []),
      ...(item.tags || []),
      ...(item.traits || []),
    ].some(value => String(value || '').toLowerCase().includes(q));
  });
}

export async function searchAiTokens(query: string, limit = 8): Promise<AiToken[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const items = await db.aiTokens.getAll();
  return items
    .map(item => ({ item, score: scoreAiToken(item, tokens) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(entry => entry.item);
}

export async function upsertAiToken(params: {
  targetType: AiToken['targetType'];
  targetId: string;
  result: StructuredAIResult;
  sourceIds?: string[];
  relatedTargetIds?: string[];
  force?: boolean;
}): Promise<AiToken> {
  const existing = (await db.aiTokens.getAll()).find(
    item => item.targetType === params.targetType && item.targetId === params.targetId
  );

  const next = normalizeTokenPayload(params);
  if (existing) {
    const preserved = existing.manualOverride && !params.force
      ? {
          summary: existing.summary,
          keywords: existing.keywords,
          entities: existing.entities,
          tags: existing.tags,
          traits: existing.traits,
          category: existing.category,
          confidenceScore: existing.confidenceScore,
          isCredible: existing.isCredible,
          doubts: existing.doubts,
          errorPositions: existing.errorPositions,
          relatedTargetIds: existing.relatedTargetIds,
        }
      : {};
    return (await db.aiTokens.update(existing.id, { ...next, ...preserved } as Partial<AiToken>)) || existing;
  }

  return db.aiTokens.create({
    ...next,
    targetType: params.targetType,
    targetId: params.targetId,
    manualOverride: false,
  } as Omit<AiToken, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>);
}

export async function updateAiToken(id: string, data: Partial<AiToken>): Promise<AiToken | null> {
  const safeData: Partial<AiToken> = {
    summary: data.summary,
    keywords: normalizeArray(data.keywords),
    entities: normalizeArray(data.entities),
    tags: normalizeArray(data.tags),
    traits: normalizeArray(data.traits),
    category: data.category,
    confidenceScore: typeof data.confidenceScore === 'number' ? data.confidenceScore : undefined,
    isCredible: typeof data.isCredible === 'boolean' ? data.isCredible : undefined,
    doubts: normalizeArray(data.doubts),
    errorPositions: normalizeArray(data.errorPositions),
    relatedTargetIds: normalizeArray(data.relatedTargetIds),
    sourceIds: normalizeArray(data.sourceIds),
    status: data.status,
    manualOverride: true,
  };
  return db.aiTokens.update(id, safeData);
}

export async function rebuildAiToken(targetType: string, targetId: string): Promise<AiToken> {
  if (targetType === 'source') {
    const source = await db.sources.getById(targetId);
    if (!source) throw new Error('史料不存在');
    return rebuildSourceToken(source, { force: true });
  }
  if (targetType === 'submission') {
    const submission = await db.sourceSubmissions.getById(targetId);
    if (!submission) throw new Error('投稿不存在');
    return (await rebuildSubmissionToken(submission, { force: true })).token;
  }
  throw new Error(`暂不支持重建 ${targetType} 类型 aiToken`);
}

export async function rebuildSourceToken(source: Source, options: { force?: boolean } = {}): Promise<AiToken> {
  const text = await readExtractedSourceText(source, 16000);
  const result = await analyzeSourceDocument({
    title: source.title || source.fileName || '未命名史料',
    fileType: source.sourceFileKind || source.fileType || 'other',
    grade: source.credibilityLevel || (source as any).grade || 'C',
    text: text || source.aiSummary || source.description || '',
  });
  return upsertAiToken({
    targetType: 'source',
    targetId: source.id,
    result,
    sourceIds: [source.id],
    force: options.force,
  });
}

export async function rebuildSubmissionToken(
  submission: SourceSubmission,
  options: { force?: boolean } = {}
): Promise<{ token: AiToken; result: StructuredAIResult }> {
  const result = await reviewSourceSubmission({
    title: submission.title,
    content: submission.content,
    source: submission.source,
  });
  const token = await upsertAiToken({
    targetType: 'submission',
    targetId: submission.id,
    result,
    force: options.force,
  });
  return { token, result };
}

export function buildAiTokenContext(tokens: AiToken[]): string {
  if (tokens.length === 0) return '';
  return tokens.map((token, index) => [
    `[T${index + 1}] ${token.targetType}:${token.targetId}`,
    `摘要：${token.summary || '-'}`,
    `关键词：${(token.keywords || []).join('、') || '-'}`,
    `实体：${(token.entities || []).join('、') || '-'}`,
    `分类：${token.category || '-'}`,
  ].join('\n')).join('\n\n');
}

function normalizeTokenPayload(params: {
  targetType: AiToken['targetType'];
  targetId: string;
  result: StructuredAIResult;
  sourceIds?: string[];
  relatedTargetIds?: string[];
}): Partial<AiToken> {
  const result = params.result;
  return {
    summary: result.summary || '',
    keywords: normalizeArray(result.keywords),
    entities: normalizeArray(result.entities),
    tags: normalizeArray(result.tags),
    traits: normalizeArray(result.traits),
    category: result.category || '',
    confidenceScore: result.confidenceScore,
    isCredible: result.isCredible,
    doubts: normalizeArray(result.doubts),
    errorPositions: normalizeArray(result.errorPositions),
    relatedTargetIds: normalizeArray(result.relatedTargetIds || params.relatedTargetIds),
    sourceIds: normalizeArray(params.sourceIds),
    summaryQuality: 'full',
    status: 'active',
    modelProvider: result.modelProvider || 'none',
    modelName: result.modelName || '',
    rawResult: result.raw,
  };
}

function scoreAiToken(token: AiToken, tokens: string[]): number {
  const haystack = [
    token.targetType,
    token.targetId,
    token.summary,
    token.category,
    ...(token.keywords || []),
    ...(token.entities || []),
    ...(token.tags || []),
    ...(token.traits || []),
  ].join('\n').toLowerCase();
  let score = 0;
  for (const tokenText of tokens) {
    const lowered = tokenText.toLowerCase();
    if (haystack.includes(lowered)) score += 1;
    if ((token.keywords || []).some(item => item.toLowerCase().includes(lowered))) score += 3;
    if ((token.entities || []).some(item => item.toLowerCase().includes(lowered))) score += 3;
  }
  return score;
}

function tokenize(query: string): string[] {
  return Array.from(new Set(query
    .replace(/[，。！？；：""''（）【】《》、]/g, ' ')
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean)));
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[，,、\n]/).map(item => item.trim()).filter(Boolean);
  return [];
}
