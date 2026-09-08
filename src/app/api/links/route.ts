import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/dataService';
import type { SourceLink } from '@/types';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const links = await db.sourceLinks.getAll();
  return NextResponse.json({ success: true, links });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const { id, action, ...data } = body;

    if (action === 'approve' && id) {
      const updated = await db.sourceLinks.update(id, { isApproved: true, isEdited: true } as Partial<SourceLink>);
      return NextResponse.json({ success: true, link: updated });
    }
    if (action === 'reject' && id) {
      const updated = await db.sourceLinks.update(id, { isApproved: false, isEdited: true } as Partial<SourceLink>);
      return NextResponse.json({ success: true, link: updated });
    }
    if (action === 'edit' && id) {
      const updated = await db.sourceLinks.update(id, { ...data, isEdited: true } as Partial<SourceLink>);
      return NextResponse.json({ success: true, link: updated });
    }
    if (action === 'create') {
      const link = await db.sourceLinks.create({
        ...data,
        isApproved: true,
        isEdited: true,
        confidence: 1.0,
        aiReason: '人工创建',
      } as Omit<SourceLink, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>);
      return NextResponse.json({ success: true, link });
    }

    return NextResponse.json({ success: false, message: '未知操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '需要 id' }, { status: 400 });

  await db.sourceLinks.update(id, { isDeleted: true } as Partial<SourceLink>);
  return NextResponse.json({ success: true });
}
