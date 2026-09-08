/**
 * 种子数据脚本 — 金陵工脉
 * 运行: npx tsx seed.ts (Node 18+) 或 npx ts-node seed.ts
 * 将 data/*.json 初始化或覆盖为示例数据
 */

import * as fs from 'fs'
import * as path from 'path'

const dataDir = path.join(process.cwd(), 'data')

// ---------- helpers ----------
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filename: string, data: any[]) {
  ensureDir(dataDir)
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  ✓ ${filename} (${data.length} 条)`)
}

// ---------- 种子数据 ----------

// 1. 史料来源 (≥20条)
const sources = [
  { id: 'src-001', title: '南京市工业志', author: '南京市地方志办公室', publicationYear: 2005, sourceType: '地方志', archiveLocation: '南京市档案馆', credibilityLevel: 'A', description: '系统记录南京近现代工业发展的权威地方志', isPublished: true, tags: '工业志,地方志,南京' },
  { id: 'src-002', title: '金陵机器制造局档案', author: '江南机器制造总局', publicationYear: 1865, sourceType: '档案文献', archiveLocation: '中国第一历史档案馆', credibilityLevel: 'A', description: '金陵机器制造局创办及运营原始档案', isPublished: true, tags: '金陵机器局,军工,档案' },
  { id: 'src-003', title: '南京近代工业建筑遗产研究', author: '张复合', publicationYear: 2012, sourceType: '学术著作', archiveLocation: '南京大学图书馆', credibilityLevel: 'A', description: '清华大学建筑学院关于南京工业遗产的专题研究', isPublished: true, tags: '工业遗产,建筑,学术' },
  { id: 'src-004', title: '南京晨光集团厂史', author: '晨光集团', publicationYear: 1998, sourceType: '企业史料', archiveLocation: '南京晨光集团档案室', credibilityLevel: 'B', description: '晨光机器厂前身金陵机器局的发展记录', isPublished: true, tags: '晨光,厂史,军工' },
  { id: 'src-005', title: '江南水泥厂志', author: '江南水泥厂', publicationYear: 1990, sourceType: '企业史料', archiveLocation: '栖霞区档案馆', credibilityLevel: 'B', description: '记录江南水泥厂自1935年创建以来的发展历程', isPublished: true, tags: '水泥,栖霞,厂史' },
  { id: 'src-006', title: '南京日报工业专题合辑', author: '南京日报社', publicationYear: 2000, sourceType: '报刊', archiveLocation: '南京日报社资料室', credibilityLevel: 'C', description: '历年南京工业新闻报道合辑', isPublished: true, tags: '报纸,新闻报道' },
  { id: 'src-007', title: '中国近代工业史资料 第一辑', author: '陈真、姚洛', publicationYear: 1957, sourceType: '学术著作', archiveLocation: '国家图书馆', credibilityLevel: 'A', description: '中国近代工业史权威文献汇编', isPublished: true, tags: '近代工业,汇编,学术' },
  { id: 'src-008', title: '南京化学工业公司志', author: '南化公司', publicationYear: 1984, sourceType: '企业史料', archiveLocation: '六合区档案馆', credibilityLevel: 'B', description: '永利铔厂（南化前身）至当代的发展全记录', isPublished: true, tags: '化工,永利,厂史' },
  { id: 'src-009', title: '范旭东与永利化工', author: '张洪元', publicationYear: 2008, sourceType: '学术著作', archiveLocation: '南京工业大学图书馆', credibilityLevel: 'A', description: '范旭东生平及其在永利化工的贡献', isPublished: true, tags: '范旭东,永利,人物' },
  { id: 'src-010', title: '南京无线电厂厂史', author: '熊猫电子', publicationYear: 1996, sourceType: '企业史料', archiveLocation: '熊猫电子集团档案室', credibilityLevel: 'B', description: '从南京无线电厂到熊猫电子的发展史', isPublished: true, tags: '电子,熊猫,厂史' },
  { id: 'src-011', title: '南京长江大桥建设档案', author: '铁道部', publicationYear: 1968, sourceType: '档案文献', archiveLocation: '江苏省档案馆', credibilityLevel: 'A', description: '南京长江大桥设计施工全套档案', isPublished: true, tags: '桥梁,长江大桥,档案' },
  { id: 'src-012', title: '南京钢铁厂志', author: '南京钢铁厂', publicationYear: 1988, sourceType: '企业史料', archiveLocation: '南京钢铁集团档案室', credibilityLevel: 'B', description: '南钢自1958年建厂以来的发展记录', isPublished: true, tags: '钢铁,南钢,厂史' },
  { id: 'src-013', title: '南京浦镇车辆厂志', author: '浦镇车辆厂', publicationYear: 1992, sourceType: '企业史料', archiveLocation: '浦口区档案馆', credibilityLevel: 'B', description: '浦镇车辆厂百年发展历程', isPublished: true, tags: '铁路,车辆,厂史' },
  { id: 'src-014', title: '南京云锦工业史', author: '南京云锦研究所', publicationYear: 2006, sourceType: '学术著作', archiveLocation: '南京云锦博物馆', credibilityLevel: 'B', description: '云锦织造工艺及其工业化演变', isPublished: true, tags: '云锦,纺织,非遗' },
  { id: 'src-015', title: '民国时期南京工业调查', author: '国民政府经济部', publicationYear: 1947, sourceType: '档案文献', archiveLocation: '中国第二历史档案馆', credibilityLevel: 'A', description: '1947年南京市工业经济普查报告', isPublished: true, tags: '民国,调查,档案' },
  { id: 'src-016', title: '南京轻工业发展史', author: '南京轻工业局', publicationYear: 1995, sourceType: '地方志', archiveLocation: '南京市档案馆', credibilityLevel: 'B', description: '南京轻工各行业发展历程', isPublished: true, tags: '轻工,发展史' },
  { id: 'src-017', title: '侯德榜与侯氏制碱法', author: '中国科学院', publicationYear: 1990, sourceType: '学术著作', archiveLocation: '中国科学技术大学图书馆', credibilityLevel: 'A', description: '侯德榜生平与侯氏制碱法发明始末', isPublished: true, tags: '侯德榜,制碱,科学' },
  { id: 'src-018', title: '南京纺织工业遗产调研报告', author: '南京历史城区保护建设集团', publicationYear: 2018, sourceType: '调查报告', archiveLocation: '南京市规划局', credibilityLevel: 'B', description: '南京纺织类工业遗产现状调查与保护建议', isPublished: true, tags: '纺织,遗产,调研' },
  { id: 'src-019', title: '南京小铁路记忆', author: '南京市政协文史委', publicationYear: 2010, sourceType: '口述史', archiveLocation: '南京市政协', credibilityLevel: 'C', description: '南京市区小铁路沿线老工人回忆录', isPublished: true, tags: '铁路,口述史,回忆录' },
  { id: 'src-020', title: '南京电子工业基地发展纪实', author: '信息产业部', publicationYear: 2002, sourceType: '档案文献', archiveLocation: '江苏省经信委档案室', credibilityLevel: 'B', description: '南京作为国家电子工业基地的发展规划', isPublished: true, tags: '电子,基地,规划' },
  { id: 'src-021', title: '南京船政与航运工业', author: '南京港务局', publicationYear: 1998, sourceType: '企业史料', archiveLocation: '下关区档案馆', credibilityLevel: 'C', description: '南京近代造船与航运业发展', isPublished: true, tags: '造船,航运,港口' },
  { id: 'src-022', title: '扬子石化建设始末', author: '扬子石化公司', publicationYear: 2000, sourceType: '企业史料', archiveLocation: '扬子石化档案室', credibilityLevel: 'B', description: '改革开放后南京特大型石化项目建设记录', isPublished: true, tags: '石化,扬子,建设' },
]

// 2. 企业遗址 (≥10条)
const sites = [
  { id: 'site-001', name: '金陵机器制造局', slug: 'jinling-arsenal', industry: '军工', address: '南京市秦淮区正学路1号', years: '1865-1949', description: '中国近代四大兵工厂之一、南京近代工业发端，由李鸿章创办。现存清代厂房建筑群，现为南京晨光1865创意产业园。', historicalValue: '标志性,中国近代军工摇篮,远东第一大厂', coverImage: '/uploads/images/jinling-arsenal.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-001,src-002,src-004' },
  { id: 'site-002', name: '永利铔厂', slug: 'yongli-ammonia', industry: '化工', address: '南京市六合区卸甲甸', years: '1934-1990', description: '由范旭东、侯德榜创办的中国第一座化肥厂，1937年产出中国第一包化肥。现为中石化南化公司。', historicalValue: '中国第一座化肥厂,奠基,远东第一', coverImage: '/uploads/images/yongli.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-008,src-009,src-017' },
  { id: 'site-003', name: '江南水泥厂', slug: 'jiangnan-cement', industry: '建材', address: '南京市栖霞区栖霞大道', years: '1935-至今', description: '近代南京最早的大型水泥生产企业，抗战期间曾保护大量难民。厂区建筑群完整，具有重要历史价值。', historicalValue: '南京最早的水泥厂,抗战难民庇护所', coverImage: '/uploads/images/jiangnan-cement.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-005' },
  { id: 'site-004', name: '南京无线电厂', slug: 'nj-radio-factory', industry: '电子', address: '南京市玄武区中山北路', years: '1936-2000', description: '中国最早的无线电设备制造企业之一，后发展为熊猫电子集团，曾研制中国第一台收音机。', historicalValue: '中国第一台收音机诞生地,无线电工业先驱', coverImage: '/uploads/images/radio-factory.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-010' },
  { id: 'site-005', name: '浦镇车辆厂', slug: 'puzhen-vehicle', industry: '铁路', address: '南京市浦口区龙虎巷', years: '1908-至今', description: '创建于1908年的百年老厂，中国最早的铁路车辆制造企业之一，现生产城轨和动车组。', historicalValue: '中国最早铁路车辆制造企业之一,百年老厂', coverImage: '/uploads/images/puzhen.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-013' },
  { id: 'site-006', name: '南京钢铁厂', slug: 'nj-steel', industry: '钢铁', address: '南京市六合区大厂街道', years: '1958-至今', description: '江苏省最大的钢铁联合企业，新中国钢铁工业重要基地。', historicalValue: '江苏最大钢铁企业,冶金工业支柱', coverImage: '/uploads/images/nj-steel.jpg', isPublished: true, isRecommended: false, siteImages: '', sourceRefs: 'src-012' },
  { id: 'site-007', name: '扬子石化', slug: 'yangzi-petrochemical', industry: '石化', address: '南京市六合区大厂街道', years: '1983-至今', description: '改革开放后国家重点特大型石化项目，南京工业现代化的标志性工程。', historicalValue: '改革开放标志性工业项目,特大型石化基地', coverImage: '/uploads/images/yangzi.jpg', isPublished: true, isRecommended: false, siteImages: '', sourceRefs: 'src-022' },
  { id: 'site-008', name: '南京长江大桥', slug: 'nj-yangtze-bridge', industry: '桥梁', address: '南京市鼓楼区/浦口区', years: '1960-1968', description: '第一座由中国自行设计建造的双层式铁路公路两用桥梁，新中国工业成就的象征。', historicalValue: '标志性,第一座自行设计建造公铁两用桥', coverImage: '/uploads/images/yangtze-bridge.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-011' },
  { id: 'site-009', name: '南京云锦织造工业遗产', slug: 'nj-yunjin', industry: '纺织', address: '南京市建邺区茶亭东街', years: '明清至今', description: '云锦是中国丝织工艺的最高成就代表，南京云锦织造技艺列入世界非遗。', historicalValue: '世界非物质文化遗产,中国丝织最高成就', coverImage: '/uploads/images/yunjin.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-014' },
  { id: 'site-010', name: '南京市轻工业机械厂', slug: 'nj-light-industry', industry: '机械', address: '南京市秦淮区石杨路', years: '1956-2010', description: '南京轻工系统骨干企业，曾生产多款出口机械产品，见证南京轻工业发展。', historicalValue: '南京轻工系统骨干企业', coverImage: '/uploads/images/light-industry.jpg', isPublished: true, isRecommended: false, siteImages: '', sourceRefs: 'src-016' },
  { id: 'site-011', name: '金陵造船厂', slug: 'jinling-shipyard', industry: '造船', address: '南京市鼓楼区下关江边路', years: '1952-至今', description: '南京最大的造船企业之一，曾建造万吨轮"南京号"，长江航运工业代表性企业。', historicalValue: '南京最大造船企业,长江航运代表', coverImage: '/uploads/images/jinling-shipyard.jpg', isPublished: true, isRecommended: true, siteImages: '', sourceRefs: 'src-021' },
  { id: 'site-012', name: '南京小铁路遗址', slug: 'nj-little-railway', industry: '铁路', address: '南京市鼓楼区三牌楼-下关', years: '1907-1950年代', description: '南京最早的城市轨道交通，连接沪宁铁路下关站与市区。现存部分路基遗址。', historicalValue: '南京最早城市轨道交通', coverImage: '/uploads/images/little-railway.jpg', isPublished: true, isRecommended: false, siteImages: '', sourceRefs: 'src-019' },
]

// 3. 人物 (≥4条)
const people = [
  { id: 'person-001', name: '范旭东', role: '实业家/化学工业奠基人', biography: '1883-1945，中国近代化工先驱，创办永利铔厂、久大精盐等企业，被誉为"中国化学工业之父"。在南京创办永利铔厂，实现中国化学肥料零的突破。', birthYear: 1883, deathYear: 1945, avatar: '/uploads/images/fanxudong.jpg', relatedSiteId: 'site-002', relatedSiteName: '永利铔厂', isPublished: true },
  { id: 'person-002', name: '侯德榜', role: '化学家/侯氏制碱法发明人', biography: '1890-1974，化学家，侯氏制碱法发明人。与范旭东共同创办永利铔厂，担任总工程师。后任化工部副部长。', birthYear: 1890, deathYear: 1974, avatar: '/uploads/images/houdebang.jpg', relatedSiteId: 'site-002', relatedSiteName: '永利铔厂', isPublished: true },
  { id: 'person-003', name: '李鸿章', role: '晚清洋务派领袖/金陵机器局创办者', biography: '1823-1901，晚清洋务派领袖，于1865年创办金陵机器制造局，开启南京近代工业化进程。', birthYear: 1823, deathYear: 1901, avatar: '/uploads/images/lihongzhang.jpg', relatedSiteId: 'site-001', relatedSiteName: '金陵机器制造局', isPublished: true },
  { id: 'person-004', name: '王寅生', role: '金陵机器局工人代表/革命者', biography: '1890-1927，南京早期工人运动的杰出代表，领导金陵机器局工人罢工斗争，1927年牺牲。', birthYear: 1890, deathYear: 1927, avatar: '/uploads/images/wangyinsheng.jpg', relatedSiteId: 'site-001', relatedSiteName: '金陵机器制造局', isPublished: true },
  { id: 'person-005', name: '马林', role: '无线电专家/南京无线电厂创始人', biography: '1900-1980，中国无线电工业先驱，主持南京无线电厂技术工作，参与研制中国第一台收音机。', birthYear: 1900, deathYear: 1980, avatar: '/uploads/images/malin.jpg', relatedSiteId: 'site-004', relatedSiteName: '南京无线电厂', isPublished: true },
  { id: 'person-006', name: '贝聿铭', role: '建筑设计顾问/金陵机器局改造方案顾问', biography: '1917-2019，美籍华裔建筑大师，曾为金陵机器局旧址改造为1865创意园提供咨询。', birthYear: 1917, deathYear: 2019, avatar: '/uploads/images/peiyuming.jpg', relatedSiteId: 'site-001', relatedSiteName: '金陵机器制造局', isPublished: true },
]

// 4. 史实 (≥30条)
interface FactSeedItem {
  id: string; claimText: string; publicExpression: string; verificationGrade: string;
  reviewStatus: string; isPublished: boolean; riskLevel: string; riskWords: string[];
  sourceIds: string[]; relatedSiteId: string; relatedPersonIds: string[];
}
const facts: FactSeedItem[] = [
  { id: 'fact-001', claimText: '金陵机器制造局是中国近代四大兵工厂之一，也是远东第一大兵工厂。', publicExpression: '金陵机器制造局是中国近代最重要的兵工企业之一，其规模在19世纪末属于全国领先水平。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-001','src-002'], relatedSiteId: 'site-001', relatedPersonIds: ['person-003'] },
  { id: 'fact-002', claimText: '永利铔厂是中国第一座化肥厂，1937年生产出中国第一包化学肥料。', publicExpression: '永利铔厂是中国最早的化肥生产企业之一，1937年率先成功生产出化学肥料，填补了国内空白。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-008','src-009','src-017'], relatedSiteId: 'site-002', relatedPersonIds: ['person-001','person-002'] },
  { id: 'fact-003', claimText: '南京长江大桥是第一座完全由中国自行设计建造的公铁两用桥，是中国桥梁建设史上的里程碑。', publicExpression: '南京长江大桥是新中国自主建设的重要公铁两用桥梁，在中国桥梁建设史上具有重要地位。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-011'], relatedSiteId: 'site-008', relatedPersonIds: [] },
  { id: 'fact-004', claimText: '八路军曾在江南水泥厂设立难民营，保护了近2万难民，这是南京唯一的工厂难民营。', publicExpression: '抗战期间江南水泥厂曾作为难民庇护所，保护了大量南京市民。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-005'], relatedSiteId: 'site-003', relatedPersonIds: [] },
  { id: 'fact-005', claimText: '南京无线电厂研制出中国第一台国产收音机，开创了中国电子工业先河。', publicExpression: '南京无线电厂在国产收音机研制方面取得了重要突破，为中国电子工业发展做出了贡献。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-010'], relatedSiteId: 'site-004', relatedPersonIds: ['person-005'] },
  { id: 'fact-006', claimText: '浦镇车辆厂是中国最早创办的铁路车辆制造企业之一，始建于1908年。', publicExpression: '浦镇车辆厂始建于1908年，是中国铁路车辆制造行业历史最悠久的企业之一。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-013'], relatedSiteId: 'site-005', relatedPersonIds: [] },
  { id: 'fact-007', claimText: '范旭东是中国化学工业之父，在南京创办了远东第一的永利铔厂。', publicExpression: '范旭东先生是中国近代化学工业的重要奠基人，其在南京创办的永利铔厂影响深远。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-009'], relatedSiteId: 'site-002', relatedPersonIds: ['person-001'] },
  { id: 'fact-008', claimText: '侯德榜发明的侯氏制碱法打破西方垄断，是中国化学工业的奠基性成就。', publicExpression: '侯德榜先生发明的侯氏制碱法具有重要创新价值，对中国化学工业发展贡献巨大。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-017'], relatedSiteId: 'site-002', relatedPersonIds: ['person-002'] },
  { id: 'fact-009', claimText: '南京钢铁厂是江苏省最大的钢铁联合企业，年产量曾居全国前列。', publicExpression: '南京钢铁厂是江苏省重要的钢铁生产基地，在区域经济发展中发挥了重要作用。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-012'], relatedSiteId: 'site-006', relatedPersonIds: [] },
  { id: 'fact-010', claimText: '扬子石化是改革开放后最大的单笔工业投资项目之一，总投资超过200亿元。', publicExpression: '扬子石化项目是改革开放后国家重点工业投资项目之一，对南京工业格局产生了重要影响。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-022'], relatedSiteId: 'site-007', relatedPersonIds: [] },
  { id: 'fact-011', claimText: '南京云锦是中国丝织工艺最高成就代表，元代始设官办织造机构。', publicExpression: '南京云锦是中国丝织工艺的重要代表，历史悠久、技艺精湛，已被列入世界非物质文化遗产。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-014'], relatedSiteId: 'site-009', relatedPersonIds: [] },
  { id: 'fact-012', claimText: '1865年李鸿章创办的金陵机器制造局是南京近代工业的开端，标志着南京进入工业化。', publicExpression: '1865年创办的金陵机器制造局是南京近代工业发展的重要起点。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-001','src-002'], relatedSiteId: 'site-001', relatedPersonIds: ['person-003'] },
  { id: 'fact-013', claimText: '江南水泥厂是全国最早的生产水泥的大型企业之一，为中国建筑材料工业发展奠基。', publicExpression: '江南水泥厂是中国近代水泥工业的重要企业，在建筑建材领域贡献突出。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-005'], relatedSiteId: 'site-003', relatedPersonIds: [] },
  { id: 'fact-014', claimText: '金陵造船厂曾建造中国首艘万吨远洋货轮"南京号"。', publicExpression: '金陵造船厂曾建造万吨级远洋货轮，为中国造船工业做出贡献。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-021'], relatedSiteId: 'site-011', relatedPersonIds: [] },
  { id: 'fact-015', claimText: '南京小铁路是南京第一条城市轨道交通线路，于1907年通车。', publicExpression: '南京小铁路于1907年开通，是南京早期城市交通的重要组成部分。', verificationGrade: 'C', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-019'], relatedSiteId: 'site-012', relatedPersonIds: [] },
  // 待审核/未发布几条
  { id: 'fact-016', claimText: '南京是中国唯一拥有完整工业门类体系的省会城市。', publicExpression: '', verificationGrade: 'C', reviewStatus: 'pending', isPublished: false, riskLevel: '', riskWords: [], sourceIds: ['src-016'], relatedSiteId: '', relatedPersonIds: [] },
  { id: 'fact-017', claimText: '金陵机器制造局的武器产量在中国近代四大兵工厂中排名第一。', publicExpression: '', verificationGrade: 'C', reviewStatus: 'pending', isPublished: false, riskLevel: '', riskWords: [], sourceIds: ['src-004'], relatedSiteId: 'site-001', relatedPersonIds: [] },
  { id: 'fact-018', claimText: '江南水泥厂创造过全国水泥产量第一的纪录。', publicExpression: '', verificationGrade: 'C', reviewStatus: 'pending', isPublished: false, riskLevel: '', riskWords: [], sourceIds: ['src-005'], relatedSiteId: 'site-003', relatedPersonIds: [] },
  { id: 'fact-019', claimText: '1947年南京市工业产值位居全国前五，机械制造业产值占全省60%以上。', publicExpression: '1947年的调查显示南京工业在当时的中国经济中占有重要地位。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-015'], relatedSiteId: '', relatedPersonIds: [] },
  { id: 'fact-020', claimText: '中国第一枚国产运载火箭的发动机由晨光机器厂（原金陵机器局）生产。', publicExpression: '晨光机器厂（原金陵机器局）在航天动力领域发挥过重要作用。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-004'], relatedSiteId: 'site-001', relatedPersonIds: [] },
  { id: 'fact-021', claimText: '南京云锦织造技艺是世界唯一保留完整手工提花工艺的丝织技艺。', publicExpression: '南京云锦织造技艺保留了大量传统手工技艺，具有极高的文化价值。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-014'], relatedSiteId: 'site-009', relatedPersonIds: [] },
  { id: 'fact-022', claimText: '永利铔厂奠基了中国近代化学工业的基础。', publicExpression: '永利铔厂对中国近代化学工业发展起到了重要推动作用。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-008','src-009'], relatedSiteId: 'site-002', relatedPersonIds: ['person-001','person-002'] },
  { id: 'fact-023', claimText: '南京电子工业基地是我国最早的国家级电子工业基地之一，代号714厂等企业全国知名。', publicExpression: '南京是国家电子工业的重要基地，"熊猫"等品牌享誉全国。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-020','src-010'], relatedSiteId: 'site-004', relatedPersonIds: [] },
  { id: 'fact-024', claimText: '南京红色工人运动以金陵机器局为中心，王寅生烈士在地下党领导下组织罢工。', publicExpression: '金陵机器局是南京工人运动的重要场所，涌现出王寅生等工人领袖。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-002'], relatedSiteId: 'site-001', relatedPersonIds: ['person-004'] },
  { id: 'fact-025', claimText: '南京纺织工业在中国近代"实业救国"浪潮中具有标志性地位。', publicExpression: '南京纺织工业在近代中国工业化进程中发挥了重要作用。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-018'], relatedSiteId: '', relatedPersonIds: [] },
  { id: 'fact-026', claimText: '南京长江大桥是中国第一座由中国人自主设计建造的跨长江大桥，被誉为"争气桥"。', publicExpression: '南京长江大桥是中国人自主建设的重要桥梁工程，充分展现了新中国建设成就。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-011'], relatedSiteId: 'site-008', relatedPersonIds: [] },
  { id: 'fact-027', claimText: '南化公司（原永利铔厂）生产出新中国第一批硫酸、硝酸等基础化工原料。', publicExpression: '南化公司在新中国基础化工原料生产中发挥了先驱作用。', verificationGrade: 'A', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-008'], relatedSiteId: 'site-002', relatedPersonIds: [] },
  { id: 'fact-028', claimText: '江南水泥厂开设了全国第一家水泥技术培训学校。', publicExpression: '', verificationGrade: 'C', reviewStatus: 'pending', isPublished: false, riskLevel: '', riskWords: [], sourceIds: ['src-005'], relatedSiteId: 'site-003', relatedPersonIds: [] },
  { id: 'fact-029', claimText: '浦镇车辆厂生产了新中国第一列22型客车。', publicExpression: '浦镇车辆厂在国产铁路客车制造方面取得过重要成就。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-013'], relatedSiteId: 'site-005', relatedPersonIds: [] },
  { id: 'fact-030', claimText: '金陵造船厂曾建造中国第一艘万吨级远洋科学考察船。', publicExpression: '', verificationGrade: 'C', reviewStatus: 'pending', isPublished: false, riskLevel: '', riskWords: [], sourceIds: ['src-021'], relatedSiteId: 'site-011', relatedPersonIds: [] },
  { id: 'fact-031', claimText: '南京熊猫电子是新中国第一家电子行业上市公司。', publicExpression: '熊猫电子是中国电子行业发展历程中的重要标志性企业。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-010','src-020'], relatedSiteId: 'site-004', relatedPersonIds: [] },
  { id: 'fact-032', claimText: '南京是唯一完整保留清代、民国、新中国三个时期工业遗存的省会城市。', publicExpression: '南京保留了从清代到新中国多个时期的工业遗存，工业遗产体系较为完整。', verificationGrade: 'B', reviewStatus: 'approved', isPublished: true, riskLevel: '', riskWords: [], sourceIds: ['src-003','src-001'], relatedSiteId: '', relatedPersonIds: [] },
]

// 后处理：为每条史实自动检测风险词
import { detectRiskWords, assessRiskLevel } from './src/lib/riskDetector'
for (const f of facts) {
  const riskWords = detectRiskWords(f.claimText)
  f.riskWords = riskWords
  if (!f.riskLevel || f.riskLevel === '') {
    f.riskLevel = assessRiskLevel(riskWords, [])
  }
}
console.log('  ✓ 史实风险词自动检测完成')

// 5. 时间轴事件 (≥15条)
const timeline = [
  { id: 'timeline-001', year: 1865, title: '金陵机器制造局成立', description: '李鸿章在南京创办金陵机器制造局，标志着南京近代工业的诞生，开启南京工业化进程。', category: '军事工业', era: '晚清' },
  { id: 'timeline-002', year: 1907, title: '南京小铁路通车', description: '南京第一条城市轨道交通——"小铁路"建成通车，连接沪宁铁路下关站与市区。', category: '交通', era: '晚清' },
  { id: 'timeline-003', year: 1908, title: '浦镇车辆厂建厂', description: '英商创办浦镇车辆厂，后成为中国铁路车辆制造的重要基地。', category: '铁路工业', era: '晚清' },
  { id: 'timeline-004', year: 1912, title: '民国定都南京 工业加速发展', description: '中华民国成立定都南京，城市建设与工业进入新阶段。', category: '政策', era: '民国' },
  { id: 'timeline-005', year: 1934, title: '永利铔厂开工建设', description: '范旭东、侯德榜在南京创办永利铔厂，是中国第一座化肥厂。', category: '化学工业', era: '民国' },
  { id: 'timeline-006', year: 1935, title: '江南水泥厂成立', description: '江南水泥厂在栖霞区建成投产，成为南京建材工业支柱企业。', category: '建材工业', era: '民国' },
  { id: 'timeline-007', year: 1937, title: '永利铔厂投产首批化肥', description: '永利铔厂成功产出中国第一包化学肥料——红三角牌硫酸铵。', category: '化学工业', era: '民国' },
  { id: 'timeline-008', year: 1937, title: '抗日战争爆发 工厂内迁', description: '全面抗战爆发，南京主要工厂向后方转移，部分厂房被炸毁。', category: '战争影响', era: '抗日战争' },
  { id: 'timeline-009', year: 1947, title: '民国工业普查', description: '国民政府完成南京市工业普查，南京工业在战后逐步恢复。', category: '政策', era: '民国' },
  { id: 'timeline-010', year: 1949, title: '南京解放 工业国有化', description: '新中国成立，南京市主要工厂逐步完成社会主义改造。', category: '政策', era: '新中国' },
  { id: 'timeline-011', year: 1958, title: '南京钢铁厂建厂', description: '在大跃进背景下，南京钢铁厂动工兴建，后成为江苏最大钢铁企业。', category: '钢铁工业', era: '新中国' },
  { id: 'timeline-012', year: 1960, title: '南京长江大桥开工建设', description: '新中国标志性工程——南京长江大桥动工。由中国人自主设计建造。', category: '交通基建', era: '新中国' },
  { id: 'timeline-013', year: 1968, title: '南京长江大桥建成通车', description: '中国第一座自主设计建造的公铁两用桥正式通车，举国欢庆。', category: '交通基建', era: '新中国' },
  { id: 'timeline-014', year: 1978, title: '改革开放 工业转型', description: '改革开放后南京工业加速发展，乡镇企业异军突起。', category: '政策', era: '改革开放' },
  { id: 'timeline-015', year: 1983, title: '扬子石化项目启动', description: '国家重点工程——扬子30万吨乙烯工程开工建设，为南京最大工业项目之一。', category: '石化工业', era: '改革开放' },
  { id: 'timeline-016', year: 1996, title: '熊猫电子上市', description: '南京熊猫电子在港交所上市，成为南京首家H股上市工业企业。', category: '电子工业', era: '改革开放' },
  { id: 'timeline-017', year: 2007, title: '晨光1865创意园开放', description: '金陵机器局旧址改造为晨光1865创意产业园，工业遗产再利用典范。', category: '文化遗产', era: '当代' },
  { id: 'timeline-018', year: 2018, title: '南京工业遗产保护规划', description: '南京市公布工业遗产保护名录，金陵机器局等入选国家级工业遗产。', category: '文化遗产', era: '当代' },
]

// 6. 地图点位
const mapPoints = [
  { id: 'map-001', siteName: '金陵机器局', siteId: 'site-001', xPercent: 52, yPercent: 68, description: '秦淮区正学路1号', address: '秦淮区正学路1号' },
  { id: 'map-002', siteName: '永利铔厂', siteId: 'site-002', xPercent: 48, yPercent: 22, description: '六合区卸甲甸', address: '六合区卸甲甸' },
  { id: 'map-003', siteName: '江南水泥厂', siteId: 'site-003', xPercent: 62, yPercent: 35, description: '栖霞区栖霞大道', address: '栖霞区栖霞大道' },
  { id: 'map-004', siteName: '南京无线电厂', siteId: 'site-004', xPercent: 50, yPercent: 55, description: '玄武区中山北路', address: '玄武区中山北路' },
  { id: 'map-005', siteName: '浦镇车辆厂', siteId: 'site-005', xPercent: 38, yPercent: 28, description: '浦口区龙虎巷', address: '浦口区龙虎巷' },
  { id: 'map-006', siteName: '南京钢铁厂', siteId: 'site-006', xPercent: 45, yPercent: 20, description: '六合区大厂街道', address: '六合区大厂街道' },
  { id: 'map-007', siteName: '扬子石化', siteId: 'site-007', xPercent: 50, yPercent: 18, description: '六合区大厂街道', address: '六合区大厂街道' },
  { id: 'map-008', siteName: '南京长江大桥', siteId: 'site-008', xPercent: 42, yPercent: 42, description: '鼓楼区/浦口区', address: '鼓楼区/浦口区' },
  { id: 'map-009', siteName: '云锦博物馆', siteId: 'site-009', xPercent: 45, yPercent: 62, description: '建邺区茶亭东街', address: '建邺区茶亭东街' },
  { id: 'map-010', siteName: '金陵造船厂', siteId: 'site-011', xPercent: 40, yPercent: 48, description: '鼓楼区下关江边路', address: '鼓楼区下关江边路' },
  { id: 'map-011', siteName: '小铁路遗址', siteId: 'site-012', xPercent: 46, yPercent: 52, description: '鼓楼区三牌楼-下关', address: '鼓楼区三牌楼-下关' },
]

// 7. 数字复原场景 (≥5条)
interface SceneSeedItem {
  id: string; title: string; description: string; period: string;
  imageUrl: string; hotspots: { x: number; y: number; label: string }[];
  isPublished: boolean;
}
const scenes: SceneSeedItem[] = [
  { id: 'scene-001', title: '金陵机器局复原场景', description: '通过数字技术还原1890年代金陵机器局全貌，展示弹药生产线、枪炮车间和厂区布局。', period: '晚清', imageUrl: '/uploads/scenes/jinling-arsenal-3d.jpg', hotspots: [{ x: 30, y: 50, label: '枪炮车间' }, { x: 60, y: 35, label: '弹药库' }, { x: 50, y: 75, label: '厂部办公楼' }], isPublished: true },
  { id: 'scene-002', title: '永利铔厂1937年全景', description: '复原永利铔厂1937年投产时的厂区面貌，展示合成氨车间和红三角牌化肥生产线。', period: '民国', imageUrl: '/uploads/scenes/yongli-1937.jpg', hotspots: [{ x: 45, y: 40, label: '合成氨车间' }, { x: 75, y: 65, label: '化肥包装车间' }], isPublished: true },
  { id: 'scene-003', title: '江南水泥厂抗战避难场景', description: '还原1937年江南水泥厂作为难民庇护所的场景，展示难民营布置和工厂防护设施。', period: '抗日战争', imageUrl: '/uploads/scenes/jiangnan-refugee.jpg', hotspots: [{ x: 25, y: 55, label: '难民营区' }, { x: 60, y: 40, label: '丹麦国旗区' }], isPublished: true },
  { id: 'scene-004', title: '南京长江大桥建设现场', description: '复原1960年代长江大桥建设场景，展示桥墩施工和引桥架设的场景。', period: '新中国', imageUrl: '/uploads/scenes/bridge-build.jpg', hotspots: [{ x: 50, y: 45, label: '桥墩施工' }, { x: 30, y: 70, label: '引桥工程' }, { x: 80, y: 35, label: '施工指挥部' }], isPublished: true },
  { id: 'scene-005', title: '浦镇车辆厂百年车间', description: '数字化展示浦镇车辆厂保留的1908年原厂房和早期火车制造设备。', period: '民国', imageUrl: '/uploads/scenes/puzhen-workshop.jpg', hotspots: [{ x: 40, y: 60, label: '机加工车间' }, { x: 65, y: 30, label: '装配线' }], isPublished: true },
]

// 8. 公益课程 (≥4套)
interface CourseSeedItem {
  id: string; title: string; description: string; type: string;
  targetAudience: string; pptFile: string; scriptFile: string; taskFile: string;
  relatedFactIds: string[]; isPublished: boolean;
}
const courses: CourseSeedItem[] = [
  { id: 'course-001', title: '走进金陵机器局——南京工业的起点', description: '适合中小学社会实践的研学课程，通过金陵机器局的故事了解南京近代工业发展。', type: '课程', targetAudience: '中小学生', pptFile: '/uploads/courses/jinling-arsenal-course.pptx', scriptFile: '/uploads/courses/jinling-arsenal-script.docx', taskFile: '/uploads/courses/jinling-arsenal-task.docx', relatedFactIds: ['fact-001','fact-012'], isPublished: true },
  { id: 'course-002', title: '范旭东与化学工业的故事', description: '讲述范旭东、侯德榜等化工先驱的创业故事，传播科学精神和爱国情怀。', type: '课程', targetAudience: '初高中学生', pptFile: '/uploads/courses/fanxudong-course.pptx', scriptFile: '/uploads/courses/fanxudong-script.docx', taskFile: '/uploads/courses/fanxudong-task.docx', relatedFactIds: ['fact-002','fact-007','fact-008'], isPublished: true },
  { id: 'course-003', title: '南京长江大桥——从图纸到通车', description: '南京长江大桥建设的STEM课程，涵盖工程设计、材料科学和历史背景。', type: '课程', targetAudience: '初高中学生', pptFile: '/uploads/courses/bridge-course.pptx', scriptFile: '/uploads/courses/bridge-script.docx', taskFile: '/uploads/courses/bridge-task.docx', relatedFactIds: ['fact-003','fact-026'], isPublished: true },
  { id: 'course-004', title: '工业遗产保护主题演讲', description: '面向公众的公益讲座讲稿，介绍南京工业遗产的价值和保护意义。', type: '讲稿', targetAudience: '公众', pptFile: '/uploads/courses/heritage-speech.pptx', scriptFile: '/uploads/courses/heritage-script.docx', taskFile: '', relatedFactIds: ['fact-032'], isPublished: true },
]

// 9. 活动记录 (≥3条)
const activities = [
  { id: 'act-001', title: '金陵机器局旧址研学活动', date: '2025-10-15', location: '晨光1865创意产业园', description: '组织中小学生参观金陵机器局旧址，了解南京近代工业发展历程。', servedCount: 85, feedback: '学生反响热烈，对工厂历史产生了浓厚兴趣。', photos: '/uploads/images/activity-001-1.jpg,/uploads/images/activity-001-2.jpg', isPublished: true },
  { id: 'act-002', title: '永利铔厂旧址工业遗产调研', date: '2025-11-02', location: '六合区南化公司', description: '高校团队赴永利铔厂旧址调研，采集口述史资料。', servedCount: 15, feedback: '获得珍贵史料，厂区老工人提供了许多生动回忆。', photos: '/uploads/images/activity-002-1.jpg', isPublished: true },
  { id: 'act-003', title: '"金陵工脉"社区公益展览', date: '2025-12-10', location: '鼓楼区社区文化中心', description: '在社区举办的工业遗产图片展，向居民宣传南京工业文化。', servedCount: 200, feedback: '社区居民尤其是老一辈工人产生了强烈共鸣。', photos: '/uploads/images/activity-003-1.jpg,/uploads/images/activity-003-2.jpg', isPublished: true },
]

// 10. 系统设置
const settings = [
  { id: 'settings-main', siteName: '金陵工脉', subtitle: '薪火传承——南京民族工业记忆数字复原与公益传承', aboutText: '本项目旨在通过数字化手段系统整理与展示南京民族工业发展历程，保护工业遗产，传承工业精神，服务公益教育。', contactEmail: 'contact@jinlinggongmai.cn', contactPhone: '025-12345678', contactAddress: '南京市', mapImageUrl: '/uploads/images/nanjing-map.jpg', heroImageUrl: '' },
]

// 11. 媒体文件记录
const media = [
  { id: 'media-001', filename: 'jinling-arsenal.jpg', filePath: '/uploads/images/jinling-arsenal.jpg', mimeType: 'image/jpeg', sizeBytes: 0, fileType: 'image', relatedType: 'sites', relatedId: 'site-001' },
]

// ---------- 写入文件 ----------
console.log('\n🌱 正在生成种子数据...\n')

writeJson('sources.json', sources)
writeJson('sites.json', sites)
writeJson('people.json', people)
writeJson('facts.json', facts)
writeJson('timeline.json', timeline)
writeJson('map_points.json', mapPoints)
writeJson('scenes.json', scenes)
writeJson('courses.json', courses)
writeJson('activities.json', activities)
writeJson('settings.json', settings)
writeJson('media.json', media)

console.log(`\n✅ 完成！已写入 ${dataDir}/ 目录\n`)