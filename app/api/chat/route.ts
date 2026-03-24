import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { webSearchTool } from '@/lib/tools/webSearch';
import { fetchUrlTool } from '@/lib/tools/fetchUrl';
import { formatMemoTool } from '@/lib/tools/formatMemo';
import { validateChatRequest } from '@/lib/validation';
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

3. **Search competitors** — Use web_search: "top competitors to [company] [industry]"

4. **Optionally fetch** — Read 1-2 key articles/profiles if they seem highly relevant

5. **Format** — Use format_memo to produce the structured JSON deal memo

## Final Output Format
After calling format_memo, present the memo to the user in this exact markdown structure:

## Company Overview
[content]

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

  // Extract company name from the last user message for logging
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const companyMatch = lastUserMessage?.content.match(/Generate a deal memo for: (.+)/);
  const company = companyMatch ? companyMatch[1] : 'unknown';

  logMemoEvent('start', { requestId, company, startTime });

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

      onFinish: ({ usage, finishReason }) => {
        const cost = estimateCost(
          usage?.promptTokens ?? 0,
          usage?.completionTokens ?? 0
        );
        logMemoEvent('complete', { requestId, company, startTime }, {
          finishReason,
          usage,
          estimatedCostUsd: cost,
          durationMs: Date.now() - startTime,
        });
      },
    });

    return result.toDataStreamResponse({
      headers: {
        'x-request-id': requestId,
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
