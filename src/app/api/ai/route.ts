import { NextRequest, NextResponse } from 'next/server';
import {
  answerWithSources,
  generateSummary,
  generateExhibitionCopy,
  checkRiskExpression,
  generateEntityDescription,
  checkAIConnection,
  getAIConfig,
  isAIEnabledAsync,
  generateCreativeWriting,
  chat,
} from '@/lib/aiClient';
import { requireAuth } from '@/lib/auth';
import { buildSourceContext, searchSourceLibrary } from '@/lib/sourceSearch';
import { db } from '@/lib/dataService';
import { analyzeSourceDocument, classifySourceDocument, recommendRelatedTargets } from '@/lib/aiActions';
import { readExtractedSourceText } from '@/lib/sourceTextExtractor';
import { rebuildAiToken, rebuildSubmissionToken, searchAiTokens, upsertAiToken } from '@/lib/aiTokenService';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const [enabled, config] = await Promise.all([isAIEnabledAsync(), getAIConfig()]);
    return NextResponse.json({
      success: true,
      enabled,
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, enabled: false, message: 'AI 状态检测失败', error: String(error), checkedAt: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { action, text } = body;
    const input = typeof text === 'string' ? text : '';

    switch (action) {
      case 'ask':
      case 'source_qa': {
        const sources = await searchSourceLibrary(input, Number(body.limit || 6));
        const sourceContext = buildSourceContext(sources);
        const enabled = await isAIEnabledAsync();

        if (!enabled) {
          return NextResponse.json({
            enabled: false,
            message: 'AI 未启用，本次仅返回史料库检索结果；配置 AI_ENABLED=true 后才会生成对话回答。',
            sources,
            sourceContext,
          });
        }

        const answer = await answerWithSources(input, sourceContext);
        return NextResponse.json({ enabled: true, answer, sources });
      }
      case 'search_sources': {
        const sources = await searchSourceLibrary(input, Number(body.limit || 10));
        return NextResponse.json({
          enabled: await isAIEnabledAsync(),
          sources,
          sourceContext: buildSourceContext(sources),
        });
      }
      case 'summary': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法生成摘要。' });
        const result = await generateSummary(input);
        return NextResponse.json({ success: true, enabled: true, result });
      }
      case 'exhibition': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法生成展陈文案。' });
        const result = await generateExhibitionCopy(input);
        return NextResponse.json({ success: true, enabled: true, result });
      }
      case 'course_script': {
        return NextResponse.json({
          success: false,
          enabled: await isAIEnabledAsync(),
          message: '按当前架构约束，courses 模块不接入 AI。',
          result: { summary: 'courses 模块不接入 AI', keywords: [], entities: [] },
        });
      }
      case 'risk_check': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法进行 AI 风险检查。' });
        const result = await checkRiskExpression(input);
        return NextResponse.json({ success: true, enabled: true, result });
      }
      case 'test_connection': {
        const result = await checkAIConnection({ force: true, timeoutMs: 10000 });
        return NextResponse.json(result);
      }
      case 'source_summary': {
        const { id } = body;
        if (!id) return NextResponse.json({ success: false, message: '缺少史料 ID' }, { status: 400 });
        const source = await db.sources.getById(String(id));
        if (!source) return NextResponse.json({ success: false, message: '史料不存在' }, { status: 404 });
        const { generateAndSaveSourceSummary } = await import('@/lib/sourceMaintenance');
        const updated = await generateAndSaveSourceSummary(source);
        const token = (await searchAiTokens(updated.title || updated.fileName || '', 10)).find(item => item.targetType === 'source' && item.targetId === updated.id);
        return NextResponse.json({
          success: true,
          item: updated,
          result: {
            summary: updated.aiSummary || updated.description || token?.summary || '',
            keywords: token?.keywords || [],
            entities: token?.entities || [],
          },
          token,
        });
      }
      case 'source_parse': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法解析史料。', result: { summary: '', keywords: [], entities: [] } });
        const source = body.id ? await db.sources.getById(String(body.id)) : null;
        const textForParse = source ? await readExtractedSourceText(source, 16000) : input;
        if (!textForParse.trim()) return NextResponse.json({ success: false, message: '缺少可解析文本' }, { status: 400 });
        const result = await analyzeSourceDocument({
          title: source?.title || String(body.title || '未命名史料'),
          fileType: source?.sourceFileKind || source?.fileType || String(body.fileType || 'other'),
          grade: source?.credibilityLevel || String(body.grade || 'C'),
          text: textForParse,
        });
        const token = source ? await upsertAiToken({ targetType: 'source', targetId: source.id, result, sourceIds: [source.id] }) : null;
        return NextResponse.json({ success: true, result: pickStructured(result), token });
      }
      case 'source_classify': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法自动分类。', result: { summary: '', keywords: [], entities: [] } });
        const source = body.id ? await db.sources.getById(String(body.id)) : null;
        const textForClassify = source ? await readExtractedSourceText(source, 10000) : input;
        const result = await classifySourceDocument({
          title: source?.title || String(body.title || '未命名史料'),
          description: source?.aiSummary || source?.description || String(body.description || ''),
          text: textForClassify,
        });
        const token = source ? await upsertAiToken({ targetType: 'source', targetId: source.id, result, sourceIds: [source.id] }) : null;
        return NextResponse.json({ success: true, result: pickStructured(result), token });
      }
      case 'source_recommend': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法推荐关联。', result: { summary: '', keywords: [], entities: [] } });
        const [sites, people, facts] = await Promise.all([db.sites.getAll(), db.people.getAll(), db.facts.getAll()]);
        const candidates = [
          ...sites.map((item: any) => `site:${item.id}｜${item.name}｜${item.industry || ''}`),
          ...people.map((item: any) => `person:${item.id}｜${item.name}｜${item.role || item.title || ''}`),
          ...facts.map((item: any) => `fact:${item.id}｜${item.title}｜${item.category || ''}`),
        ].join('\n');
        const result = await recommendRelatedTargets({ query: input || String(body.query || ''), candidates });
        return NextResponse.json({ success: true, result: pickStructured(result) });
      }
      case 'submission_review': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法校验投稿。', result: { summary: '', keywords: [], entities: [] } });
        const id = String(body.id || '');
        const submission = id ? await db.sourceSubmissions.getById(id) : null;
        if (!submission) return NextResponse.json({ success: false, message: '投稿不存在' }, { status: 404 });
        const { token, result } = await rebuildSubmissionToken(submission, { force: true });
        const updated = await db.sourceSubmissions.update(submission.id, {
          aiReviewStatus: 'success',
          aiReviewSummary: result.summary,
          aiKeywords: result.keywords,
          aiEntities: result.entities,
          confidenceScore: result.confidenceScore,
          isCredible: result.isCredible,
          doubts: result.doubts || [],
          errorPositions: result.errorPositions || [],
          aiReviewUpdatedAt: new Date().toISOString(),
        } as any);
        return NextResponse.json({ success: true, item: updated, result: pickStructured(result), token });
      }
      case 'aitoken_rebuild': {
        const targetType = String(body.targetType || '');
        const targetId = String(body.targetId || body.id || '');
        if (!targetType || !targetId) return NextResponse.json({ success: false, message: '缺少 targetType 或 targetId' }, { status: 400 });
        const token = await rebuildAiToken(targetType, targetId);
        return NextResponse.json({ success: true, token, result: { summary: token.summary, keywords: token.keywords, entities: token.entities } });
      }
      case 'aitoken_search': {
        const tokens = await searchAiTokens(input || String(body.q || ''), Number(body.limit || 10));
        return NextResponse.json({ success: true, tokens, result: { summary: `检索到 ${tokens.length} 条 aiToken`, keywords: [], entities: [] } });
      }
      case 'creative_writing': {
        const topic = String(body.topic || text || '').trim();
        if (!topic) return NextResponse.json({ success: false, message: '请提供主题' }, { status: 400 });
        const enabled = await isAIEnabledAsync();
        if (!enabled) return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用，无法生成创作文本。' });
        const sources = await searchSourceLibrary(topic, 6);
        const result = await generateCreativeWriting({
          topic,
          targetType: String(body.targetType || '关键词'),
          style: String(body.style || '展厅导览词'),
          length: String(body.length || '短文'),
          sourceContext: buildSourceContext(sources),
        });
        return NextResponse.json({ success: true, enabled: true, ...result, sources });
      }
      case 'organize_timeline': {
        const enabled = await isAIEnabledAsync();
        if (!enabled) {
          return NextResponse.json({
            success: false,
            enabled: false,
            message: 'AI 未启用，未生成时间轴候选事件。',
          });
        }

        const [sources, timeline] = await Promise.all([db.sources.getAll(), db.timeline.getAll()]);
        const categories = Array.from(new Set(timeline.map((item: any) => item.category).filter(Boolean)));
        const sourceDigest = sources.slice(0, 60).map((source: any, index) => {
          return [
            `S${index + 1}`,
            `id=${source.id}`,
            `title=${source.title || source.fileName || '未命名史料'}`,
            `grade=${source.credibilityLevel || source.grade || 'C'}`,
            `desc=${String(source.description || '').slice(0, 220)}`,
          ].join(' | ');
        }).join('\n');
        const existingDigest = timeline.map((item: any) => `${item.year} ${item.title}`).join('\n');
        const raw = await chat([
          {
            role: 'system',
            content: [
              '你是南京工业遗产史料编目助手。',
              '请只基于输入史料生成当前时间轴缺失的候选事件。',
              '不要编造无法由史料支撑的信息。',
              '分类必须从给定分类中选择，不得新增分类。',
              '只返回 JSON 数组，每项格式：{"year":1900,"title":"","description":"","category":"","sourceIds":[""],"aiRationale":""}。',
              '最多返回 8 条。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `现有分类：${categories.join('、') || '政策'}`,
              '现有时间轴：',
              existingDigest || '暂无',
              '史料摘要：',
              sourceDigest || '暂无史料',
            ].join('\n\n'),
          },
        ]);

        const candidates = parseTimelineCandidates(raw, categories);
        const existingKeys = new Set(timeline.map((item: any) => `${Number(item.year)}:${String(item.title || '').trim()}`));
        const created = [];
        for (const candidate of candidates) {
          const key = `${candidate.year}:${candidate.title.trim()}`;
          if (existingKeys.has(key)) continue;
          const item = await db.timeline.create({
            year: candidate.year,
            title: candidate.title.trim(),
            description: candidate.description.trim(),
            category: candidate.category,
            importance: 3,
            image: '',
            siteIds: [],
            sourceIds: candidate.sourceIds,
            reviewStatus: 'pending',
            isPublished: false,
            generatedByAI: true,
            aiRationale: candidate.aiRationale,
          } as any);
          created.push(item);
          existingKeys.add(key);
        }
        return NextResponse.json({ success: true, enabled: true, created, skipped: candidates.length - created.length });
      }
      case 'generate_description': {
        const { name, entityType } = body;
        if (!name || !entityType) {
          return NextResponse.json(
            { success: false, message: '缺少 name 或 entityType 参数' },
            { status: 400 }
          );
        }
        const enabled = await isAIEnabledAsync();
        if (!enabled) {
          return NextResponse.json({ success: false, enabled: false, message: 'AI 未启用' });
        }

        const topSources = await searchSourceLibrary(name, 10);
        const sourceContext = buildSourceContext(topSources);

        const sites = entityType === 'person' ? await db.sites.getAll() : [];
        const siteOptions = sites.map((site: any) => `${site.id}｜${site.name}`).join('\n');
        const result = await generateEntityDescription({ name, entityType, sourceContext, siteOptions });
        const matchedSite = result.relatedSiteName
          ? sites.find((site: any) => normalizeName(site.name) === normalizeName(result.relatedSiteName || '') || normalizeName(result.relatedSiteName || '').includes(normalizeName(site.name)))
          : null;
        return NextResponse.json({
          success: true,
          enabled: true,
          description: result.description,
          entityType: result.entityType || 'unknown',
          historicalValue: result.historicalValue || '',
          category: result.category,
          address: result.address || '',
          years: result.years || '',
          biography: result.description,
          role: result.category,
          birthYear: result.birthYear || '',
          deathYear: result.deathYear || '',
          relatedSiteId: matchedSite?.id || '',
          relatedSiteName: matchedSite?.name || result.relatedSiteName || '',
          missingFields: result.missingFields || [],
          sourceCount: topSources.length,
          sources: topSources,
        });
      }
      default:
        return NextResponse.json(
          { success: false, message: 'Unknown action. Use ask, search_sources, source_parse, source_summary, source_classify, source_recommend, submission_review, aitoken_rebuild, aitoken_search, summary, exhibition, risk_check, test_connection, organize_timeline, or generate_description.' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'AI request failed', error: String(error) },
      { status: 500 }
    );
  }
}

function parseTimelineCandidates(raw: string, categories: string[]) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  let parsed: any = [];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  }
  const fallbackCategory = categories[0] || '政策';
  const allowed = new Set(categories.length ? categories : [fallbackCategory]);
  return (Array.isArray(parsed) ? parsed : [])
    .map((item) => ({
      year: Number(item.year),
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      category: allowed.has(String(item.category || '')) ? String(item.category) : fallbackCategory,
      sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds.map(String).filter(Boolean) : [],
      aiRationale: String(item.aiRationale || 'AI 根据史料摘要整理，需人工审核。').trim(),
    }))
    .filter((item) => Number.isFinite(item.year) && item.year > 0 && item.title && item.description)
    .slice(0, 8);
}

function normalizeName(value: string) {
  return String(value || '').replace(/\s+/g, '').replace(/[（）()旧址厂公司集团有限责任]/g, '').toLowerCase();
}

function pickStructured(result: any) {
  return {
    summary: result?.summary || '',
    keywords: Array.isArray(result?.keywords) ? result.keywords : [],
    entities: Array.isArray(result?.entities) ? result.entities : [],
    tags: Array.isArray(result?.tags) ? result.tags : [],
    traits: Array.isArray(result?.traits) ? result.traits : [],
    category: result?.category || '',
    confidenceScore: result?.confidenceScore,
    isCredible: result?.isCredible,
    doubts: Array.isArray(result?.doubts) ? result.doubts : [],
    errorPositions: Array.isArray(result?.errorPositions) ? result.errorPositions : [],
    relatedTargetIds: Array.isArray(result?.relatedTargetIds) ? result.relatedTargetIds : [],
    content: result?.content || '',
    references: result?.references || '',
  };
}
