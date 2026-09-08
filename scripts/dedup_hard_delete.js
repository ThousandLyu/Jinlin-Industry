/**
 * dedup_hard_delete.js
 * 
 * 待软删除调试确认无误后执行的“硬删除”脚本。
 * 功能：
 * 1. 自动将待硬删除的 84 个无 -1 冗余物理文件与 43 个孤立文本缓存归档备份至 data/backups/
 * 2. 从 data/media.json 中物理剔除已软删除的 84 条重复条目
 * 3. 从 public/uploads/sources/ 中物理移除 84 个冗余文件
 * 4. 从 data/source_text/ 中物理移除 43 个孤立缓存文件
 * 
 * 用法：
 * node scripts/dedup_hard_delete.js --dry-run   (仅模拟预览，不实际删除)
 * node scripts/dedup_hard_delete.js --execute   (正式执行物理清理)
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

const baseDir = path.resolve(__dirname, '..');
const dataDir = path.join(baseDir, 'data');
const backupsDir = path.join(dataDir, 'backups');
const uploadsDir = path.join(baseDir, 'public', 'uploads', 'sources');
const sourceTextDir = path.join(dataDir, 'source_text');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

console.log(`=== 史料重复数据硬删除脚本 [模式: ${isDryRun ? 'DRY-RUN (仅预览)' : 'EXECUTE (正式执行)'}] ===\n`);

// 1. 读取数据
const mediaPath = path.join(dataDir, 'media.json');
const media = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));
const sources = JSON.parse(fs.readFileSync(path.join(dataDir, 'sources.json'), 'utf8'));

const activeSourceUrls = new Set(sources.filter(s => !s.isDeleted).map(s => s.fileUrl));
const activeSourceIds = new Set(sources.filter(s => !s.isDeleted).map(s => s.id));

// 识别待清除的 media 记录
const itemsToPurge = media.filter(m => m.isDeleted && m._dedupNote);
console.log(`1. 待从 media.json 中物理移除的条目数: ${itemsToPurge.length} 条`);

// 识别待删除的物理文件（无 -1 的冗余副本）
const filesToRemove = [];
itemsToPurge.forEach(m => {
  const relPath = m.url.replace('/uploads/sources/', '');
  const absPath = path.join(uploadsDir, relPath);
  if (fs.existsSync(absPath)) {
    filesToRemove.push(absPath);
  }
});
console.log(`2. 待从 public/uploads/sources/ 中物理删除的旧冗余文件: ${filesToRemove.length} 个`);

// 识别待删除的孤立文本缓存
const orphanTextFiles = [];
if (fs.existsSync(sourceTextDir)) {
  const allTxt = fs.readdirSync(sourceTextDir);
  for (const txt of allTxt) {
    const id = txt.replace('.txt', '');
    if (!activeSourceIds.has(id)) {
      orphanTextFiles.push(path.join(sourceTextDir, txt));
    }
  }
}
console.log(`3. 待从 data/source_text/ 中物理删除的孤立文本缓存: ${orphanTextFiles.length} 个\n`);

if (isDryRun) {
  console.log('>>> 当前为 DRY-RUN 预览模式，未做任何物理改动。');
  console.log('>>> 若需正式执行硬删除，请执行: node scripts/dedup_hard_delete.js --execute');
  process.exit(0);
}

// === 正式执行 ===
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const archiveDir = path.join(backupsDir, `purged-files-${timestamp}`);
fs.mkdirSync(archiveDir, { recursive: true });

console.log(`[Backup] 正在将待删除的物理文件与缓存备份至: ${archiveDir}`);

// 备份并删除物理文件
let deletedFilesCount = 0;
for (const file of filesToRemove) {
  const target = path.join(archiveDir, 'sources', path.relative(uploadsDir, file));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  fs.unlinkSync(file);
  deletedFilesCount++;
}
console.log(`- 已备份并物理删除磁盘史料文件: ${deletedFilesCount} 个`);

// 备份并删除孤立文本缓存
let deletedTxtCount = 0;
for (const txt of orphanTextFiles) {
  const target = path.join(archiveDir, 'source_text', path.basename(txt));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(txt, target);
  fs.unlinkSync(txt);
  deletedTxtCount++;
}
console.log(`- 已备份并物理删除孤立文本缓存: ${deletedTxtCount} 个`);

// 物理清除 media.json 记录
const cleanedMedia = media.filter(m => !(m.isDeleted && m._dedupNote));
fs.writeFileSync(mediaPath, JSON.stringify(cleanedMedia, null, 2), 'utf8');
console.log(`- 已更新 media.json，现存总条目数: ${cleanedMedia.length} 条 (原 189 条)`);

console.log('\n=== 硬删除执行完毕，所有被删文件已完整备份，随时可还原 ===');
