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

export type DealStatus = 'unreviewed' | 'watch' | 'buy' | 'pass' | 'invested';

export const DEAL_STATUSES: DealStatus[] = ['unreviewed', 'watch', 'buy', 'pass', 'invested'];

export const STATUS_LABELS: Record<DealStatus, string> = {
  unreviewed: 'Unreviewed',
  watch: 'Watch',
  buy: 'Buy',
  pass: 'Pass',
  invested: 'Invested',
};

export interface MemoRecord {
  id: string;
  userId: string;
  company: string;
  text: string;
  createdAt: string;
  status: DealStatus;
  notes: string;
}

export interface MemoSummary {
  id: string;
  company: string;
  createdAt: string;
  status: DealStatus;
  notes: string;
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
  text: string,
  status: DealStatus = 'unreviewed'
): Promise<string> {
  const id = generateMemoId();
  const createdAt = new Date().toISOString();
  const record: MemoRecord = { id, userId, company, text, createdAt, status, notes: '' };
  const summary: MemoSummary = { id, company, createdAt, status, notes: '' };

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

export async function updateMemo(
  id: string,
  userId: string,
  updates: { status?: DealStatus; notes?: string }
): Promise<void> {
  const record = await getMemoById(id);
  if (!record || record.userId !== userId) throw new Error('Not found or unauthorized');

  const updated: MemoRecord = {
    ...record,
    status: updates.status ?? record.status,
    notes: updates.notes !== undefined ? updates.notes : record.notes,
  };

  if (isUpstash()) {
    const redis = await getRedis();
    await redis.set(`dealmemo:memo:${id}`, JSON.stringify(updated), { ex: MEMO_TTL_SEC });

    // Rewrite the summary list with updated entry
    const listKey = `dealmemo:user:${userId}:memos`;
    const raw = await redis.lrange(listKey, 0, MAX_MEMOS_PER_USER - 1);
    const items = raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r) as MemoSummary);
    const newItems = items.map((s) =>
      s.id === id ? { ...s, status: updated.status, notes: updated.notes } : s
    );
    await redis.del(listKey);
    if (newItems.length > 0) {
      // rpush preserves lrange order (newest at index 0)
      await redis.rpush(listKey, ...newItems.map((s) => JSON.stringify(s)));
    }
  } else {
    memMemos.set(id, updated);
    const list = memUserIndex.get(userId) ?? [];
    memUserIndex.set(
      userId,
      list.map((s) =>
        s.id === id ? { ...s, status: updated.status, notes: updated.notes } : s
      )
    );
  }
}

export async function getUserMemos(userId: string): Promise<MemoSummary[]> {
  if (isUpstash()) {
    const redis = await getRedis();
    const raw = await redis.lrange(`dealmemo:user:${userId}:memos`, 0, MAX_MEMOS_PER_USER - 1);
    return raw.map((r) => {
      const s = (typeof r === 'string' ? JSON.parse(r) : r) as MemoSummary;
      // backfill status/notes for records saved before these fields existed
      return { ...s, status: s.status ?? 'unreviewed', notes: s.notes ?? '' };
    });
  }
  return (memUserIndex.get(userId) ?? []).map((s) => ({
    ...s,
    status: s.status ?? 'unreviewed',
    notes: s.notes ?? '',
  }));
}

export async function getMemoById(id: string): Promise<MemoRecord | null> {
  if (isUpstash()) {
    const redis = await getRedis();
    const raw = await redis.get(`dealmemo:memo:${id}`);
    if (!raw) return null;
    const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as MemoRecord;
    return { ...r, status: r.status ?? 'unreviewed', notes: r.notes ?? '' };
  }
  const r = memMemos.get(id) ?? null;
  if (!r) return null;
  return { ...r, status: r.status ?? 'unreviewed', notes: r.notes ?? '' };
}
