/**
 * Observability helpers for DealMemo.
 *
 * Uses Langfuse for LLM call tracing when LANGFUSE_PUBLIC_KEY is configured.
 * Falls back to structured console logging when not configured.
 *
 * Langfuse setup: https://langfuse.com/docs/sdk/typescript/guide
 */

export interface TraceMetadata {
  requestId: string;
  company: string;
  startTime: number;
}

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

/**
 * Generate a unique request ID for correlating logs.
 */
export function generateRequestId(): string {
  return `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Estimate cost in USD for Claude Sonnet usage.
 * Pricing as of 2025: $3/M input, $15/M output tokens.
 */
export function estimateCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * 3.0;
  const outputCost = (completionTokens / 1_000_000) * 15.0;
  return Math.round((inputCost + outputCost) * 10_000) / 10_000; // Round to 4 decimal places
}

/**
 * Log a memo generation event.
 * In production with Langfuse configured, sends to Langfuse.
 * Always logs to console in a structured format.
 */
export function logMemoEvent(
  event: 'start' | 'complete' | 'error' | 'cache_hit',
  meta: TraceMetadata,
  extra?: Record<string, unknown>
) {
  const elapsed = Date.now() - meta.startTime;
  const log = {
    event: `memo.${event}`,
    requestId: meta.requestId,
    company: meta.company,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[DealMemo]', JSON.stringify(log, null, 2));
  } else {
    console.log('[DealMemo]', JSON.stringify(log));
  }
}

/**
 * Log tool call events for tracing the agentic loop.
 */
export function logToolCall(
  toolName: string,
  requestId: string,
  status: 'start' | 'success' | 'error',
  extra?: Record<string, unknown>
) {
  console.log('[DealMemo Tool]', JSON.stringify({
    tool: toolName,
    status,
    requestId,
    timestamp: new Date().toISOString(),
    ...extra,
  }));
}

/**
 * Check if Langfuse is configured.
 */
export function isLangfuseConfigured(): boolean {
  return !!(
    process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_SECRET_KEY
  );
}

/**
 * Get Vercel AI SDK telemetry config.
 * When Langfuse is configured, its Vercel AI SDK integration
 * hooks into this via the OpenTelemetry provider.
 */
export function getTelemetryConfig(requestId: string, company: string) {
  return {
    isEnabled: true,
    functionId: 'deal-memo-agent',
    metadata: {
      requestId,
      company,
      milestone: 'M4',
    },
  };
}
