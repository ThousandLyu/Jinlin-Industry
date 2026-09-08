import { chat } from '@/lib/aiClient';

export interface ClassificationResult {
  category: string;
  credibilityLevel: 'A' | 'B' | 'C';
  suggestedTitle: string;
  confidence: number;
  aiReason: string;
}

const CATEGORIES = [
  '地图测绘', '历史影像', '官方档案', '法规契约', '口述史料',
  '统计数据', '报刊文献', '工程图纸', '私人文献', '学术著作',
  '综合史料',
];

/** AI 智能分类：根据文件名+文本内容判断 category / 可信度 / 建议标题 */
export async function classifySource(params: {
  fileName: string;
  text?: string;
}): Promise<ClassificationResult | null> {
  const { fileName, text } = params;
  try {
    const result = await chat([
      {
        role: 'system',
        content: [
          '你是南京民族工业史料编目助手。根据文件名和文本摘录，判断史料的分类、可信度和建议标题。',
          `分类必须从以下选择：${CATEGORIES.join('、')}`,
          '可信度: A=高(官方文件/一手档案/权威出版物), B=中(可靠二手文献/规范报道), C=低(来源不明/片段/网络资料)',
          '标题: 如果文件名不规范，根据内容提炼规范的中文标题（≤30字），文件名已规范则直接使用',
          '只返回 JSON: {"category":"","credibilityLevel":"A|B|C","suggestedTitle":"","confidence":0.5,"aiReason":""}',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `文件名：${fileName}\n\n文本摘录：${(text || '无文本').slice(0, 2000)}`,
      },
    ]);
    const match = result.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : '综合史料',
      credibilityLevel: ['A', 'B', 'C'].includes(parsed.credibilityLevel) ? parsed.credibilityLevel : 'C',
      suggestedTitle: String(parsed.suggestedTitle || fileName).slice(0, 60),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      aiReason: String(parsed.aiReason || '').slice(0, 200),
    };
  } catch {
    return null;
  }
}

/** 根据文件扩展名和文件名关键词做快速预分类（不调AI，fallback用） */
export function quickClassify(fileName: string, fileExt: string): Pick<ClassificationResult, 'category' | 'credibilityLevel'> {
  const lower = fileName.toLowerCase();
  const ext = fileExt.toLowerCase();

  let category = '综合史料';
  if (/地图|规划图|地形图|航拍|测绘|map|plan|layout|blueprint/.test(lower)) category = '地图测绘';
  else if (/照片|合影|车间|厂房|设备|机器|生产|photo|image|picture/.test(lower)) category = '历史影像';
  else if (/档案|卷宗|批复|报告|archive|record|report/.test(lower)) category = '官方档案';
  else if (/契约|合同|章程|条例|protocol|contract|agreement/.test(lower)) category = '法规契约';
  else if (/回忆录|口述|访谈|回忆|采访|oral|interview|memoir/.test(lower)) category = '口述史料';
  else if (/统计|表格|数据|统计表|报表|statistic|spreadsheet|table/.test(lower)) category = '统计数据';
  else if (/报纸|新闻|报道|通讯|newspaper|news|press|article/.test(lower)) category = '报刊文献';
  else if (/图纸|设计图|工程图|blueprint|drawing|dwg|engineer/.test(lower)) category = '工程图纸';
  else if (/书信|信件|日记|手稿|letter|manuscript|diary/.test(lower)) category = '私人文献';
  else if (/书|著作|论文|研究|book|thesis|monograph|research/.test(lower)) category = '学术著作';
  else if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(ext)) category = '历史影像';
  else if (/\.(mp3|wav|m4a)$/i.test(ext)) category = '口述史料';
  else if (/\.(xls|xlsx|csv)$/i.test(ext)) category = '统计数据';
  else if (/\.(pdf|doc|docx)$/i.test(ext)) category = '官方档案';

  // 快速可信度判断
  let credibilityLevel: 'A' | 'B' | 'C' = 'C';
  if (/\.(pdf)$/i.test(ext) && /档案|批复|报告|卷宗|contract/.test(lower)) credibilityLevel = 'A';
  else if (/\.(pdf|docx?)$/i.test(ext)) credibilityLevel = 'B';

  return { category, credibilityLevel };
}
