import { NextRequest, NextResponse } from 'next/server';
import { generateCreativeWriting, isAIEnabledAsync } from '@/lib/aiClient';
import { buildSourceContext, searchSourceLibrary } from '@/lib/sourceSearch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = String(body.topic || '').trim();
    if (!topic) {
      return NextResponse.json({ success: false, message: '请提供创作主题。' }, { status: 400 });
    }

    const sources = await searchSourceLibrary(topic, 6);
    const sourceContext = buildSourceContext(sources);
    const enabled = await isAIEnabledAsync();
    if (!enabled) {
      return NextResponse.json({
        success: false,
        enabled: false,
        message: 'AI 未启用，暂不能生成文本；已返回可参考史料。',
        sources,
        sourceContext,
      });
    }

    const result = await generateCreativeWriting({
      topic,
      targetType: String(body.targetType || '关键词'),
      style: String(body.style || '展厅导览词'),
      length: String(body.length || '短文'),
      sourceContext,
    });

    return NextResponse.json({ success: true, enabled: true, ...result, sources });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'AI 创作失败', error: String(error) }, { status: 500 });
  }
}
