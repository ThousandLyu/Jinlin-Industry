import { db } from '@/lib/dataService';
import { isAIEnabledAsync } from '@/lib/aiClient';
import { generateAndSaveSourceSummary } from '@/lib/sourceMaintenance';
import { rebuildSourceToken } from '@/lib/aiTokenService';
import type { Source, AiToken } from '@/types';

export interface CoverageStats {
  total: number;
  covered: number;
  full: number;
  partial: number;
  pending: number;
  failed: number;
  rate: number;
}

/** 为单条 Source 生成 AI 摘要并写入 AiToken */
export async function buildSummaryForSource(source: Source): Promise<Source> {
  const enriched = await generateAndSaveSourceSummary(source, { onlyIfEnabled: true });
  if (enriched.summaryStatus === 'success') {
    const existing = (await db.aiTokens.getAll()).find(
      t => t.targetType === 'source' && t.targetId === source.id
    );
    if (existing) {
      await db.aiTokens.update(existing.id, { summaryQuality: 'full' } as Partial<AiToken>);
    }
  }
  return enriched;
}

/** 获取全库摘要覆盖率 */
export async function getSummaryCoverage(): Promise<CoverageStats> {
  const [sources, tokens] = await Promise.all([
    db.sources.getAll(),
    db.aiTokens.getAll(),
  ]);
  const tokenMap = new Map(
    tokens.filter(t => t.targetType === 'source').map(t => [t.targetId, t])
  );
  const total = sources.filter(s => !s.isDeleted).length;
  let covered = 0; let full = 0; let partial = 0; let pending = 0; let failed = 0;

  for (const s of sources) {
    if (s.isDeleted) continue;
    const token = tokenMap.get(s.id);
    if (token && token.summaryQuality === 'full') { covered++; full++; }
    else if (token && token.summaryQuality === 'partial') { covered++; partial++; }
    else if (s.extractStatus === 'success' && s.summaryStatus === 'pending') { pending++; }
    else if (s.summaryStatus === 'failed') { failed++; }
    else if (s.extractStatus === 'success' && s.summaryStatus === 'success') {
      // has summary on source but token quality not set → count as partial
      covered++; partial++;
    } else if (s.extractStatus === 'unsupported' || s.extractStatus === 'failed') {
      failed++;
    } else {
      pending++;
    }
  }

  return { total, covered, full, partial, pending, failed, rate: total > 0 ? Math.round((covered / total) * 100) : 0 };
}

/** 遍历所有未处理的 Source，批量补全 AI 摘要（限速 3s/条） */
export async function ensureAllSummaries(options: {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number, current: string) => void;
  maxConsecutive?: number;
} = {}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const enabled = await isAIEnabledAsync();
  if (!enabled) return { processed: 0, succeeded: 0, failed: 0 };

  const [sources, tokens] = await Promise.all([
    db.sources.getAll(),
    db.aiTokens.getAll(),
  ]);
  const coveredIds = new Set(
    tokens.filter(t => t.targetType === 'source' && t.summaryQuality === 'full').map(t => t.targetId)
  );

  // 优先处理：extractStatus=success + summaryStatus=pending 的
  const pending = sources.filter(s =>
    !s.isDeleted &&
    s.extractStatus === 'success' &&
    !coveredIds.has(s.id)
  );

  const maxConsecutive = options.maxConsecutive ?? 20;
  const batch = pending.slice(0, maxConsecutive);
  let succeeded = 0; let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    if (options.signal?.aborted) break;
    try {
      options.onProgress?.(i + 1, batch.length, batch[i].title || batch[i].fileName || batch[i].id);
      await buildSummaryForSource(batch[i]);
      succeeded++;
    } catch {
      failed++;
    }
    // 限速间隔
    if (i < batch.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  return { processed: batch.length, succeeded, failed };
}
