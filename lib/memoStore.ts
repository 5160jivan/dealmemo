/**
 * Memo persistence using Upstash Redis.
 * Falls back to in-memory for local dev without Redis.
 *
 * Keys:
 *   dealmemo:memo:{id}              → JSON MemoRecord (TTL 90 days)
 *   dealmemo:user:{userId}:memos    → Redis list of JSON MemoSummary (newest first, max 50)
 */

const MEMO_TTL_SEC = 60 * 60 * 24 * 90; // 90 days
const MAX_MEMOS_PER_USER = 50;

export interface MemoRecord {
  id: string;
  userId: string;
  company: string;
  text: string;
  createdAt: string;
}

export interface MemoSummary {
  id: string;
  company: string;
  createdAt: string;
}

function generateMemoId(): string {
  return `dm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function getRedis() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// In-memory fallback (dev only, single-instance)
const memMemos = new Map<string, MemoRecord>();
const memUserIndex = new Map<string, MemoSummary[]>();

export async function saveMemo(
  userId: string,
  company: string,
  text: string
): Promise<string> {
  const id = generateMemoId();
  const createdAt = new Date().toISOString();
  const record: MemoRecord = { id, userId, company, text, createdAt };
  const summary: MemoSummary = { id, company, createdAt };

  if (isUpstash()) {
    const redis = await getRedis();
    const listKey = `dealmemo:user:${userId}:memos`;
    await redis.set(`dealmemo:memo:${id}`, JSON.stringify(record), { ex: MEMO_TTL_SEC });
    await redis.lpush(listKey, JSON.stringify(summary));
    await redis.ltrim(listKey, 0, MAX_MEMOS_PER_USER - 1);
  } else {
    memMemos.set(id, record);
    const list = memUserIndex.get(userId) ?? [];
    memUserIndex.set(userId, [summary, ...list].slice(0, MAX_MEMOS_PER_USER));
  }

  return id;
}

export async function getUserMemos(userId: string): Promise<MemoSummary[]> {
  if (isUpstash()) {
    const redis = await getRedis();
    const raw = await redis.lrange(`dealmemo:user:${userId}:memos`, 0, MAX_MEMOS_PER_USER - 1);
    return (raw as string[]).map((r) => JSON.parse(r) as MemoSummary);
  }
  return memUserIndex.get(userId) ?? [];
}

export async function getMemoById(id: string): Promise<MemoRecord | null> {
  if (isUpstash()) {
    const redis = await getRedis();
    const raw = await redis.get<string>(`dealmemo:memo:${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as MemoRecord;
  }
  return memMemos.get(id) ?? null;
}
