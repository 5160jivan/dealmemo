import type { DealStatus } from './memoStore';

/**
 * Extract the AI verdict from memo text and map it to a DealStatus.
 * Looks for "**Recommendation:** Strong Buy" style patterns.
 */
export function parseVerdictFromText(text: string): DealStatus {
  const match = text.match(/\*\*Recommendation:\*\*\s*([^\n*]+)/i);
  if (!match) return 'unreviewed';

  const raw = match[1].trim().toLowerCase();
  if (raw.includes('strong buy') || raw.includes('buy')) return 'buy';
  if (raw.includes('watch')) return 'watch';
  if (raw.includes('pass')) return 'pass';
  return 'unreviewed';
}
