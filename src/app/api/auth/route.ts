import { NextRequest, NextResponse } from 'next/server';
import { adminCookieHeader, adminUserCookieHeader, clearAdminCookieHeader, clearAdminUserCookieHeader, getCurrentAdminProfile, login } from '@/lib/auth';
import { checkLoginRateLimit, clearLoginRateLimit, recordFailedLogin } from '@/lib/rateLimit';

const LOGIN_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const rateLimit = checkLoginRateLimit(request, username);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `登录失败次数过多，请 ${Math.ceil(rateLimit.retryAfterSeconds / 60)} 分钟后再试`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    if (await withTimeout(login(username, password), LOGIN_TIMEOUT_MS)) {
      clearLoginRateLimit(request, username);
      const response = NextResponse.json({ success: true, message: 'Login successful' });
      response.headers.set('Set-Cookie', adminCookieHeader());
      response.headers.append('Set-Cookie', adminUserCookieHeader(username));
      return response;
    }

    recordFailedLogin(request, username);

    return NextResponse.json(
      { success: false, message: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'LOGIN_TIMEOUT') {
      return NextResponse.json(
        { success: false, message: '登录验证超时，请稍后重试' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token');
  const authenticated = token?.value === 'authenticated';
  if (!authenticated) return NextResponse.json({ authenticated });
  const username = request.cookies.get('admin_user')?.value;
  return NextResponse.json({ authenticated, ...(await getCurrentAdminProfile(username ? decodeURIComponent(username) : undefined)) });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearAdminCookieHeader());
  response.headers.append('Set-Cookie', clearAdminUserCookieHeader());
  return response;
}
