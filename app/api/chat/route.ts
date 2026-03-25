import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { webSearchTool } from '@/lib/tools/webSearch';
import { fetchUrlTool } from '@/lib/tools/fetchUrl';
import { formatMemoTool } from '@/lib/tools/formatMemo';
import { validateChatRequest } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  buildMemoCacheKey,
  getCachedMemo,
  setCachedMemo,
} from '@/lib/memoCache';
import { cachedMemoToDataStreamResponse } from '@/lib/cachedMemoStream';
import {
  generateRequestId,
  estimateCost,
  logMemoEvent,
  getTelemetryConfig,
} from '@/lib/observability';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an elite startup research analyst specializing in venture capital deal memos.
Your job is to produce comprehensive, institutional-quality investment analysis.

## Your Research Process
When given a company name, follow these steps IN ORDER:

1. **Search** — Use web_search to find: funding history, founders, product, market size, recent news
   Example query: "[company] startup funding founders product 2024"

2. **Read homepage** — Use fetch_url to read the company's official website for accurate product info

2b. **Financials** — Use web_search for investor-relevant numbers, e.g. "[company] revenue ARR funding round valuation headcount 2024 2025"

3. **Search competitors** — Use web_search: "top competitors to [company] [industry]"

4. **Optionally fetch** — Read 1-2 key articles/profiles if they seem highly relevant

5. **Format** — Use format_memo to produce the structured JSON deal memo

## Final Output Format
After calling format_memo, present the memo to the user in this exact markdown structure:

## Company Overview
[content]

## Recent Financial Performance
Write 2-4 sentences for investors (revenue/ARR, growth, margins if known, cash runway, last round, valuation hints, headcount). Mark estimates clearly.

Immediately after the prose, output a **single** JSON chart block using this exact fence label (no other text inside the fence):

\`\`\`dealmemo-finance
{"currency":"USD","context":"One-line data caveat","kpis":[{"label":"Last round","value":"Series C","unit":"","period":"2024","note":"from press"},{"label":"Headcount","value":450,"unit":"","period":"est."}],"revenueOrMrrSeries":[{"label":"2022","value":12},{"label":"2023","value":28}],"fundingRounds":[{"name":"Seed","amountM":4,"year":"2019"},{"name":"B","amountM":80,"year":"2023"}]}
\`\`\`

Rules for the JSON:
- **kpis**: 4-8 items VCs care about (ARR/revenue, growth %, gross margin, burn/NRR, last raise, post-money valuation if reported, runway months, headcount). Use \`value\` as number or string; optional \`unit\` (%, M, B, K, x).
- **revenueOrMrrSeries**: optional; 2+ points for a trend line (labels = years or quarters, values = millions USD unless noted in KPIs).
- **fundingRounds**: optional; \`amountM\` = millions USD when disclosed; omit unknown amounts rather than guessing.
- If no numeric data exists, still include **kpis** with qualitative strings and omit empty arrays.

## Market Analysis
[content]

## Competitive Landscape
[content]

## Strengths
[content]

## Key Risks
[content]

## Verdict
**Recommendation:** [Strong Buy / Buy / Watch / Pass]
**Rationale:** [2-3 sentences]
**Key Questions to Resolve:**
- [Question 1]
- [Question 2]
- [Question 3]

---
*Sources: [list any URLs used]*

## Guidelines
- Search 2-4 times for comprehensive coverage
- Be analytical and specific — cite what you found vs. inferred
- Acknowledge uncertainty: "as of my knowledge cutoff..." or "based on available data..."
- If TAVILY_API_KEY is not configured, proceed with training knowledge and note the limitation
- Keep the final memo dense and precise (target 600-900 words)
- Always call format_memo before presenting the final output`;

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const ip = getClientIp(req);

  const cacheDisabled =
    process.env.DEALMEMO_MEMO_CACHE === '0' ||
    process.env.DEALMEMO_MEMO_CACHE === 'false';
  const skipCache =
    cacheDisabled || req.headers.get('x-dealmemo-skip-cache') === '1';

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const validation = validateChatRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages } = validation.data!;

  const lastMessage = messages[messages.length - 1];
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const companyMatch = lastUserMessage?.content.match(
    /Generate a deal memo for:\s*(.+)/i
  );
  const companyRaw = companyMatch?.[1]?.trim() ?? '';
  const company = companyRaw || 'unknown';
  const memoCacheKey =
    !skipCache && companyRaw ? buildMemoCacheKey(companyRaw) : null;

  // Cache hit: same memo request, no rate-limit charge, no model call
  if (
    memoCacheKey &&
    lastMessage?.role === 'user' &&
    companyMatch &&
    !skipCache
  ) {
    const cached = await getCachedMemo(memoCacheKey);
    if (cached) {
      logMemoEvent('cache_hit', { requestId, company, startTime }, { ip });
      return cachedMemoToDataStreamResponse(cached.text, {
        headers: {
          'x-request-id': requestId,
          'X-DealMemo-Cache': 'HIT',
        },
      });
    }
  }

  // Rate limiting (only for fresh research)
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    const retryAfterSecs = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. You can generate 5 memos per hour.',
        retryAfter: retryAfterSecs,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSecs),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      }
    );
  }

  logMemoEvent('start', { requestId, company, startTime }, {
    ip,
    rateLimitRemaining: rateLimit.remaining,
  });

  try {
    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: SYSTEM_PROMPT,
      messages,
      maxSteps: 10,
      tools: {
        web_search: webSearchTool,
        fetch_url: fetchUrlTool,
        format_memo: formatMemoTool,
      },
      maxTokens: 4096,
      temperature: 0.3,
      experimental_telemetry: getTelemetryConfig(requestId, company),

      onFinish: async ({ usage, finishReason, text }) => {
        const cost = estimateCost(
          usage?.promptTokens ?? 0,
          usage?.completionTokens ?? 0
        );
        logMemoEvent('complete', { requestId, company, startTime }, {
          finishReason,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
          totalTokens: usage?.totalTokens,
          estimatedCostUsd: cost,
          durationMs: Date.now() - startTime,
        });
        if (
          memoCacheKey &&
          !skipCache &&
          finishReason === 'stop' &&
          text &&
          text.length >= 80
        ) {
          await setCachedMemo(memoCacheKey, text);
        }
      },
    });

    return result.toDataStreamResponse({
      headers: {
        'x-request-id': requestId,
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-DealMemo-Cache': 'MISS',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logMemoEvent('error', { requestId, company, startTime }, {
      error: message,
      durationMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ error: 'Failed to start agent', requestId }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
