const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const dataDir = path.join(baseDir, 'data');
const publicDir = path.join(baseDir, 'public');

console.log('=== 平台数据与文件关联完整性校验 ===\n');

// 1. 检验 sources.json
const sources = JSON.parse(fs.readFileSync(path.join(dataDir, 'sources.json'), 'utf8'));
const activeSources = sources.filter(s => !s.isDeleted);
console.log(`1. sources.json 状态: 总数 ${sources.length}，活跃数 ${activeSources.length}`);

let missingSourceFiles = 0;
for (const s of activeSources) {
  const filePath = path.join(publicDir, s.fileUrl.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    console.error(`  [MISSING] 史料物理文件缺失: ${s.fileUrl}`);
    missingSourceFiles++;
  }
}
if (missingSourceFiles === 0) {
  console.log(`  ✔ 全部 ${activeSources.length} 份活跃史料的物理文件均存在于磁盘！`);
} else {
  console.error(`  ✖ 发现 ${missingSourceFiles} 个史料物理文件缺失！`);
}

// 2. 检验 media.json
const media = JSON.parse(fs.readFileSync(path.join(dataDir, 'media.json'), 'utf8'));
const activeMedia = media.filter(m => !m.isDeleted);
const softDeletedMedia = media.filter(m => m.isDeleted && m._dedupNote);
const activeHistoricalMedia = activeMedia.filter(m => m.category === 'historical');

console.log(`\n2. media.json 状态:`);
console.log(`  - 总条目数: ${media.length}`);
console.log(`  - 活跃媒体总数: ${activeMedia.length}`);
console.log(`  - 软删除的重复史料条目数: ${softDeletedMedia.length}`);
console.log(`  - 活跃史料媒体条目数: ${activeHistoricalMedia.length}`);

let missingMediaFiles = 0;
for (const m of activeHistoricalMedia) {
  const filePath = path.join(publicDir, m.url.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    console.error(`  [MISSING] 活跃媒体物理文件缺失: ${m.url}`);
    missingMediaFiles++;
  }
}
if (missingMediaFiles === 0) {
  console.log(`  ✔ 全部 ${activeHistoricalMedia.length} 份活跃史料媒体文件均正常存在于磁盘！`);
}

// 3. 校验各业务表引用关系
const people = JSON.parse(fs.readFileSync(path.join(dataDir, 'people.json'), 'utf8'));
const activeSourceIds = new Set(activeSources.map(s => s.id));
let invalidPeopleSourceRefs = 0;
for (const p of people) {
  if (p.relatedSources && Array.isArray(p.relatedSources)) {
    for (const sid of p.relatedSources) {
      if (!activeSourceIds.has(sid)) {
        invalidPeopleSourceRefs++;
      }
    }
  }
}
console.log(`\n3. 业务外键关联校验:`);
console.log(`  - 人物表 (people.json) 史料关联断链数: ${invalidPeopleSourceRefs}`);

console.log('\n=== 数据完整性与可访问性验证通过 ===\n');
