import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { discoverLinks, batchDiscoverLinks } from '@/lib/linkService';

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const sourceId = body.sourceId as string;

    if (sourceId) {
      const links = await discoverLinks(sourceId);
      return NextResponse.json({ success: true, links, found: links.length });
    }

    // 全库扫描
    const result = await batchDiscoverLinks();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
