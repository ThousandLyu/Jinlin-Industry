import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { Source } from '@/types';

export type SourceFileKind = 'pdf' | 'txt' | 'md' | 'docx' | 'doc' | 'xlsx' | 'csv' | 'image' | 'model' | 'audio' | 'video' | 'other';
export type ExtractStatus = 'pending' | 'success' | 'failed' | 'unsupported';

export interface ExtractionResult {
  aiReadable: boolean;
  extractStatus: ExtractStatus;
  extractError?: string;
  textPath?: string;
  textCharCount?: number;
}

const TEXT_DIR = path.join(process.cwd(), 'data', 'source_text');
const MAX_TEXT_CHARS = 300_000;

export function detectSourceFileKind(fileNameOrExt: string): SourceFileKind {
  const ext = normalizeExt(fileNameOrExt);
  if (ext === '.pdf') return 'pdf';
  if (ext === '.txt') return 'txt';
  if (ext === '.md') return 'md';
  if (ext === '.docx') return 'docx';
  if (ext === '.doc') return 'doc';
  if (ext === '.xlsx' || ext === '.xls') return 'xlsx';
  if (ext === '.csv') return 'csv';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'].includes(ext)) return 'image';
  if (['.glb', '.gltf', '.obj', '.fbx', '.stl'].includes(ext)) return 'model';
  if (['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext)) return 'audio';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video';
  return 'other';
}

export function isTextExtractable(kind: string): boolean {
  return ['pdf', 'txt', 'md', 'docx', 'xlsx', 'csv'].includes(kind);
}

export function resolveSourceFilePath(source: Partial<Source>): string {
  const candidates = [
    source.importedOriginalPath,
    source.fileUrl,
    source.url,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const resolved = resolveCandidatePath(candidate);
    if (resolved) return resolved;
  }
  return '';
}

export async function extractAndStoreSourceText(params: {
  sourceId: string;
  filePath: string;
  fileName: string;
  sourceFileKind?: string;
}): Promise<ExtractionResult> {
  const kind = params.sourceFileKind || detectSourceFileKind(params.fileName);
  if (!isTextExtractable(kind)) {
    return { aiReadable: false, extractStatus: 'unsupported', extractError: '该文件类型不支持文本提取。' };
  }

  try {
    const text = cleanText(await extractText(params.filePath, kind));
    if (!text) {
      return { aiReadable: false, extractStatus: 'failed', extractError: '未提取到可读文本。' };
    }

    await fs.mkdir(TEXT_DIR, { recursive: true });
    const textPath = path.join(TEXT_DIR, `${safePathSegment(params.sourceId)}.txt`);
    const clipped = text.slice(0, MAX_TEXT_CHARS);
    await fs.writeFile(textPath, clipped, 'utf-8');
    return {
      aiReadable: true,
      extractStatus: 'success',
      textPath,
      textCharCount: clipped.length,
    };
  } catch (error) {
    const unsupported = kind === 'doc';
    return {
      aiReadable: false,
      extractStatus: unsupported ? 'unsupported' : 'failed',
      extractError: unsupported ? '旧版 .doc 暂不支持可靠提取，请转换为 .docx 后重试。' : String(error),
    };
  }
}

export async function readExtractedSourceText(source: Partial<Source>, maxChars = 12000): Promise<string> {
  const textPath = source.textPath;
  if (textPath) {
    try {
      const raw = await fs.readFile(textPath, 'utf-8');
      return raw.slice(0, maxChars);
    } catch {
      // Fall through to legacy extraction.
    }
  }

  const filePath = resolveSourceFilePath(source);
  const kind = source.sourceFileKind || detectSourceFileKind(source.fileName || source.fileUrl || '');
  if (!filePath || !isTextExtractable(kind)) return '';

  try {
    return cleanText(await extractText(filePath, kind)).slice(0, maxChars);
  } catch {
    return '';
  }
}

async function extractText(filePath: string, kind: string): Promise<string> {
  if (kind === 'txt' || kind === 'md' || kind === 'csv') {
    return fs.readFile(filePath, 'utf-8');
  }

  if (kind === 'pdf') {
    const buffer = await fs.readFile(filePath);
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text || '';
  }

  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  if (kind === 'xlsx') {
    const workbook = XLSX.readFile(filePath);
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
      const body = rows.map(row => row.filter(Boolean).join('\t')).filter(Boolean).join('\n');
      return `【${name}】\n${body}`;
    }).join('\n\n');
  }

  if (kind === 'doc') {
    throw new Error('旧版 .doc 暂不支持可靠提取。');
  }

  return '';
}

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeExt(fileNameOrExt: string): string {
  const ext = fileNameOrExt.startsWith('.') ? fileNameOrExt : path.extname(fileNameOrExt);
  return ext.toLowerCase();
}

function resolveCandidatePath(value: string): string {
  if (!value || /^https?:\/\//i.test(value)) return '';
  if (path.isAbsolute(value)) return path.resolve(value);

  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/uploads/')) {
    return path.join(process.cwd(), 'public', normalized);
  }
  if (normalized.startsWith('uploads/')) {
    return path.join(process.cwd(), 'public', normalized);
  }
  return path.resolve(process.cwd(), value);
}

function safePathSegment(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}
