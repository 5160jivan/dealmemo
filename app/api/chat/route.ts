import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { webSearchTool } from '@/lib/tools/webSearch';
import { fetchUrlTool } from '@/lib/tools/fetchUrl';
import { formatMemoTool } from '@/lib/tools/formatMemo';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an elite startup research analyst specializing in venture capital deal memos.
Your job is to produce comprehensive, institutional-quality investment analysis.

## Your Research Process
When given a company name, follow these steps:

1. **Search** — Use web_search to find: funding history, founders, product, market size, recent news
2. **Read** — Use fetch_url to read the company homepage and 1-2 key articles/profiles
3. **Search competitors** — Use web_search to find "top competitors to [company]"
4. **Format** — Use format_memo to structure everything into a clean deal memo JSON

## Output Format
After calling format_memo, present the structured memo to the user in clear markdown with these sections:
## Company Overview
## Market Analysis
## Competitive Landscape
## Strengths
## Key Risks
## Verdict

## Guidelines
- Be analytical and specific, not generic
- Search 2-4 times to get comprehensive coverage
- Always cite what you found vs. what you inferred
- Acknowledge uncertainty where appropriate
- If TAVILY_API_KEY is not set, do your best with training knowledge and note the limitation
- Keep the final memo under 800 words — dense and precise beats verbose`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 10, // Allow multi-step agentic loop (search → read → search → format)
    tools: {
      web_search: webSearchTool,
      fetch_url: fetchUrlTool,
      format_memo: formatMemoTool,
    },
    maxTokens: 4096,
    temperature: 0.3,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'deal-memo-agent',
    },
  });

  return result.toDataStreamResponse();
}
