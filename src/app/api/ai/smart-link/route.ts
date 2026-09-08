import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suggestLinks } from '@/lib/smartLinking';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('sourceId');
  if (!sourceId) {
    return NextResponse.json({ success: false, message: '需要 sourceId 参数' }, { status: 400 });
  }

  try {
    const result = await suggestLinks(sourceId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
