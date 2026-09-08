import fs from 'fs/promises';
import path from 'path';
import type { Source } from '@/types';
import { db } from '@/lib/dataService';
import { generateSourceSummary, isAIEnabledAsync } from '@/lib/aiClient';
import { rebuildSourceToken } from '@/lib/aiTokenService';
import {
  detectSourceFileKind,
  extractAndStoreSourceText,
  readExtractedSourceText,
  resolveSourceFilePath,
} from '@/lib/sourceTextExtractor';

export async function enrichSourceAfterImport(source: Source): Promise<Source> {
  const fileName = source.fileName || source.fileUrl || source.title || '';
  const sourceFileKind = source.sourceFileKind || detectSourceFileKind(fileName);
  const filePath = resolveSourceFilePath(source);

  let next: Partial<Source> = {
    sourceFileKind,
    summaryStatus: source.summaryStatus || 'pending',
  };

  if (filePath) {
    const extraction = await extractAndStoreSourceText({
      sourceId: source.id,
      filePath,
      fileName,
      sourceFileKind,
    });
    next = {
      ...next,
      ...extraction,
    };
  } else {
    next = {
      ...next,
      aiReadable: false,
      extractStatus: 'failed',
      extractError: '未找到可读取的本地文件。',
    };
  }

  let updated = await db.sources.update(source.id, next as Partial<Source>);
  if (updated) {
    updated = await generateAndSaveSourceSummary(updated, { onlyIfEnabled: true });
  }
  return updated || source;
}

export async function retrySourceExtraction(source: Source): Promise<Source> {
  const filePath = resolveSourceFilePath(source);
  const sourceFileKind = source.sourceFileKind || detectSourceFileKind(source.fileName || source.fileUrl || source.title || '');
  if (!filePath) {
    return (await db.sources.update(source.id, {
      sourceFileKind,
      aiReadable: false,
      extractStatus: 'failed',
      extractError: '未找到可读取的本地文件。',
    } as Partial<Source>)) || source;
  }

  const extraction = await extractAndStoreSourceText({
    sourceId: source.id,
    filePath,
    fileName: source.fileName || source.title || filePath,
    sourceFileKind,
  });
  return (await db.sources.update(source.id, {
    sourceFileKind,
    ...extraction,
    summaryStatus: extraction.extractStatus === 'success' ? 'pending' : source.summaryStatus,
  } as Partial<Source>)) || source;
}

export async function generateAndSaveSourceSummary(
  source: Source,
  options: { onlyIfEnabled?: boolean } = {}
): Promise<Source> {
  const enabled = await isAIEnabledAsync();
  if (options.onlyIfEnabled && !enabled) {
    return (await db.sources.update(source.id, { summaryStatus: 'pending' } as Partial<Source>)) || source;
  }
  if (!enabled) {
    return (await db.sources.update(source.id, {
      summaryStatus: 'failed',
      extractError: source.extractError,
    } as Partial<Source>)) || source;
  }

  const text = await readExtractedSourceText(source, 12000);
  if (!text) {
    return (await db.sources.update(source.id, {
      summaryStatus: 'unsupported',
    } as Partial<Source>)) || source;
  }

  try {
    const result = await generateSourceSummary({
      title: source.title || source.fileName || '未命名史料',
      fileType: source.sourceFileKind || source.fileType || 'other',
      grade: source.credibilityLevel || (source as any).grade || 'C',
      text,
    });
    const summary = result.summary || source.description || '';
    const updated = (await db.sources.update(source.id, {
      aiSummary: summary,
      description: summary,
      summaryStatus: 'success',
      summaryUpdatedAt: new Date().toISOString(),
    } as Partial<Source>)) || source;
    await rebuildSourceToken(updated).catch(() => null);
    return updated;
  } catch (error) {
    return (await db.sources.update(source.id, {
      summaryStatus: 'failed',
      extractError: source.extractError || String(error),
    } as Partial<Source>)) || source;
  }
}

export async function readSourceTextFile(source: Source): Promise<string> {
  if (!source.textPath) return '';
  try {
    const resolved = path.isAbsolute(source.textPath)
      ? source.textPath
      : path.join(process.cwd(), source.textPath);
    return await fs.readFile(resolved, 'utf-8');
  } catch {
    return '';
  }
}
