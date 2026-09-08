import { NextRequest } from 'next/server';

type RateLimitEntry = {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __jinlingLoginRateLimitStore: Map<string, RateLimitEntry> | undefined;
  // eslint-disable-next-line no-var
  var __jinlingLoginRateLimitLastCleanup: number | undefined;
}

const store = globalThis.__jinlingLoginRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__jinlingLoginRateLimitStore = store;

export function checkLoginRateLimit(request: NextRequest, username: string): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  let retryAfterMs = 0;

  for (const key of loginKeys(request, username)) {
    const entry = store.get(key);
    if (!entry) continue;

    if (entry.lockedUntil && entry.lockedUntil > now) {
      retryAfterMs = Math.max(retryAfterMs, entry.lockedUntil - now);
      continue;
    }

    if (now - entry.firstAttemptAt > WINDOW_MS) {
      store.delete(key);
    }
  }

  return {
    allowed: retryAfterMs <= 0,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  };
}

export function recordFailedLogin(request: NextRequest, username: string) {
  cleanupExpiredEntries();
  const now = Date.now();

  for (const key of loginKeys(request, username)) {
    const existing = store.get(key);
    const inWindow = existing && now - existing.firstAttemptAt <= WINDOW_MS;
    const nextCount = inWindow ? existing.count + 1 : 1;

    store.set(key, {
      count: nextCount,
      firstAttemptAt: inWindow ? existing.firstAttemptAt : now,
      lockedUntil: nextCount >= MAX_FAILED_ATTEMPTS ? now + LOCK_MS : existing?.lockedUntil,
    });
  }
}

export function clearLoginRateLimit(request: NextRequest, username: string) {
  for (const key of loginKeys(request, username)) {
    store.delete(key);
  }
}

function loginKeys(request: NextRequest, username: string): string[] {
  const normalizedUsername = username.trim().toLowerCase() || 'anonymous';
  return [
    `ip:${getClientIp(request)}`,
    `user:${normalizedUsername}`,
  ];
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'local';
}

function cleanupExpiredEntries() {
  const now = Date.now();
  if (globalThis.__jinlingLoginRateLimitLastCleanup && now - globalThis.__jinlingLoginRateLimitLastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    const activeLock = entry.lockedUntil && entry.lockedUntil > now;
    const activeWindow = now - entry.firstAttemptAt <= WINDOW_MS;
    if (!activeLock && !activeWindow) {
      store.delete(key);
    }
  }

  globalThis.__jinlingLoginRateLimitLastCleanup = now;
}
