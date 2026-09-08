import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/dataService';
import { exportToCSV } from '@/lib/excelExporter';
import { requireAuth } from '@/lib/auth';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import { readSourceTextFile } from '@/lib/sourceMaintenance';
import type { Source } from '@/types';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const type = request.nextUrl.searchParams.get('type');
  const format = request.nextUrl.searchParams.get('format');
  const ids = (request.nextUrl.searchParams.get('ids') || '').split(',').map(item => item.trim()).filter(Boolean);

  try {
    let csv: string;
    let filename: string;

    if (type === 'facts') {
      const facts = await db.facts.getAll();
      const data = facts.map((f) => ({
        id: f.id,
        标题: f.title,
        史实正文: f.claimText,
        公开展示: f.publicExpression,
        风险词: (f.riskWords || []).join('、'),
        风险等级: f.riskLevel,
        审核状态: f.reviewStatus,
        发布状态: f.isPublished ? '已发布' : '未发布',
        分类: f.category,
      }));
      csv = await exportToCSV(data, 'facts.csv');
      filename = '史实核验表.csv';
    } else if (type === 'sources') {
      const allSources = await db.sources.getAll();
      const sources = ids.length > 0 ? allSources.filter(source => ids.includes(source.id)) : allSources;
      if (format === 'zip') {
        return exportSourcesZip(sources);
      }
      const data = sources.map((s) => ({
        id: s.id,
        标题: s.title,
        类型: s.type,
        文件类型: s.sourceFileKind || s.fileType || '',
        作者: s.author,
        出版者: s.publisher,
        出版日期: s.publishDate,
        可信度等级: s.credibilityLevel,
        分类: s.category,
        AI可读: s.aiReadable ? '是' : '否',
        提取状态: s.extractStatus || '',
        文本字数: s.textCharCount || 0,
        简述: s.aiSummary || s.description || '',
      }));
      csv = await exportToCSV(data, 'sources.csv');
      filename = '史料台账.csv';
    } else {
      return NextResponse.json(
        { success: false, message: '未知导出类型' },
        { status: 400 }
      );
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: '导出失败' }, { status: 500 });
  }
}

async function exportSourcesZip(sources: Source[]) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  const csv = await exportToCSV(sources.map((s) => ({
    id: s.id,
    标题: s.title,
    文件名: s.fileName || '',
    文件类型: s.sourceFileKind || s.fileType || '',
    可信度等级: s.credibilityLevel,
    AI可读: s.aiReadable ? '是' : '否',
    提取状态: s.extractStatus || '',
    文本字数: s.textCharCount || 0,
    简述: s.aiSummary || s.description || '',
  })), 'sources.csv');
  archive.append(csv, { name: 'sources.csv' });

  const references: string[] = ['# 参考文献', ''];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const label = `S${index + 1}`;
    references.push(`[${label}] ${source.title || source.fileName || '未命名史料'}｜可信等级：${source.credibilityLevel || 'C'}｜类型：${source.sourceFileKind || source.fileType || '-'}｜文件：${source.fileName || '-'}`);

    const text = await readSourceTextFile(source);
    if (text) {
      archive.append(text, { name: `texts/${source.id}.txt` });
    } else {
      references.push(`  - 无 AI 可读文本。`);
    }

    const summary = source.aiSummary || source.description || '';
    archive.append([
      `# ${source.title || source.fileName || '未命名史料'}`,
      '',
      `- ID：${source.id}`,
      `- 可信等级：${source.credibilityLevel || 'C'}`,
      `- 文件类型：${source.sourceFileKind || source.fileType || '-'}`,
      `- 文件名：${source.fileName || '-'}`,
      '',
      summary || '暂无简述。',
    ].join('\n'), { name: `summaries/${source.id}.md` });

    const original = resolveLocalFile(source.fileUrl || source.url || '');
    if (original && fs.existsSync(original)) {
      archive.file(original, { name: `files/${safeFileName(source.fileName || path.basename(original))}` });
    }
  }

  archive.append(references.join('\n'), { name: 'references.md' });
  archive.finalize();

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent('史料库导出.zip')}"`,
    },
  });
}

function resolveLocalFile(value: string): string {
  if (!value || /^https?:\/\//i.test(value)) return '';
  if (path.isAbsolute(value)) return value;
  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/uploads/')) return path.join(process.cwd(), 'public', normalized);
  if (normalized.startsWith('uploads/')) return path.join(process.cwd(), 'public', normalized);
  return path.resolve(process.cwd(), value);
}

function safeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'source';
}
