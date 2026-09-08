import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { detectConflicts, batchDetectConflicts } from '@/lib/conflictDetector';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('sourceId');
  if (sourceId) {
    const report = await detectConflicts(sourceId);
    return NextResponse.json({ success: true, report });
  }
  return NextResponse.json({ success: false, message: '需要 sourceId 参数' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const sourceIds: string[] = Array.isArray(body.sourceIds) ? body.sourceIds : [];
    if (sourceIds.length === 0) {
      return NextResponse.json({ success: false, message: '需要 sourceIds 数组' }, { status: 400 });
    }
    const reports = await batchDetectConflicts(sourceIds);
    return NextResponse.json({ success: true, reports });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
