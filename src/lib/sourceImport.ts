import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { db } from '@/lib/dataService';
import type { MediaFile, Source } from '@/types';
import { enrichSourceAfterImport } from '@/lib/sourceMaintenance';
import { detectSourceFileKind } from '@/lib/sourceTextExtractor';
import { computeFileHash, checkDuplicates } from '@/lib/dedupService';
import { classifySource, quickClassify } from '@/lib/smartClassifier';
import { chat } from '@/lib/aiClient';

const GRADES = ['A', 'B', 'C'] as const;

type SourceGrade = (typeof GRADES)[number];

export interface SourceImportResult {
  baseDir: string;
  imported: number;
  skipped: number;
  errors: Array<{ file: string; message: string }>;
  items: Array<{
    title: string;
    grade: SourceGrade;
    fileType: string;
    fileSize: number;
    fileUrl: string;
  }>;
  duplicatesFound: Array<{
    title: string;
    existingTitle: string;
    existingId: string;
    reason: 'exact_hash' | 'similar_title';
  }>;
  processingStats?: {
    classified: number;
    summarized: number;
    linked: number;
  };
}

interface ImportOptions {
  importedBy: string;
  baseDir?: string;
}

export async function importSourcesFromFolder(options: ImportOptions): Promise<SourceImportResult> {
  const baseDir = path.resolve(options.baseDir || path.join(process.cwd(), 'imports', 'sources'));
  let classified = 0; let summarized = 0; let linked = 0;
  const result: SourceImportResult = {
    baseDir,
    imported: 0,
    skipped: 0,
    errors: [],
    items: [],
    duplicatesFound: [],
  };

  if (!fsSync.existsSync(baseDir)) {
    await createImportFolders(baseDir);
    return result;
  }

  const existingSources = await db.sources.getAll();
  const importedPaths = new Set(
    existingSources
      .map((source) => source.importedOriginalPath)
      .filter((value): value is string => Boolean(value))
  );

  for (const grade of GRADES) {
    const gradeDir = path.join(baseDir, grade);
    if (!fsSync.existsSync(gradeDir)) {
      await fs.mkdir(gradeDir, { recursive: true });
      continue;
    }

    const files = await listFiles(gradeDir);
    for (const filePath of files) {
      const originalPath = path.resolve(filePath);
      if (importedPaths.has(originalPath)) {
        result.skipped += 1;
        continue;
      }

      try {
        // 内容哈希去重检查
        const hash = await computeFileHash(originalPath);
        const dupCheck = await checkDuplicates(path.basename(originalPath, path.extname(originalPath)), hash);

        if (dupCheck.exactMatch) {
          result.skipped += 1;
          result.duplicatesFound.push({
            title: path.basename(originalPath),
            existingTitle: dupCheck.exactMatch.title || dupCheck.exactMatch.fileName || '',
            existingId: dupCheck.exactMatch.id,
            reason: 'exact_hash',
          });
          continue;
        }

        if (dupCheck.similarTitles.length > 0) {
          for (const similar of dupCheck.similarTitles) {
            result.duplicatesFound.push({
              title: path.basename(originalPath),
              existingTitle: similar.title || similar.fileName || '',
              existingId: similar.id,
              reason: 'similar_title',
            });
          }
        }

        const imported = await importOneFile(originalPath, grade, options.importedBy, hash);
        importedPaths.add(originalPath);
        result.imported += 1;
        result.items.push(imported);
        classified++;
        if (imported.summaryStatus === 'success') summarized++;
        if (imported.linkedPersons) linked++;
      } catch (error) {
        result.errors.push({ file: originalPath, message: String(error) });
      }
    }
  }

  result.processingStats = { classified, summarized, linked };
  return result;
}

async function createImportFolders(baseDir: string) {
  for (const grade of GRADES) {
    await fs.mkdir(path.join(baseDir, grade), { recursive: true });
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    if (entry.name.startsWith('.')) return [];
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  }));
  return files.flat();
}

async function importOneFile(filePath: string, grade: SourceGrade, importedBy: string, contentHash: string) {
  const stat = await fs.stat(filePath);
  const originalName = path.basename(filePath);
  const ext = path.extname(originalName).toLowerCase();
  const title = path.basename(originalName, ext);
  const fileType = detectFileType(ext);
  const sourceFileKind = detectSourceFileKind(ext);
  const now = new Date().toISOString();

  const safeName = makeSafeFileName(originalName);
  const targetDir = path.join(process.cwd(), 'public', 'uploads', 'sources', grade);
  await fs.mkdir(targetDir, { recursive: true });
  const targetName = await uniqueFileName(targetDir, safeName);
  const targetPath = path.join(targetDir, targetName);
  await fs.copyFile(filePath, targetPath);

  const fileUrl = `/uploads/sources/${grade}/${targetName}`;
  const mediaType = toMediaType(fileType);

  // 智能分类：优先AI分类，失败回退到快速规则分类
  const quick = quickClassify(originalName, ext);
  let aiCategory = quick.category;
  let aiGrade = grade as SourceGrade;
  let aiTitle = title;
  try {
    const classified = await classifySource({ fileName: originalName });
    if (classified && classified.confidence >= 0.5) {
      aiCategory = classified.category;
      aiGrade = (['A', 'B', 'C'].includes(classified.credibilityLevel) ? classified.credibilityLevel : grade) as SourceGrade;
      aiTitle = classified.suggestedTitle || title;
    }
  } catch {
    // AI分类失败，使用快速分类结果
  }

  const source = await db.sources.create({
    title: aiTitle,
    type: toSourceType(fileType),
    author: importedBy,
    publisher: '',
    publishDate: '',
    url: '',
    fileUrl,
    description: `从 ${grade} 级史料目录导入。`,
    category: aiCategory,
    credibilityLevel: aiGrade,
    fileType,
    fileName: originalName,
    fileSize: stat.size,
    fileExt: ext,
    mimeType: mimeTypeFromExt(ext),
    sourceFileKind,
    aiReadable: false,
    extractStatus: 'pending',
    summaryStatus: 'pending',
    importedBy,
    importedAt: now,
    importedOriginalPath: path.resolve(filePath),
    contentHash,
    reviewStatus: 'pending',
  } as Omit<Source, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>);

  await db.media.create({
    originalName,
    fileName: targetName,
    url: fileUrl,
    type: mediaType,
    size: stat.size,
    mimeType: mimeTypeFromExt(ext),
    category: 'historical',
  } as Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>);

  await enrichSourceAfterImport(source);

  // 异步人物合并已禁用 — 改为人工查验流程
  let linkedPersons = 0;

  // 异步 AI 审核，不阻塞导入返回
  autoReviewSource(source).catch(() => {});

  return { title: aiTitle, grade: aiGrade, fileType, fileSize: stat.size, fileUrl, summaryStatus: source.summaryStatus, linkedPersons: 0 };
}

function detectFileType(ext: string): string {
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'].includes(ext)) return 'image';
  if (['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'].includes(ext)) return ext.replace('.', '');
  if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'spreadsheet';
  if (['.dwg', '.dxf', '.kml', '.kmz', '.shp', '.geojson'].includes(ext)) return 'map';
  if (['.mp3', '.wav', '.m4a'].includes(ext)) return 'audio';
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
  if (['.glb', '.gltf', '.obj', '.fbx', '.stl'].includes(ext)) return 'model';
  return 'other';
}

function toSourceType(fileType: string): Source['type'] {
  if (fileType === 'article') return 'journal';
  if (fileType === 'audio') return 'oral';
  if (fileType === 'image' || fileType === 'map') return 'archive';
  return 'other';
}

function toMediaType(fileType: string): MediaFile['type'] {
  return fileType === 'image' ? 'image' : 'document';
}

function mimeTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

function makeSafeFileName(fileName: string): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const safeBase = base
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'source';
  return `${safeBase}${ext.toLowerCase()}`;
}

async function uniqueFileName(dir: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = fileName;
  let index = 1;

  while (fsSync.existsSync(path.join(dir, candidate))) {
    candidate = `${base}-${index}${ext}`;
    index += 1;
  }

  return candidate;
}

async function autoReviewSource(source: Source): Promise<void> {
  try {
    // 读取已提取的文本
    let sourceText = source.aiSummary || source.description || '';
    if (source.textPath) {
      try {
        const fullPath = path.join(process.cwd(), source.textPath.startsWith('data/') ? source.textPath : `data/${source.textPath}`);
        sourceText = await fs.readFile(fullPath, 'utf-8').then(t => t.slice(0, 3000));
      } catch { /* use summary/description fallback */ }
    }

    // 获取已有 approved 史料用于关联匹配
    const allSources = await db.sources.getAll();
    const approvedSources = allSources
      .filter(s => s.id !== source.id && (s.aiSummary || s.description))
      .map(s => ({ id: s.id, title: s.title, summary: (s.aiSummary || s.description || '').slice(0, 120), category: s.category || '' }))
      .slice(0, 30);

    const prompt = `你是一个史料审核助手。请评估以下新导入的史料质量，并找出库内最相关的史料。

新史料标题: ${source.title}
新史料类别: ${source.category || '未知'}
可信度等级: ${source.credibilityLevel}
内容摘要: ${sourceText.slice(0, 2000)}

库内已有史料列表:
${approvedSources.map(s => `- [${s.id}] ${s.title} (${s.category}): ${s.summary}`).join('\n')}

请用JSON格式回复，不要其他内容:
{
  "confidence": 0.85,
  "reason": "评估理由，不超过80字",
  "relatedSourceIds": ["id1", "id2"]
}

要求:
- confidence: 0-1之间的数字，表示该史料的质量和可信度
- reason: 简要说明评估理由
- relatedSourceIds: 从库内列表中选出最相关的史料ID，最多5条，按相关度降序排列。如果没有相关的，返回空数组[]`;

    const aiResp = await chat([{ role: 'user', content: prompt }]);
    const jsonMatch = aiResp.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);
    await db.sources.update(source.id, {
      reviewConfidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
      reviewReason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      relatedSources: Array.isArray(parsed.relatedSourceIds) ? parsed.relatedSourceIds.slice(0, 5) : undefined,
    } as any);
  } catch {
    // AI review failed silently, source stays pending for manual review
  }
}
