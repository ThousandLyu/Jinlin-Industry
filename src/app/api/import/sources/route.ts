import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminCredentials } from '@/lib/auth';
import { importSourcesFromFolder } from '@/lib/sourceImport';
import { getAppConfig } from '@/lib/appConfig';

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const credentials = await getAdminCredentials();
    const config = await getAppConfig();
    const importedBy = typeof body.importedBy === 'string' && body.importedBy.trim()
      ? body.importedBy.trim()
      : credentials?.username || 'admin';

    const result = await importSourcesFromFolder({ importedBy, baseDir: config.sourceImportDir });
    return NextResponse.json({ success: true, ...result, pendingReview: result.imported });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Source import failed', error: String(error) },
      { status: 500 }
    );
  }
}
