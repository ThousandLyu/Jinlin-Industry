import { db } from '@/lib/dataService';
import { searchAiTokens } from '@/lib/aiTokenService';
import { readExtractedSourceText } from '@/lib/sourceTextExtractor';
import type { Source } from '@/types';

export interface SourceSearchResult {
  id: string;
  title: string;
  grade: string;
  fileType: string;
  fileName: string;
  fileUrl: string;
  importedBy: string;
  importedAt: string;
  summary: string;
  score: number;
  snippet: string;
}

export async function searchSourceLibrary(query: string, limit = 6): Promise<SourceSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  const tokens = normalizeSearchTerms(keyword);
  const [sources, aiTokens] = await Promise.all([
    db.sources.getAll(),
    searchAiTokens(keyword, 20),
  ]);
  const aiTokenBySourceId = new Map(aiTokens.filter(token => token.targetType === 'source').map(token => [token.targetId, token]));

  // Phase 1: score cheap metadata and aiToken first. Reading every extracted text
  // on each public search is too expensive for the homepage fast path.
  const metadataScored: Array<{ source: Source; score: number }> = [];
  for (const source of sources) {
    const sourceAiToken = aiTokenBySourceId.get(source.id);
    const aiTokenScore = sourceAiToken ? scoreText([
      sourceAiToken.summary,
      ...(sourceAiToken.keywords || []),
      ...(sourceAiToken.entities || []),
      ...(sourceAiToken.tags || []),
      sourceAiToken.category,
    ].join('\n'), tokens) + 3 : 0;
    const score = scoreMetadata(source, tokens) + aiTokenScore;
    if (score > 0) metadataScored.push({ source, score });
  }

  metadataScored.sort((a, b) => b.score - a.score);

  // Phase 2: only top candidates read extracted text, then re-rank.
  const scored: Array<{ source: Source; score: number; sourceText: string }> = [];
  const candidates = metadataScored.slice(0, Math.max(limit * 5, 12));
  for (const { source, score } of candidates) {
    const sourceText = await readSourceText(source);
    scored.push({ source, score: score + scoreText(sourceText, tokens), sourceText });
  }
  scored.sort((a, b) => b.score - a.score);

  // Phase 3: build results from top matches.
  const topCandidates = scored.slice(0, limit);
  const results: SourceSearchResult[] = [];
  for (const { source, score, sourceText } of topCandidates) {
    const sourceAiToken = aiTokenBySourceId.get(source.id);
    const snippet = makeSnippetFromSource(source, tokens, sourceText || sourceAiToken?.summary || '');
    results.push({
      id: source.id,
      title: source.title || source.fileName || '未命名史料',
      grade: source.credibilityLevel || (source as any).grade || 'C',
      fileType: source.fileType || source.category || source.type || (source as any).sourceType || 'other',
      fileName: source.fileName || source.title || '',
      fileUrl: source.fileUrl || source.url || '',
      importedBy: source.importedBy || source.author || '',
      importedAt: source.importedAt || source.createdAt || '',
      summary: source.aiSummary || source.description || sourceAiToken?.summary || '',
      score,
      snippet,
    });
  }

  if (results.length > 0) return results;

  return [];
}

export function buildSourceContext(results: SourceSearchResult[]): string {
  if (results.length === 0) {
    return '未检索到相关史料。';
  }

  return results.map((item, index) => {
    return [
      `[S${index + 1}] ${item.title}`,
      `等级：${item.grade}`,
      `文件：${item.fileName || '-'}`,
      `类型：${item.fileType || '-'}`,
      `路径：${item.fileUrl || '-'}`,
      `导入人：${item.importedBy || '-'}`,
      `导入时间：${item.importedAt || '-'}`,
      `简述：${item.summary || '-'}`,
      `相关摘录：${item.snippet || '-'}`,
    ].join('\n');
  }).join('\n\n');
}

export function normalizeSearchTerms(query: string): string[] {
  const normalized = query
    .toLowerCase()
    .replace(/[，。！？；：""''（）【】《》、,.!?;:()[\]<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleaned = normalized
    .replace(/请问|帮我|查找|搜索|检索|关于|相关|资料|史料|介绍一下|介绍|是谁|谁是|是什么|有哪些|有没有|为什么|怎么|如何|吗|呢|的|一下/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = Array.from(new Set([normalized, cleaned, ...cleaned.split(' '), ...normalized.split(' ')]))
    .map(word => word.trim())
    .filter((word) => word.length >= 1 && !isStopWord(word));
  const tokens = new Set(words);
  for (const word of words) {
    if (/[\u4e00-\u9fff]/.test(word) && word.length > 2) {
      for (let size = 2; size <= Math.min(4, word.length); size += 1) {
        for (let index = 0; index <= word.length - size; index += 1) {
          tokens.add(word.slice(index, index + size));
        }
      }
    }
  }

  return Array.from(tokens).sort((a, b) => b.length - a.length);
}

function isStopWord(word: string): boolean {
  return ['请问', '帮我', '查找', '搜索', '检索', '关于', '相关', '资料', '史料', '介绍', '是谁', '谁是', '是什么', '有哪些', '有没有', '为什么', '怎么', '如何', '吗', '呢', '的', '一下'].includes(word);
}

function scoreMetadata(source: Source, tokens: string[]): number {
  const haystack = [
    source.title,
    source.fileName,
    source.aiSummary,
    source.description,
    source.author,
    source.category,
    source.publisher,
  ].filter(Boolean).join('\n').toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    const lowered = token.toLowerCase();
    const occurrences = countOccurrences(haystack, lowered);
    score += occurrences;
    if ((source.title || '').toLowerCase().includes(lowered)) score += 5;
    if ((source.fileName || '').toLowerCase().includes(lowered)) score += 4;
    if ((source.description || '').toLowerCase().includes(lowered)) score += 2;
  }
  return score;
}

function scoreText(text: string, tokens: string[]): number {
  if (!text) return 0;
  const haystack = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    const lowered = token.toLowerCase();
    const occurrences = countOccurrences(haystack, lowered);
    if (occurrences > 0) score += occurrences * 3;
  }
  return score;
}

function makeSnippetFromSource(source: Source, tokens: string[], sourceText: string): string {
  const parts = [
    sourceText || '',
    source.aiSummary || '',
    source.description || '',
    source.title || '',
    source.author || '',
    source.fileName || '',
  ];
  const text = parts.filter(Boolean).join(' | ');
  return makeSnippet(text, tokens);
}

async function readSourceText(source: Source): Promise<string> {
  const inlineText = [
    (source as any).content,
    (source as any).text,
    (source as any).transcription,
  ].filter(Boolean).join('\n');
  if (inlineText) return inlineText.slice(0, 12000);

  return readExtractedSourceText(source, 12000);
}

function countOccurrences(text: string, token: string): number {
  if (!token) return 0;
  let count = 0;
  let index = text.indexOf(token);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(token, index + token.length);
  }
  return count;
}

function makeSnippet(text: string, tokens: string[]): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const lower = compact.toLowerCase();
  const token = tokens.find((item) => lower.includes(item.toLowerCase()));
  if (!token) return compact.slice(0, 240);
  const index = lower.indexOf(token.toLowerCase());
  const start = Math.max(0, index - 80);
  const end = Math.min(compact.length, index + 180);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < compact.length ? '...' : '';
  return `${prefix}${compact.slice(start, end)}${suffix}`;
}
