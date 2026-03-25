# DealMemo

An AI-powered startup research agent that generates institutional-quality VC deal memos in seconds. Enter a company name — Claude searches the web, reads sources, and streams a structured analysis live.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4.x-black?logo=vercel)
![Claude](https://img.shields.io/badge/Claude-Sonnet-orange?logo=anthropic)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## What it does

1. Type a company name (e.g. "Stripe")
2. The agent autonomously searches the web, reads the homepage, finds competitors, and pulls financial data
3. Streams a structured deal memo live with:
   - **Company Overview**
   - **Recent Financial Performance** — prose + interactive KPI cards and charts
   - **Market Analysis** (TAM, tailwinds, headwinds)
   - **Competitive Landscape**
   - **Strengths**
   - **Key Risks**
   - **Verdict** (Strong Buy / Buy / Watch / Pass)

Agent tool calls are visible in real-time — you see "Searching…", "Reading…", "Formatting…" as it works.

## Features

### Financial performance charts
The agent outputs a structured `dealmemo-finance` JSON block embedded in the memo. The UI parses and renders it as:
- **KPI cards** — ARR, revenue growth, gross margin, last raise, post-money valuation, headcount, and more
- **Revenue / ARR trend line** — multi-period sparkline when data is available
- **Funding rounds bar chart** — each disclosed round with amount and year

All values are sourced from public press and filings; estimates are clearly flagged.

### Session history sidebar
After each memo completes it is automatically saved to a collapsible left sidebar. You can:
- Browse previous companies without losing the current view
- Click any past memo to read it in the main area
- Re-research a company with one click (reload icon)
- Remove entries individually

### Live agent step visibility
While the agent runs you see each tool call inline — what it searched, which URLs it read, and when it switches to formatting. Steps collapse once the memo arrives.

### Memo cache
Identical company lookups are served from cache instead of re-running the full research pipeline.
- **Backend**: Upstash Redis in production, in-memory in development
- **Default TTL**: 7 days (override with `DEALMEMO_MEMO_CACHE_TTL_SEC`)
- **Bypass**: send `x-dealmemo-skip-cache: 1` header or set `DEALMEMO_MEMO_CACHE=0`
- Cache hits do not count against the rate limit

### Rate limiting
5 memos per hour per IP address. Uses Upstash Redis in production with an in-memory fallback for local dev. Returns `429` with a `Retry-After` header when exceeded.

### Input validation & safety
All incoming messages are sanitised: role allowlist, injection pattern detection, per-message length cap on user content.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| AI SDK | [Vercel AI SDK](https://sdk.vercel.ai) (`ai`) |
| LLM | Claude Sonnet via `@ai-sdk/anthropic` |
| Web search | Tavily API (graceful fallback to training data) |
| URL fetching | Jina Reader (no auth required) |
| Structured output | `generateObject` + Zod schema |
| Charts | Recharts (bar + line via `FinancialPerformanceViz`) |
| Styling | Tailwind CSS |
| Rate limiting | Upstash Redis (in-memory fallback for dev) |
| Memo cache | Upstash Redis (in-memory fallback for dev) |
| Observability | Structured logging + Vercel AI telemetry |

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/5160jivan/dealmemo
cd dealmemo
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — enables live web search (free key at tavily.com)
TAVILY_API_KEY=tvly-...

# Optional — persistent rate limiting + memo cache (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Optional — disable memo cache
# DEALMEMO_MEMO_CACHE=0

# Optional — override memo cache TTL (default: 604800 = 7 days)
# DEALMEMO_MEMO_CACHE_TTL_SEC=604800
```

Without `TAVILY_API_KEY`, the agent uses Claude's training knowledge and notes the limitation.
Without Upstash credentials, rate limiting and caching use in-memory stores (reset on each server restart).

### 3. Run

```bash
npm run dev
# → http://localhost:3000
```

## Project structure

```
app/
  layout.tsx              # Root layout — header, footer
  page.tsx                # Home page
  globals.css             # Tailwind + custom styles
  api/
    chat/route.ts         # Agent endpoint — streamText + tools + cache

components/
  Chat.tsx                # Session management, sidebar history, input bar
  MemoRenderer.tsx        # Streaming markdown → structured JSX + chart blocks
  FinancialPerformanceViz.tsx  # KPI cards, revenue line chart, funding bar chart
  DealMemoCard.tsx        # Collapsible structured memo sections
  AgentSteps.tsx          # Live tool call visibility

lib/
  schemas/
    dealMemo.ts           # Zod schema for the deal memo object
    financialViz.ts       # Zod schema for dealmemo-finance chart payload
  tools/
    webSearch.ts          # web_search tool (Tavily)
    fetchUrl.ts           # fetch_url tool (Jina Reader)
    formatMemo.ts         # format_memo tool (generateObject)
  memoCache.ts            # Server-side memo cache (Redis / in-memory)
  cachedMemoStream.ts     # Replay cached memo as a data stream
  parseFinancialSection.ts  # Extract dealmemo-finance blocks from markdown
  observability.ts        # Request logging, cost estimation
  rateLimit.ts            # IP-based rate limiting (5/hour)
  validation.ts           # Input sanitization, injection detection
```

## Agentic loop

The agent runs up to 10 steps autonomously:

```
User: "Generate a deal memo for Stripe"
  → web_search("Stripe startup funding founders product 2024")
  → fetch_url("https://stripe.com")
  → web_search("Stripe revenue ARR funding valuation headcount 2024 2025")
  → web_search("top competitors to Stripe payments")
  → format_memo({ company: "Stripe", researchSummary: "..." })
  → [streams final markdown memo + dealmemo-finance chart block]
```

## Financial chart format

The agent embeds a fenced block in the memo that the renderer parses into charts:

````
```dealmemo-finance
{
  "currency": "USD",
  "context": "ARR estimated; funding from press",
  "kpis": [
    { "label": "Last round", "value": "Series C", "period": "2024" },
    { "label": "ARR", "value": 1200, "unit": "M", "period": "2024" },
    { "label": "Growth", "value": 35, "unit": "%" }
  ],
  "revenueOrMrrSeries": [
    { "label": "2021", "value": 400 },
    { "label": "2022", "value": 700 },
    { "label": "2023", "value": 1000 }
  ],
  "fundingRounds": [
    { "name": "Seed", "amountM": 2, "year": "2010" },
    { "name": "Series B", "amountM": 100, "year": "2012" }
  ]
}
```
````

- `kpis` — 4–8 VC-relevant metrics (ARR, growth %, margin, burn, NRR, valuation, headcount)
- `revenueOrMrrSeries` — optional trend data; values in millions USD
- `fundingRounds` — optional; `amountM` omitted when undisclosed

## Deploy to Vercel

```bash
vercel deploy
```

Set in the Vercel dashboard:
- `ANTHROPIC_API_KEY` — required
- `TAVILY_API_KEY` — optional, enables live web search
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — optional, enables persistent rate limiting and memo cache

## Development

```bash
npm run dev          # Start dev server
npm run type-check   # TypeScript check
npm run build        # Production build
npm run lint         # ESLint
```

## License

MIT
