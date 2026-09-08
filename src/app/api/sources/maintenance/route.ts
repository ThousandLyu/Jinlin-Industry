import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/dataService';
import { generateAndSaveSourceSummary, retrySourceExtraction } from '@/lib/sourceMaintenance';

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const action = String(body.action || '');
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    if (!action || ids.length === 0) {
      return NextResponse.json({ success: false, message: '缺少 action 或 ids' }, { status: 400 });
    }

    const sources = await db.sources.getAll();
    const selected = sources.filter((source) => ids.includes(source.id));
    const results = [];

    for (const source of selected) {
      if (action === 'extract') {
        results.push(await retrySourceExtraction(source));
      } else if (action === 'summary') {
        results.push(await generateAndSaveSourceSummary(source));
      } else if (action === 'extract_and_summary') {
        const extracted = await retrySourceExtraction(source);
        results.push(await generateAndSaveSourceSummary(extracted));
      } else {
        return NextResponse.json({ success: false, message: '未知操作' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, count: results.length, items: results });
  } catch (error) {
    return NextResponse.json({ success: false, message: '史料维护失败', error: String(error) }, { status: 500 });
  }
}
