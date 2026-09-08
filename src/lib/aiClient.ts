import { getAppConfig } from '@/lib/appConfig';
import { invokeAI, type AIInvokeOptions } from '@/lib/aiProvider';
import { parseLooseJsonObject } from '@/lib/jsonUtils';

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConnectionStatus {
  success: boolean;
  enabled: boolean;
  ready: boolean;
  model: string;
  baseUrl: string;
  checkedAt: string;
  latencyMs?: number;
  message?: string;
  result?: string;
}

let connectionCache: AIConnectionStatus | null = null;
const CONNECTION_CACHE_TTL_MS = 60_000;

export function isAIEnabled(): boolean {
  return process.env.AI_ENABLED === 'true';
}

export async function isAIEnabledAsync(): Promise<boolean> {
  return (await getAppConfig()).aiEnabled;
}

export async function getAIConfig(): Promise<AIConfig> {
  const config = await getAppConfig();
  return {
    baseUrl: config.aiBaseUrl.replace(/\/$/, ''),
    apiKey: config.aiApiKey,
    model: config.aiModel,
    timeoutMs: config.aiTimeoutMs,
  };
}

export async function chat(messages: ChatMessage[], options: AIInvokeOptions = {}): Promise<string> {
  return (await chatWithMeta(messages, options)).content;
}

export async function chatWithMeta(messages: ChatMessage[], options: AIInvokeOptions = {}): Promise<{ content: string; provider: string; model: string }> {
  const result = await invokeAI(messages, options);
  return { content: result.content, provider: result.provider, model: result.model };
}

export async function checkAIConnection(options: { force?: boolean; timeoutMs?: number } = {}): Promise<AIConnectionStatus> {
  const now = Date.now();
  if (!options.force && connectionCache && now - Date.parse(connectionCache.checkedAt) < CONNECTION_CACHE_TTL_MS) {
    return connectionCache;
  }

  const [enabled, config] = await Promise.all([isAIEnabledAsync(), getAIConfig()]);
  if (!enabled) {
    connectionCache = {
      success: true,
      enabled: false,
      ready: false,
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString(),
      message: 'AI 未启用。',
    };
    return connectionCache;
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(options.timeoutMs || 8000, config.timeoutMs || 8000));

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: '请只回复“连接正常”。' },
          { role: 'user', content: '测试金陵工脉 AI 连接。' },
        ],
        temperature: 0,
        max_tokens: 12,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`${response.status} ${detail}`.trim());
    }

    const payload = await response.json();
    const result = String(payload?.choices?.[0]?.message?.content || '').trim();
    connectionCache = {
      success: true,
      enabled: true,
      ready: true,
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      result,
      message: 'AI 连接正常。',
    };
    return connectionCache;
  } catch (error) {
    connectionCache = {
      success: false,
      enabled: true,
      ready: false,
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      message: `AI 连接失败：${String(error)}`,
    };
    return connectionCache;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateSummary(text: string): Promise<string> {
  return chat([
    { role: 'system', content: '你是南京民族工业史料整理助手。请用中文给出客观、简洁、可核验的摘要。' },
    { role: 'user', content: `请摘要以下内容：\n\n${text}` },
  ]);
}

export async function generateExhibitionCopy(context: string): Promise<string> {
  return chat([
    { role: 'system', content: '你是云展览文案助手。请基于给定资料写展陈文案，不要编造史实。' },
    { role: 'user', content: context },
  ]);
}

export async function checkRiskExpression(
  text: string
): Promise<{ riskWords: string[]; suggestion: string }> {
  const result = await chat([
    {
      role: 'system',
      content: '你是史实表述风控助手。识别“第一、首创、最大、唯一”等高风险表述，并给出更稳妥的改写建议。用 JSON 返回：{"riskWords":[],"suggestion":""}。',
    },
    { role: 'user', content: text },
  ]);

  try {
    return JSON.parse(result);
  } catch {
    return { riskWords: [], suggestion: result };
  }
}

export async function generateEntityDescription(params: {
  name: string;
  entityType: 'site' | 'person';
  sourceContext: string;
  siteOptions?: string;
}): Promise<{
  description: string;
  category: string;
  entityType?: 'person' | 'organization' | 'unknown';
  historicalValue?: string;
  address?: string;
  years?: string;
  birthYear?: string;
  deathYear?: string;
  relatedSiteName?: string;
  missingFields?: string[];
}> {
  const { name, entityType, sourceContext, siteOptions } = params;
  const prompt = entityType === 'site'
    ? [
        '你是南京民族工业史料整理助手。请根据提供的史料，为以下企业遗址生成客观描述并推断行业分类。',
        '要求：',
        '1. 简介 description 只写历史背景、主营业务、发展脉络，不写价值判断。',
        '2. 历史价值 historicalValue 只写行业地位、工业遗产价值、社会影响。',
        '3. 地址 address、行业 category、存续年份 years 必须有史料依据，没有依据填空字符串。',
        '4. 不要编造无法由史料支撑的信息；缺失字段写入 missingFields。',
        '5. 行业尽量使用史料中的行业词，如化工、军工、纺织、铁路、电子、建材等。',
        '请只返回一个 JSON 对象，不要 Markdown 代码块：{"description":"","historicalValue":"","category":"","address":"","years":"","missingFields":[]}',
      ].join('\n')
    : [
        '你是南京民族工业史料整理助手。请根据提供的史料，为以下人物生成生平简介并推断身份角色。',
        '要求：',
        '1. 先判断名称类型 entityType：真实个人填 person；企业、工厂、商号、机构、学校、报刊、政府部门填 organization；无法判断填 unknown。',
        '2. 企业、工厂、商号、机构不能归为人物，entityType 必须为 organization。',
        '3. 若 entityType 不是 person，简介 description 只说明它不是人物条目候选，不要编造生平。',
        '4. 若为人物，简介应包含：生平、主要贡献、关联企业。仅基于史料，不编造。',
        '5. 身份 category 从以下选择：企业家、工程师、工人代表、管理人员、学者、官员、其他；非人物填机构/企业。',
        '6. 出生年份、逝世年份和关联企业必须能从史料中找到依据；没有依据时填空字符串。',
        '7. 关联企业 relatedSiteName 必须优先从可选企业名称中选择；没有匹配则填空字符串。',
        '8. 若史料信息不足，简介中注明"据现有史料初步整理"，身份选最接近的。',
        '请只返回一个 JSON 对象，不要 Markdown 代码块：{"entityType":"person","description":"","category":"企业家","birthYear":"","deathYear":"","relatedSiteName":"","missingFields":[]}',
      ].join('\n');

  const result = await chat([
    { role: 'system', content: prompt },
    { role: 'user', content: `名称：${name}\n\n可选企业名称：\n${siteOptions || '无'}\n\n相关史料：\n${sourceContext || '未找到直接相关的史料。请只输出可由史料支持的信息，不要凭空推测。'}` },
  ]);

  try {
    const parsed = parseLooseJsonObject(result);
    if (!parsed) throw new Error('No JSON object found');
    return {
      description: stringifyField(parsed.description || parsed.biography),
      category: stringifyField(parsed.category || parsed.role || parsed.title),
      entityType: normalizeEntityType(parsed.entityType),
      historicalValue: stringifyField(parsed.historicalValue),
      address: stringifyField(parsed.address),
      years: stringifyField(parsed.years),
      birthYear: stringifyField(parsed.birthYear),
      deathYear: stringifyField(parsed.deathYear),
      relatedSiteName: stringifyField(parsed.relatedSiteName || parsed.relatedSite || parsed.siteName),
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.map(String) : [],
    };
  } catch {
    return { description: result, category: '', entityType: 'unknown' };
  }
}

function normalizeEntityType(value: unknown): 'person' | 'organization' | 'unknown' {
  const text = stringifyField(value).toLowerCase();
  if (text === 'person' || text === '人物' || text === '个人') return 'person';
  if (text === 'organization' || text === 'org' || text === 'site' || text === '企业' || text === '机构') return 'organization';
  return 'unknown';
}

export function stringifyField(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[，,、\n]/).map(item => item.trim()).filter(Boolean);
  return [];
}

export function normalizeUnitScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  if (score > 1) return Math.max(0, Math.min(1, Math.round(score) / 100));
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function normalizeBrief(value: string): string {
  const compact = String(value || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^一句话结论[:：]\s*/, '')
    .trim();
  if (!compact || /^\{[\s\S]*\}$/.test(compact)) return '暂无结果';
  return compact.slice(0, 150);
}

export async function answerWithSources(question: string, sourceContext: string): Promise<string> {
  return chat([
    {
      role: 'system',
      content: [
        '你是“金陵工脉”南京民族工业史料库问答助手。',
        '必须优先依据“史料上下文”回答，不得编造史料中没有的年份、人物、地点、机构、事件或文献来源。',
        '如果史料上下文能支持结论，必须在相关句子后使用引用标记，格式为 [S1]、[S2]。',
        '同一句话可引用多个来源，格式如 [S1][S3]。',
        '如果史料上下文没有直接证据，应明确说明“当前史料库未检索到直接记载”，只能给出待核实方向，不得当作事实陈述。',
        '回答应使用中文，结构清晰，先给直接答案，再补充依据。',
        '回答末尾必须列出“参考文献”，只列实际引用过的史料。',
        '参考文献格式固定为：[S1] 题名｜可信等级：A/B/C｜类型：类型｜文件：文件名或“-”。',
        '如果没有可引用史料，参考文献写“无”。',
        '输出格式：\n直接答案：\n...\n\n依据说明：\n...\n\n参考文献：\n[S1] ...',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `用户问题：${question}\n\n史料上下文：\n${sourceContext}`,
    },
  ]);
}

export async function generateSearchBrief(params: {
  query: string;
  sourceContext: string;
}): Promise<string> {
  const result = await chat([
    {
      role: 'system',
      content: [
        '你是“金陵工脉”首页搜索的一句话史料总结助手。',
        '只依据史料上下文回答，不得补充背景、原因、推导或模型常识。',
        '只输出一句中文纯文本，不能有 JSON、标题、前缀、编号、引用列表或换行。',
        '总长度不超过150个汉字。',
        '如果史料上下文没有直接匹配，或者信息不足以形成结论，只输出：暂无结果',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `搜索关键词：${params.query}\n\n史料上下文：\n${params.sourceContext}`,
    },
  ], { timeoutMs: 2500, maxTokens: 96, allowCloudFallback: false });

  return normalizeBrief(result);
}

export async function generateDeepSearchAnalysis(params: {
  query: string;
  sourceContext: string;
  aiTokenContext: string;
}): Promise<{
  summary: string;
  keywords: string[];
  entities: string[];
  analysis: string;
  confidence: number;
  evidence: Array<{ sourceId: string; title: string; quote: string; ref: string }>;
}> {
  const result = await chat([
    {
      role: 'system',
      content: [
        '你是“金陵工脉”史料深度解读助手。',
        '信息优先级必须是：1. 史料库上下文；2. aiToken 摘要、标签、实体；3. 模型推理。',
        '必须明确区分“已有史料内容”和“AI推断内容”。',
        '没有史料直接支撑的内容只能放入 AI 推断，并说明待核验，不得当作事实。',
        '如果没有直接史料，summary 必须包含“当前史料库未检索到直接记载”。',
        '只返回 JSON 对象，不要 Markdown 代码块。',
        '格式：{"summary":"","keywords":[],"entities":[],"analysis":"","confidence":0,"evidence":[{"sourceId":"","title":"","quote":"","ref":"S1"}]}',
        'confidence 使用 0-1 小数。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `用户问题：${params.query}`,
        '史料库上下文：',
        params.sourceContext || '未检索到相关史料。',
        'aiToken 上下文：',
        params.aiTokenContext || '未检索到相关 aiToken。',
      ].join('\n\n'),
    },
  ], { timeoutMs: 8000, maxTokens: 1800, allowCloudFallback: true });

  const parsed = parseLooseJsonObject(result);
  const value = parsed || {};
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  return {
    summary: stringifyField(value.summary) || (params.sourceContext ? '' : '当前史料库未检索到直接记载。'),
    keywords: normalizeArray(value.keywords),
    entities: normalizeArray(value.entities),
    analysis: parsed ? stringifyField(value.analysis || value.content) : stringifyField(result),
    confidence: normalizeUnitScore(value.confidence),
    evidence: evidence.map((item: any) => ({
      sourceId: stringifyField(item.sourceId),
      title: stringifyField(item.title),
      quote: stringifyField(item.quote),
      ref: stringifyField(item.ref),
    })).filter((item: any) => item.sourceId || item.title || item.quote).slice(0, 8),
  };
}

export async function generateSourceSummary(params: {
  title: string;
  fileType: string;
  grade: string;
  text: string;
}): Promise<{ summary: string; keywords: string[]; coverage: string; missingNote: string }> {
  const result = await chat([
    {
      role: 'system',
      content: [
        '你是南京民族工业史料库编目助手。',
        '请只依据输入文本为史料生成简述，用于后续检索和文献参考。短文本精炼至200-500字，长文本（如docx/PDF全文）可扩展至2000字。',
        '不要补写文本没有的信息，不要做夸张评价。',
        '只返回 JSON 对象，不要 Markdown 代码块：{"summary":"","keywords":[],"coverage":"","missingNote":""}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `题名：${params.title}`,
        `文件类型：${params.fileType}`,
        `可信等级：${params.grade}`,
        '文本摘录：',
        params.text.slice(0, 12000),
      ].join('\n\n'),
    },
  ]);

  const parsed = parseLooseJsonObject(result);
  if (!parsed) return { summary: result.slice(0, 500), keywords: [], coverage: '', missingNote: '' };
  return {
    summary: stringifyField(parsed.summary).slice(0, 2000),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String).filter(Boolean) : [],
    coverage: stringifyField(parsed.coverage),
    missingNote: stringifyField(parsed.missingNote),
  };
}

export async function generateCreativeWriting(params: {
  topic: string;
  targetType: string;
  style: string;
  length: string;
  sourceContext: string;
}): Promise<{ title: string; content: string; references: string }> {
  const result = await chat([
    {
      role: 'system',
      content: [
        '你是“金陵工脉”展陈写作助手，擅长把南京民族工业史料转化为公众可读文本。',
        '必须基于史料上下文写作，事实句使用 [S1]、[S2] 引用编号。',
        '可以有文学化表达，但不得新增未经史料支持的事实。',
        '末尾必须列“参考文献”，格式：[S1] 题名｜可信等级：A/B/C｜类型：类型｜文件：文件名或“-”。',
        '',
        '【输出格式严格要求】',
        '1. 只输出一个 JSON 对象，不要任何 Markdown 代码块（不要 ```json）。',
        '2. JSON 字段：{"title": "标题文本", "content": "正文文本", "references": "参考文献文本"}',
        '3. content 字段必须是纯正文文本，不要嵌套 JSON，不要再包含 title/references 字段。',
        '4. 所有字符串内的双引号用 \\" 转义，换行用 \\n。',
        '5. 不要输出任何 JSON 之外的解释性文字。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `主题：${params.topic}`,
        `对象类型：${params.targetType}`,
        `写作风格：${params.style}`,
        `篇幅：${params.length}`,
        '史料上下文：',
        params.sourceContext,
      ].join('\n\n'),
    },
  ]);

  const parsed = parseLooseJsonObject(result);
  if (!parsed) {
    const lines = result.split('\n').map(line => line.trim()).filter(Boolean);
    const titleMatch = result.match(/(?:标题|题目|title)[：:]\s*(.+)/i);
    return {
      title: titleMatch ? titleMatch[1].trim() : (lines[0] || params.topic),
      content: result,
      references: '',
    };
  }
  let contentField = stringifyField(parsed.content);
  const nestedParsed = parseLooseJsonObject(contentField);
  if (nestedParsed && (nestedParsed.content || nestedParsed.title || nestedParsed.summary)) {
    contentField = stringifyField(nestedParsed.content || nestedParsed.summary) || contentField;
  }
  return {
    title: stringifyField(parsed.title) || params.topic,
    content: contentField,
    references: stringifyField(parsed.references),
  };
}

/** AI讲解信息链：输入链路数据，输出通顺的中文叙事 */
export async function narrateChain(chain: {
  nodes: Array<{ title: string; summary: string }>;
  edges: Array<{ relationType: string; confidence: number; reason: string }>;
}): Promise<string> {
  if (chain.nodes.length < 2) return '链路节点不足，无法生成讲解。';

  const parts = chain.nodes.map((n, i) => `[节点${i + 1}] ${n.title}: ${n.summary || ''}`).join('\n');
  const edgeDescs = chain.edges.map((e, i) =>
    `关联${i + 1}: ${e.relationType} (置信度${Math.round(e.confidence * 100)}%) - ${e.reason}`
  ).join('\n');

  try {
    return await chat([
      {
        role: 'system',
        content: '你是金陵工脉史料解说助手。根据给定的史料链路（节点+关联关系），用一段流畅的中文叙事解释这些史料之间的关联逻辑。不要编造新事实。150-300字。',
      },
      {
        role: 'user',
        content: `史料节点:\n${parts}\n\n关联关系:\n${edgeDescs}\n\n请解释这些史料之间的关联逻辑。`,
      },
    ]);
  } catch {
    return '当前无法生成AI讲解，请查看链路图了解史料关联。';
  }
}
