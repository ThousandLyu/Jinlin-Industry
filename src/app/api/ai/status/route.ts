import { NextRequest, NextResponse } from 'next/server';
import { checkAIConnection, getAIConfig, isAIEnabledAsync } from '@/lib/aiClient';

export async function GET(request: NextRequest) {
  const probe = request.nextUrl.searchParams.get('probe') === '1';

  try {
    if (probe) {
      const status = await checkAIConnection({ timeoutMs: 8000 });
      return NextResponse.json(status);
    }

    const [enabled, config] = await Promise.all([isAIEnabledAsync(), getAIConfig()]);
    return NextResponse.json({
      success: true,
      enabled,
      ready: false,
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString(),
      message: enabled ? 'AI 已启用，等待连接探测。' : 'AI 未启用。',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      enabled: false,
      ready: false,
      model: '',
      baseUrl: '',
      checkedAt: new Date().toISOString(),
      message: `AI 状态检测失败：${String(error)}`,
    }, { status: 500 });
  }
}
