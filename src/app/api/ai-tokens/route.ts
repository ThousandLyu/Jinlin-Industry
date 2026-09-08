import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/dataService';
import { listAiTokens, rebuildAiToken, updateAiToken } from '@/lib/aiTokenService';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    const item = await db.aiTokens.getById(id);
    if (!item) return NextResponse.json({ success: false, message: 'aiToken 不存在' }, { status: 404 });
    return NextResponse.json({ success: true, item });
  }

  const items = await listAiTokens({
    q: searchParams.get('q') || '',
    targetType: searchParams.get('targetType') || '',
  });
  return NextResponse.json({ success: true, items });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  if (body.action === 'rebuild') {
    const targetType = String(body.targetType || '');
    const targetId = String(body.targetId || '');
    if (!targetType || !targetId) {
      return NextResponse.json({ success: false, message: '缺少 targetType 或 targetId' }, { status: 400 });
    }
    const token = await rebuildAiToken(targetType, targetId);
    return NextResponse.json({ success: true, item: token });
  }

  const id = String(body.id || '');
  if (!id) return NextResponse.json({ success: false, message: '缺少 aiToken ID' }, { status: 400 });
  const updated = await updateAiToken(id, body.data || {});
  if (!updated) return NextResponse.json({ success: false, message: 'aiToken 不存在' }, { status: 404 });
  return NextResponse.json({ success: true, item: updated });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ success: false, message: '缺少 aiToken ID' }, { status: 400 });
  await db.aiTokens.delete(id);
  return NextResponse.json({ success: true });
}
