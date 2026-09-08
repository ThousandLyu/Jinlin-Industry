import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import archiver from 'archiver';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const dataDir = path.join(process.cwd(), 'data');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const backupDir = path.join(dataDir, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `jinling-backup-${timestamp}`;
    const zipPath = path.join(backupDir, `${backupName}.zip`);

    await fs.mkdir(backupDir, { recursive: true });

    // 使用 archiver 创建 ZIP（安全，无命令注入风险）
    const output = fsSync.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);

      // 添加 data 目录中的 JSON 文件（排除 backups 子目录）
      archive.directory(dataDir, 'data', (entry) => {
        return entry.name.startsWith('backups') ? false : entry;
      });

      // 添加 uploads 目录
      archive.directory(uploadsDir, 'uploads');

      archive.finalize();
    });

    return NextResponse.json({
      success: true,
      message: '备份成功',
      backupName,
      path: `data/backups/${backupName}.zip`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '备份失败', error: String(error) },
      { status: 500 }
    );
  }
}
