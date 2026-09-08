import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/dataService';
import { isAIEnabledAsync } from '@/lib/aiClient';
import { rebuildSubmissionToken } from '@/lib/aiTokenService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const contact = String(body.contact || '').trim();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const source = String(body.source || '').trim();
    const fileUrl = String(body.fileUrl || '').trim();

    if (!name || !contact || !title || !content || !source) {
      return NextResponse.json(
        { success: false, message: '请填写姓名、联系方式、史料标题、具体史料和来源。' },
        { status: 400 }
      );
    }

    let item = await db.sourceSubmissions.create({
      name,
      contact,
      title,
      content,
      source,
      fileUrl,
      status: 'pending',
      adminNote: '',
      convertedSourceId: '',
      aiReviewStatus: 'pending',
    });

    if (await isAIEnabledAsync()) {
      try {
        const { result } = await rebuildSubmissionToken(item);
        item = (await db.sourceSubmissions.update(item.id, {
          aiReviewStatus: 'success',
          aiReviewSummary: result.summary,
          aiKeywords: result.keywords,
          aiEntities: result.entities,
          confidenceScore: result.confidenceScore,
          isCredible: result.isCredible,
          doubts: result.doubts || [],
          errorPositions: result.errorPositions || [],
          aiReviewUpdatedAt: new Date().toISOString(),
        } as any)) || item;
      } catch {
        item = (await db.sourceSubmissions.update(item.id, { aiReviewStatus: 'failed' } as any)) || item;
      }
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '投稿提交失败', error: String(error) },
      { status: 500 }
    );
  }
}
