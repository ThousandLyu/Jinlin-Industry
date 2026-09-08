import crypto from 'crypto';
import { db } from '@/lib/dataService';
import { getAppConfig } from '@/lib/appConfig';
import type { UserAccount } from '@/types';

export interface RegisterInput {
  username: string;
  password: string;
  role: 'user' | 'admin';
  name: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  adminKey?: string;
}

export async function registerAccount(input: RegisterInput): Promise<UserAccount> {
  const normalized = normalizeInput(input);
  validateInput(normalized);

  if (normalized.role === 'admin') {
    const config = await getAppConfig();
    if (normalized.adminKey !== config.adminRegistrationKey) {
      throw new Error('管理员注册密钥不正确');
    }
  }

  const users = await db.users.getAll();
  const duplicate = users.find((user) => {
    return user.username.toLowerCase() === normalized.username.toLowerCase()
      || user.email.toLowerCase() === normalized.email.toLowerCase()
      || user.phone === normalized.phone;
  });

  if (duplicate) {
    throw new Error('用户名、邮箱或联系电话已被注册');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(normalized.password, salt);

  return db.users.create({
    username: normalized.username,
    passwordHash,
    passwordSalt: salt,
    role: normalized.role,
    name: normalized.name,
    gender: normalized.gender,
    phone: normalized.phone,
    email: normalized.email,
    status: 'active',
  });
}

export async function authenticateUser(username: string, password: string, role?: UserAccount['role']): Promise<UserAccount | null> {
  if (!username || !password) return null;
  const loginName = username.trim().toLowerCase();
  const users = await db.users.getAll();
  const user = users.find((item) => {
    return item.status === 'active'
      && (
        item.username.toLowerCase() === loginName
        || item.email.toLowerCase() === loginName
        || item.phone === username.trim()
      )
      && (!role || item.role === role);
  });

  if (!user) return null;
  const hash = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash)) ? user : null;
}

function normalizeInput(input: RegisterInput): RegisterInput {
  return {
    username: String(input.username || '').trim(),
    password: String(input.password || ''),
    role: input.role === 'admin' ? 'admin' : 'user',
    name: String(input.name || '').trim(),
    gender: input.gender === 'female' || input.gender === 'other' ? input.gender : 'male',
    phone: String(input.phone || '').trim(),
    email: String(input.email || '').trim(),
    adminKey: String(input.adminKey || '').trim(),
  };
}

function validateInput(input: RegisterInput) {
  if (input.username.length < 3) throw new Error('用户名至少需要 3 个字符');
  if (input.password.length < 6) throw new Error('密码至少需要 6 个字符');
  if (!input.name) throw new Error('请填写姓名');
  if (!input.phone) throw new Error('请填写联系电话');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('邮箱格式不正确');
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
}
