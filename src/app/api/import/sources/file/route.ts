import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminCredentials } from '@/lib/auth';
import { db } from '@/lib/dataService';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { enrichSourceAfterImport } from '@/lib/sourceMaintenance';
import { detectSourceFileKind } from '@/lib/sourceTextExtractor';
import { computeBufferHash, checkDuplicates } from '@/lib/dedupService';

const GRADES = ['A', 'B', 'C'] as const;

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

function toSourceType(fileType: string): string {
  if (fileType === 'article') return 'journal';
  if (fileType === 'audio') return 'oral';
  if (fileType === 'image' || fileType === 'map') return 'archive';
  return 'other';
}

/** 自动识别史料类别，基于文件名关键词和文件类型 */
function detectCategory(fileName: string, fileType: string): string {
  const lower = fileName.toLowerCase();
  if (/地图|规划图|地形图|航拍|测绘|map|plan|layout|blueprint/.test(lower)) return '地图测绘';
  if (/照片|合影|车间|厂房|设备|机器|生产|photo|image|picture/.test(lower)) return '历史影像';
  if (/档案|卷宗|批复|报告|档案|archive|record|report/.test(lower)) return '官方档案';
  if (/契约|合同|章程|条例|protocol|contract|agreement/.test(lower)) return '法规契约';
  if (/回忆录|口述|访谈|回忆|采访|oral|interview|memoir/.test(lower)) return '口述史料';
  if (/统计|表格|数据|统计表|报表|statistic|spreadsheet|table/.test(lower)) return '统计数据';
  if (/报纸|新闻|报道|通讯|newspaper|news|press|article/.test(lower)) return '报刊文献';
  if (/图纸|设计图|工程图|blueprint|drawing|dwg|engineer/.test(lower)) return '工程图纸';
  if (/书信|信件|日记|手稿|letter|manuscript|diary/.test(lower)) return '私人文献';
  if (/书|著作|论文|研究|book|thesis|monograph|research/.test(lower)) return '学术著作';
  if (fileType === 'image') return '历史影像';
  if (fileType === 'map') return '地图测绘';
  if (fileType === 'audio') return '口述史料';
  if (fileType === 'video') return '历史影像';
  if (fileType === 'spreadsheet') return '统计数据';
  if (fileType === 'article') return '报刊文献';
  return '综合史料';
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

function uniqueFileName(dir: string, fileName: string): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = fileName;
  let index = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base}-${index}${ext}`;
    index += 1;
  }
  return candidate;
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, message: '未选择文件' }, { status: 400 });

    // 获取导入人
    let importedBy = (formData.get('importedBy') as string) || '';
    if (!importedBy) {
      const credentials = await getAdminCredentials();
      importedBy = credentials?.username || 'admin';
    }

    // 获取级别和标题
    let grade = (formData.get('grade') as string).toUpperCase() || 'C';
    if (!GRADES.includes(grade as any)) grade = 'C';
    const title = (formData.get('title') as string) || path.basename(file.name, path.extname(file.name));

    const now = new Date().toISOString();
    const ext = path.extname(file.name).toLowerCase();
    const fileType = detectFileType(ext);
    const sourceFileKind = detectSourceFileKind(ext);
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = computeBufferHash(buffer);

    // 重复检查
    const dupCheck = await checkDuplicates(title, contentHash);
    if (dupCheck.exactMatch) {
      return NextResponse.json({
        success: false,
        message: '文件内容重复，已存在相同史料',
        duplicate: true,
        existing: {
          id: dupCheck.exactMatch.id,
          title: dupCheck.exactMatch.title || dupCheck.exactMatch.fileName,
          importedAt: dupCheck.exactMatch.importedAt,
        },
      }, { status: 409 });
    }

    // 保存到 public/uploads/sources/{grade}/
    const safeName = makeSafeFileName(file.name);
    const targetDir = path.join(process.cwd(), 'public', 'uploads', 'sources', grade);
    await fsPromises.mkdir(targetDir, { recursive: true });
    const targetName = uniqueFileName(targetDir, safeName);
    const targetPath = path.join(targetDir, targetName);
    await fsPromises.writeFile(targetPath, buffer);

    const fileUrl = `/uploads/sources/${grade}/${targetName}`;

    const sourceData: any = {
      title,
      type: toSourceType(fileType),
      author: importedBy,
      publisher: '',
      publishDate: '',
      url: '',
      fileUrl,
      description: `拖拽导入自 ${file.name}`,
      category: detectCategory(file.name, fileType),
      credibilityLevel: grade,
      fileType,
      fileName: file.name,
      fileSize: file.size,
      fileExt: ext,
      mimeType: file.type || 'application/octet-stream',
      sourceFileKind,
      aiReadable: false,
      extractStatus: 'pending',
      summaryStatus: 'pending',
      importedBy,
      importedAt: now,
      importedOriginalPath: '',
      contentHash,
    };

    const source = await db.sources.create(sourceData);

    // 同时记录到媒体文件
    await db.media.create({
      originalName: file.name,
      fileName: targetName,
      url: fileUrl,
      type: fileType === 'image' ? 'image' : 'document',
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    });
    const enriched = await enrichSourceAfterImport(source as any);

    // 异步人物合并已禁用 — 改为人工查验流程

    const similarWarning = dupCheck.similarTitles.length > 0
      ? dupCheck.similarTitles.map(s => ({ id: s.id, title: s.title || s.fileName }))
      : undefined;

    return NextResponse.json({
      success: true,
      message: '文件导入成功',
      item: { title, grade, fileType, fileSize: file.size, fileUrl, extractStatus: enriched.extractStatus, summaryStatus: enriched.summaryStatus },
      similarWarning,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '文件导入失败', error: String(error) },
      { status: 500 }
    );
  }
}
