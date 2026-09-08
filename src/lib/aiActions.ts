import { chatWithMeta } from '@/lib/aiClient';
import { parseLooseJsonObject } from '@/lib/jsonUtils';

export interface StructuredAIResult {
  summary: string;
  keywords: string[];
  entities: string[];
  tags?: string[];
  traits?: string[];
  category?: string;
  confidenceScore?: number;
  isCredible?: boolean;
  doubts?: string[];
  errorPositions?: string[];
  relatedTargetIds?: string[];
  references?: string;
  content?: string;
  modelProvider?: string;
  modelName?: string;
  raw?: Record<string, unknown>;
}

export async function analyzeSourceDocument(params: {
  title: string;
  fileType: string;
  grade: string;
  text: string;
}): Promise<StructuredAIResult> {
  return structuredChat({
    system: [
      '你是南京民族工业史料库的文献解析助手。',
      '只依据输入文本做史料抽象，不补写文献没有的信息。',
      '请完成摘要、关键词、实体、标签、分类与可信提示。',
      '必须只返回 JSON 对象，至少包含：{"summary":"","keywords":[],"entities":[]}',
    ].join('\n'),
    user: [
      `题名：${params.title}`,
      `文件类型：${params.fileType}`,
      `可信等级：${params.grade}`,
      '文本：',
      params.text.slice(0, 16000),
    ].join('\n\n'),
  });
}

export async function classifySourceDocument(params: {
  title: string;
  description: string;
  text: string;
}): Promise<StructuredAIResult> {
  return structuredChat({
    system: [
      '你是史料自动分类助手。',
      '请根据题名、简述和文本判断分类、关键词、实体与标签。',
      '分类应简短，例如：企业档案、人物资料、报刊报道、地方志、口述史、图片说明、其他。',
      '必须只返回 JSON 对象，至少包含：{"summary":"","keywords":[],"entities":[],"category":""}',
    ].join('\n'),
    user: [
      `题名：${params.title}`,
      `简述：${params.description || '-'}`,
      '文本：',
      params.text.slice(0, 10000),
    ].join('\n\n'),
  });
}

export async function recommendRelatedTargets(params: {
  query: string;
  candidates: string;
}): Promise<StructuredAIResult> {
  return structuredChat({
    system: [
      '你是南京民族工业史料关联推荐助手。',
      '请根据查询内容和候选对象，推荐最相关的对象 ID，并说明依据。',
      '必须只返回 JSON 对象，至少包含：{"summary":"","keywords":[],"entities":[],"relatedTargetIds":[]}',
    ].join('\n'),
    user: `查询：${params.query}\n\n候选对象：\n${params.candidates}`,
  });
}

export async function reviewSourceSubmission(params: {
  title: string;
  content: string;
  source: string;
}): Promise<StructuredAIResult> {
  return structuredChat({
    system: [
      '你是南京民族工业史料投稿审核助手。',
      '目标是辅助人工审核，不自动采纳投稿。',
      '请识别可信度、疑点、可能错误位置、关键词和实体。',
      '置信度 confidenceScore 使用 0-1 小数；isCredible 为布尔值。',
      '必须只返回 JSON 对象，至少包含：{"summary":"","keywords":[],"entities":[],"confidenceScore":0,"isCredible":false,"doubts":[],"errorPositions":[]}',
    ].join('\n'),
    user: [
      `投稿标题：${params.title}`,
      `具体史料：${params.content}`,
      `来源说明：${params.source}`,
    ].join('\n\n'),
  });
}

export async function generateStructuredContent(params: {
  topic: string;
  sourceContext: string;
  style: string;
}): Promise<StructuredAIResult> {
  return structuredChat({
    system: [
      '你是金陵工脉内容生成助手。',
      '必须基于史料上下文生成内容，事实句使用 [S1] 引用。',
      '必须只返回 JSON 对象，至少包含：{"summary":"","keywords":[],"entities":[],"content":"","references":""}',
    ].join('\n'),
    user: [
      `主题：${params.topic}`,
      `风格：${params.style}`,
      '史料上下文：',
      params.sourceContext,
    ].join('\n\n'),
  });
}

async function structuredChat(params: { system: string; user: string }): Promise<StructuredAIResult> {
  const response = await chatWithMeta([
    { role: 'system', content: params.system },
    { role: 'user', content: params.user },
  ]);

  const parsed = parseLooseJsonObject(response.content) || {};
  return normalizeStructuredAIResult(parsed, response);
}

export function normalizeStructuredAIResult(
  value: Record<string, unknown>,
  meta: { provider?: string; model?: string } = {}
): StructuredAIResult {
  const summary = stringify(value.summary || value.description || value.content).slice(0, 2000);
  const keywords = normalizeStringArray(value.keywords);
  const entities = normalizeStringArray(value.entities);
  return {
    summary,
    keywords,
    entities,
    tags: normalizeStringArray(value.tags),
    traits: normalizeStringArray(value.traits),
    category: stringify(value.category),
    confidenceScore: normalizeScore(value.confidenceScore),
    isCredible: typeof value.isCredible === 'boolean' ? value.isCredible : undefined,
    doubts: normalizeStringArray(value.doubts),
    errorPositions: normalizeStringArray(value.errorPositions),
    relatedTargetIds: normalizeStringArray(value.relatedTargetIds),
    references: stringify(value.references),
    content: stringify(value.content),
    modelProvider: meta.provider,
    modelName: meta.model,
    raw: value,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === 'object' && item !== null) {
      return String(item.name || item.term || item.label || item.value || '').trim()
    }
    return String(item).trim()
  }).filter(s => s && s !== '[object Object]');
  if (typeof value === 'string') {
    return value.split(/[，,、\n]/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function stringify(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeScore(value: unknown): number | undefined {
  const score = Number(value);
  if (!Number.isFinite(score)) return undefined;
  if (score > 1) return Math.max(0, Math.min(1, Number((score / 100).toFixed(2))));
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}
