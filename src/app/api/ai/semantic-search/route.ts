import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchSources, semanticSearchAll } from '@/lib/semanticSearch';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limit = Math.min(50, Number(searchParams.get('limit')) || 10);
  const all = searchParams.get('all') === 'true';

  if (!q.trim()) {
    return NextResponse.json({ success: true, results: [], people: [], sites: [] });
  }

  if (all) {
    const data = await semanticSearchAll(q, limit);
    return NextResponse.json({ success: true, ...data });
  }

  const results = await semanticSearchSources(q, limit);
  return NextResponse.json({ success: true, results });
}
