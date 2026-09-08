import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/dataService';
import type { MediaFile } from '@/types';

const UPLOAD_DIR_MAP: Record<string, string> = {
  images: 'public/uploads/images',
  courses: 'public/uploads/courses',
  documents: 'public/uploads/documents',
  scenes: 'public/uploads/scenes',
};

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = request.nextUrl.searchParams.get('type') || 'images';

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file selected' }, { status: 400 });
    }

    const uploadDir = UPLOAD_DIR_MAP[type] || UPLOAD_DIR_MAP.images;
    const fullDir = path.join(process.cwd(), uploadDir);
    await mkdir(fullDir, { recursive: true });

    const ext = path.extname(file.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(fullDir, fileName);
    await writeFile(filePath, buffer);

    const url = `/${uploadDir.replace(/\\/g, '/').replace('public/', '')}/${fileName}`;
    const media = await db.media.create({
      originalName: file.name,
      fileName,
      url,
      type: toMediaType(type, file.type),
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      category: 'web',
    });

    return NextResponse.json({ success: true, url, fileName, originalName: file.name, media });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Upload failed', error: String(error) },
      { status: 500 }
    );
  }
}

function toMediaType(type: string, mimeType: string): MediaFile['type'] {
  if (type === 'courses') return 'course';
  if (type === 'documents') return 'document';
  if (type === 'scenes') return 'scene';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}
