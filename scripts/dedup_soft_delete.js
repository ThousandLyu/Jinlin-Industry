const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const dataDir = path.join(baseDir, 'data');
const backupsDir = path.join(dataDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// 1. 备份数据
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const mediaPath = path.join(dataDir, 'media.json');
const mediaBackupPath = path.join(backupsDir, `media.json.pre-dedup-${timestamp}.bak`);
fs.copyFileSync(mediaPath, mediaBackupPath);
console.log(`[Backup] media.json 已备份至: ${mediaBackupPath}`);

// 2. 读取 sources.json 和 media.json
const sources = JSON.parse(fs.readFileSync(path.join(dataDir, 'sources.json'), 'utf8'));
const media = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

const activeSourceUrls = new Set(sources.filter(s => !s.isDeleted).map(s => s.fileUrl));
console.log(`[Source] 当前活跃史料数量: ${activeSourceUrls.size}`);

// 3. 统计并标记重复项
let softDeletedCount = 0;
let alreadyDeletedCount = 0;
let keptSourceMediaCount = 0;
let nonSourceMediaCount = 0;

const updatedMedia = media.map(item => {
  const isSourceMedia = item.url && item.url.includes('/uploads/sources/');

  if (!isSourceMedia) {
    nonSourceMediaCount++;
    return item;
  }

  // 如果正是 sources.json 正在引用的条目，必须保留
  if (activeSourceUrls.has(item.url)) {
    keptSourceMediaCount++;
    return item;
  }

  // 否则属于未被引用的历史重复记录
  if (item.isDeleted) {
    alreadyDeletedCount++;
    return item;
  }

  softDeletedCount++;
  return {
    ...item,
    isDeleted: true,
    updatedAt: new Date().toISOString(),
    _dedupNote: 'soft-deleted: duplicate source entry (pre-run before -1 suffix)',
  };
});

fs.writeFileSync(mediaPath, JSON.stringify(updatedMedia, null, 2), 'utf8');

console.log('\n=== 软删除处理完成 ===');
console.log(`- 成功软删除重复史料条目: ${softDeletedCount} 条`);
console.log(`- 此前已标记删除条目: ${alreadyDeletedCount} 条`);
console.log(`- 正常保留的有效史料条目: ${keptSourceMediaCount} 条`);
console.log(`- 非史料媒体资源（网站素材/模型等）: ${nonSourceMediaCount} 条`);
console.log(`- media.json 总条目数（含软删除）: ${updatedMedia.length} 条`);
console.log(`- media.json 中有效活跃条目数 (isDeleted !== true): ${updatedMedia.filter(m => !m.isDeleted).length} 条`);
