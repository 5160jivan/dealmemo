/**
 * Server-side memo cache: same company → reuse last assistant memo text.
 * Upstash Redis when configured; otherwise in-memory (single-instance dev only).
 */

import { validateCompanyName } from './validation';

export const MEMO_CACHE_VERSION = 1;

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function ttlSeconds(): number {
  const raw = process.env.DEALMEMO_MEMO_CACHE_TTL_SEC;
  if (!raw) return DEFAULT_TTL_SEC;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 60 ? n : DEFAULT_TTL_SEC;
}

export interface CachedMemoPayload {
  text: string;
  storedAt: string;
}

const memoryStore = new Map<string, { payload: CachedMemoPayload; expiresAt: number }>();

export function buildMemoCacheKey(companyRaw: string): string | null {
  const v = validateCompanyName(companyRaw);
  if (!v.valid || !v.sanitized) return null;
  const slug = v.sanitized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  if (!slug) return null;
  return `dealmemo:memo:v${MEMO_CACHE_VERSION}:${slug}`;
}

export async function getCachedMemo(key: string): Promise<CachedMemoPayload | null> {
  const useUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (useUpstash) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const raw = await redis.get<string>(key);
      if (raw == null) return null;
      const parsed = JSON.parse(raw) as CachedMemoPayload;
      if (typeof parsed?.text !== 'string' || parsed.text.length < 50) return null;
      return parsed;
    } catch (err) {
      console.error('[MemoCache] Upstash read error:', err);
      return null;
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.payload;
}

export async function setCachedMemo(key: string, text: string): Promise<void> {
  if (text.length < 80) return;

  const payload: CachedMemoPayload = {
    text,
    storedAt: new Date().toISOString(),
  };

  const useUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const ttl = ttlSeconds();

  if (useUpstash) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.set(key, JSON.stringify(payload), { ex: ttl });
    } catch (err) {
      console.error('[MemoCache] Upstash write error:', err);
    }
    return;
  }

  memoryStore.set(key, {
    payload,
    expiresAt: Date.now() + ttl * 1000,
  });
}
