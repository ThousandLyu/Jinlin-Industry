import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getQueueStatus, runQueue, clearQueue } from '@/lib/aiScheduler';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const status = await getQueueStatus();
  return NextResponse.json({ success: true, ...status });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === 'clear') {
      await clearQueue();
      return NextResponse.json({ success: true, message: '队列已清空' });
    }
    // 默认: 手动触发执行队列
    const result = await runQueue();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
