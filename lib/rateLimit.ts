/**
 * Rate limiting for the DealMemo API.
 *
 * Uses Upstash Redis when configured (production).
 * Falls back to in-memory limiting for local dev.
 *
 * Limits: 5 memos per hour per IP address.
 */

const REQUESTS_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms

// In-memory fallback for local dev (not suitable for multi-instance prod)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check rate limit for a given IP address.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is set, otherwise in-memory.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const useUpstash =
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (useUpstash) {
    return checkUpstashRateLimit(ip);
  }

  return checkInMemoryRateLimit(ip);
}

async function checkUpstashRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    // Dynamic import to avoid errors when Upstash is not configured
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(REQUESTS_PER_HOUR, '1 h'),
      analytics: true,
      prefix: 'dealmemo',
    });

    const { success, limit, remaining, reset } = await ratelimit.limit(
      `ip:${ip}`
    );

    return {
      allowed: success,
      remaining,
      limit,
      resetAt: reset,
    };
  } catch (err) {
    // If Upstash fails, fail open (allow the request) and log
    console.error('[RateLimit] Upstash error, failing open:', err);
    return {
      allowed: true,
      remaining: REQUESTS_PER_HOUR,
      limit: REQUESTS_PER_HOUR,
      resetAt: Date.now() + WINDOW_MS,
    };
  }
}

function checkInMemoryRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const key = `ip:${ip}`;
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + WINDOW_MS;
    inMemoryStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: REQUESTS_PER_HOUR - 1,
      limit: REQUESTS_PER_HOUR,
      resetAt,
    };
  }

  if (entry.count >= REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      remaining: 0,
      limit: REQUESTS_PER_HOUR,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: REQUESTS_PER_HOUR - entry.count,
    limit: REQUESTS_PER_HOUR,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract client IP from request headers (Vercel-compatible).
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}
