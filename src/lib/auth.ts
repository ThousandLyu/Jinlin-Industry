import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/appConfig';
import { authenticateUser } from '@/lib/userAccounts';
import { db } from '@/lib/dataService';
import type { UserAccount } from '@/types';

export function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token');
  return token?.value === 'authenticated';
}

export function requireAuth(request: NextRequest): NextResponse | null {
  if (checkAuth(request)) return null;
  return NextResponse.json(
    { success: false, message: 'Unauthorized. Please log in to the admin panel.' },
    { status: 401 }
  );
}

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const credentials = await getAdminCredentials();
    if (!username || !password) return false;
    if (credentials && username === credentials.username && password === credentials.password) return true;
    return Boolean(await authenticateUser(username, password, 'admin'));
  } catch (error) {
    console.error('[AUTH] Login failed:', error);
    return false;
  }
}

export async function getCurrentAdminProfile(username?: string): Promise<{
  username: string;
  role: 'admin';
  name: string;
  gender?: string;
  phone: string;
  email: string;
}> {
  const config = await getAppConfig();
  const users = await db.users.getAll();
  const loginName = username || config.adminUsername;
  const account = users.find((user: UserAccount) => user.role === 'admin' && user.username === loginName);
  return {
    username: loginName,
    role: 'admin',
    name: account?.name || config.adminName || loginName,
    gender: account?.gender || config.adminGender,
    phone: account?.phone || config.adminPhone,
    email: account?.email || config.adminEmail,
  };
}

export async function getAdminCredentials(): Promise<{ username: string; password: string } | null> {
  const config = await getAppConfig();
  if (!config.adminUsername || !config.adminPassword) {
    console.error('[AUTH] Admin username or password is not configured.');
    return null;
  }
  return { username: config.adminUsername, password: config.adminPassword };
}

export function adminCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_token=authenticated; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secure}`;
}

export function adminUserCookieHeader(username: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_user=${encodeURIComponent(username)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secure}`;
}

export function clearAdminCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function clearAdminUserCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_user=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
