# DealMemo

An AI-powered startup research agent that generates institutional-quality VC deal memos in seconds. Enter a company name — Claude searches the web, reads sources, and streams a structured analysis live.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4.x-black?logo=vercel)
![Claude](https://img.shields.io/badge/Claude-Sonnet-orange?logo=anthropic)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## What it does

1. You type a company name (e.g. "Stripe")
2. The agent autonomously searches the web, reads the homepage, looks up competitors
3. Streams a structured deal memo live with:
   - Company Overview
   - Market Analysis (TAM, tailwinds, headwinds)
   - Competitive Landscape
   - Strengths
   - Key Risks
   - Verdict (Strong Buy / Buy / Watch / Pass)

The agent's tool calls are visible in real-time — you see "Searching...", "Reading...", "Formatting..." as it works.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| AI SDK | [Vercel AI SDK](https://sdk.vercel.ai) (`ai`) |
| LLM | Claude Sonnet via `@ai-sdk/anthropic` |
| Web search | Tavily API (graceful fallback to training data) |
| URL fetching | Jina Reader (no auth required) |
| Structured output | `generateObject` + Zod schema |
| Styling | Tailwind CSS |
| Rate limiting | Upstash Redis (in-memory fallback for dev) |
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

# Optional — enables live web search (get free key at tavily.com)
TAVILY_API_KEY=tvly-...
```

Without `TAVILY_API_KEY`, the agent uses Claude's training knowledge and notes the limitation.

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
    chat/route.ts         # Agent endpoint — streamText + tools

components/
  Chat.tsx                # useChat hook, input, message list
  MemoRenderer.tsx        # Streaming markdown → structured JSX
  DealMemoCard.tsx        # Structured memo card (collapsible sections)
  AgentSteps.tsx          # Live tool call visibility

lib/
  schemas/
    dealMemo.ts           # Zod schema for the deal memo object
  tools/
    webSearch.ts          # web_search tool (Tavily)
    fetchUrl.ts           # fetch_url tool (Jina Reader)
    formatMemo.ts         # format_memo tool (generateObject)
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
  → web_search("top competitors to Stripe payments")
  → format_memo({ company: "Stripe", researchSummary: "..." })
  → [streams final markdown memo]
```

## Deploy to Vercel

```bash
vercel deploy
```

Set these environment variables in the Vercel dashboard:
- `ANTHROPIC_API_KEY` — required
- `TAVILY_API_KEY` — optional, enables web search
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — optional, enables persistent rate limiting

## Rate limits

- 5 memos per hour per IP address
- Uses Upstash Redis in production, in-memory in development
- Returns `429` with `Retry-After` header when exceeded

## Development

```bash
npm run dev          # Start dev server
npm run type-check   # TypeScript check
npm run build        # Production build
npm run lint         # ESLint
```

## Roadmap

See [TODO.md](./TODO.md) for the full task tracker. Remaining milestones:

- **Auth** — Clerk sign-in gate
- **History** — Save and revisit past memos
- **Langfuse** — Full LLM trace observability
- **Share links** — Public URL per memo

## License

MIT
