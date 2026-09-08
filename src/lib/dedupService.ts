import crypto from 'crypto';
import fs from 'fs/promises';
import { db } from '@/lib/dataService';
import type { Source, Person } from '@/types';
import { readExtractedSourceText } from '@/lib/sourceTextExtractor';
import { chatWithMeta } from '@/lib/aiClient';

/** 计算文件的 SHA256 哈希 */
export async function computeFileHash(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return computeBufferHash(buffer);
}

/** 计算 Buffer 的 SHA256 哈希 */
export function computeBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** 标题归一化：去标点、去空格、小写 */
function normalizeTitle(title: string): string {
  return title
    .replace(/[，。！？；：""''（）【】《》、\s\-_/\\|@#$%^&*+=~`\[\]{}:;"'<>,.!?\\/]/g, '')
    .toLowerCase()
    .trim();
}

/** 计算两个字符串的 Levenshtein 距离 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    }
  }
  return dp[m][n];
}

/** 标题相似度：0~1，基于归一化后的 Levenshtein 距离 */
function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  // 包含关系视为高相似
  if (na.includes(nb) || nb.includes(na)) return 0.95;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshteinDistance(na, nb);
  return 1 - dist / maxLen;
}

const SIMILARITY_THRESHOLD = 0.8;

/** 精确匹配：按内容哈希查找已存在的 Source */
export async function findDuplicateByHash(hash: string): Promise<Source | null> {
  const all = await db.sources.getAll();
  return all.find(s => (s as any).contentHash === hash) || null;
}

/** 标题模糊匹配：返回相似度 > 阈值的已存在 Source 列表 */
export async function findSimilarByTitle(title: string): Promise<Source[]> {
  const all = await db.sources.getAll();
  return all.filter(s => {
    const existingTitle = s.title || s.fileName || '';
    return titleSimilarity(title, existingTitle) > SIMILARITY_THRESHOLD;
  });
}

export interface DuplicateCheckResult {
  exactMatch: Source | null;
  similarTitles: Source[];
}

/** 综合重复检查 */
export async function checkDuplicates(title: string, hash: string): Promise<DuplicateCheckResult> {
  const [exactMatch, similarTitles] = await Promise.all([
    findDuplicateByHash(hash),
    findSimilarByTitle(title),
  ]);
  // 从相似列表中排除精确匹配的那条
  const filtered = exactMatch
    ? similarTitles.filter(s => s.id !== exactMatch.id)
    : similarTitles;
  return { exactMatch, similarTitles: filtered };
}

/** 用 AI 从文本中提取人名 */
async function extractPersonNames(text: string, title: string): Promise<string[]> {
  try {
    const result = await chatWithMeta([
      { role: 'system', content: '你是一个人名词提取助手。只从给定文本中提取中国历史人物姓名（2-4个汉字），返回 JSON 数组字符串。如果没有找到任何人物名字，返回空数组 []。只返回 JSON 数组，不要有其他内容。' },
      { role: 'user', content: `标题：${title}\n\n文本：${text.slice(0, 4000)}` },
    ]);
    const content = result.content || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.filter((n: unknown) => typeof n === 'string' && n.trim());
    }
    return [];
  } catch {
    return [];
  }
}

/** 模糊匹配 Person：name 包含或相似 */
async function findPersonByName(name: string): Promise<Person | null> {
  const all = await db.people.getAll();
  const cleaned = name.trim();
  if (!cleaned) return null;

  // 精确匹配
  const exact = all.find(p => p.name === cleaned);
  if (exact) return exact;

  // 包含匹配
  const contains = all.find(p => p.name.includes(cleaned) || cleaned.includes(p.name));
  if (contains) return contains;

  return null;
}

/** 将史料关联到人物：追加 sourceId 到 Person.sourceIds */
export async function linkSourceToPerson(sourceId: string, personId: string): Promise<void> {
  const person = await db.people.getById(personId);
  if (!person) return;
  const sourceIds = person.sourceIds || [];
  if (!sourceIds.includes(sourceId)) {
    await db.people.update(personId, {
      sourceIds: [...sourceIds, sourceId],
    } as Partial<Person>);
  }
}

/** 从史料文本中提取人名，匹配并链接到已有 Person */
export async function extractAndLinkPersons(source: Source): Promise<string[]> {
  const text = await readExtractedSourceText(source, 8000);
  if (!text) return [];

  const names = await extractPersonNames(text, source.title || source.fileName || '');
  const linked: string[] = [];

  for (const name of names) {
    try {
      const person = await findPersonByName(name);
      if (person) {
        await linkSourceToPerson(source.id, person.id);
        linked.push(`${name}→${person.name}(已存在)`);
      } else {
        linked.push(`${name}→未匹配(跳过)`);
      }
    } catch {
      // 单个人物匹配失败不中断整体流程
    }
  }

  return linked;
}
