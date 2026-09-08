import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSummaryCoverage, ensureAllSummaries } from '@/lib/sumaryStore';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') === 'ensure') {
    const result = await ensureAllSummaries();
    return NextResponse.json({ success: true, ...result });
  }

  const stats = await getSummaryCoverage();
  return NextResponse.json({ success: true, ...stats });
}
