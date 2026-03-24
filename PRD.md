# DealMemo — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-24
**Status:** Active

---

## 1. Overview

DealMemo is an AI-powered startup research agent that accepts a company name and produces a structured venture-capital-style deal memo. It uses Claude (via the Vercel AI SDK) to research, reason, and synthesize information into a professional investment analysis report.

The product is built for:
- Angel investors and VCs doing quick first-pass diligence
- Founders benchmarking themselves against competitors
- Analysts automating repetitive research workflows

---

## 2. Goals

| Goal | Success Metric |
|------|---------------|
| End-to-end streaming deal memo | User sees streamed output within 2s of submit |
| Structured output (not prose) | Memo has 6 defined sections, machine-parseable |
| Agentic web research | Agent uses ≥2 tool calls per memo (search + fetch) |
| Visible agent reasoning | User sees "Searching…", "Reading…" step indicators |
| Production-ready | Rate limiting, auth, error handling, observability |

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | RSC + streaming support |
| AI SDK | Vercel AI SDK (`ai`) latest | Unified streaming, tool calls, `useChat` hook |
| LLM Provider | `@ai-sdk/anthropic` (Claude Sonnet) | Best reasoning for research tasks |
| Styling | Tailwind CSS | Rapid UI iteration |
| Schema Validation | Zod | Type-safe structured output |
| Observability | Langfuse (self-hostable) | Trace every LLM call, cost tracking |
| Rate Limiting | Upstash Redis | Per-IP limits, serverless-native |
| Auth | Clerk | Fastest path to gated access |
| Deployment | Vercel | Zero-config Next.js hosting |

---

## 4. Features by Milestone

### Milestone 1 — The Skeleton ✅ (Targeted: Day 1 AM)
- Next.js App Router scaffold with TypeScript + Tailwind
- Single `/api/chat` route using `streamText` from Vercel AI SDK
- System prompt that instructs Claude to produce a deal memo
- React frontend using `useChat` hook for streaming display
- `.env.local` setup for `ANTHROPIC_API_KEY`
- Vercel deployment working

**Deliverable:** Streaming chat interface that produces a basic deal memo from training knowledge only.

---

### Milestone 2 — Add Tools (Agentic Loop) (Targeted: Day 1 PM)
- `web_search` tool — Tavily or Serper API integration
- `fetch_url` tool — scrape + summarize a webpage (via Jina Reader or direct fetch)
- `format_memo` tool — `generateObject` with Zod schema to produce structured JSON memo
- Multi-step agent loop: model decides when to search, reads results, loops
- System prompt updated with tool usage guidelines

**Deliverable:** Agent that autonomously researches and produces a sourced deal memo.

---

### Milestone 3 — Streaming UI with Tool Visibility (Targeted: Day 2 AM)
- Stream tool call events to the frontend (`onToolCall` callbacks)
- Show step-by-step progress: "Searching for Acme Corp...", "Reading homepage...", "Analyzing competitors..."
- Render final memo as a structured card with collapsible sections
- Loading skeleton while agent is working
- Copy-to-clipboard and export-to-PDF buttons

**Deliverable:** Beautiful, transparent agent UI showing its reasoning process.

---

### Milestone 4 — Observability & Error Handling (Targeted: Day 2 PM)
- Langfuse integration via `@langfuse/vercel-ai-sdk` wrapper
- Trace every LLM call: prompt, response, tokens, cost, latency
- Dashboard to view traces and identify expensive/slow queries
- Graceful error handling:
  - Web search returns no results → fallback to model knowledge
  - URL fetch fails → skip and note in memo
  - Model hallucination detection (competitor name validation)
- Token usage logged per request

**Deliverable:** Full observability pipeline; can debug any failed memo.

---

### Milestone 5 — Production Hardening (Targeted: Weekend 2)
- Rate limiting: 5 memos/hour per IP via Upstash Redis
- Input validation: sanitize company name (prevent prompt injection)
- Auth gate: Clerk-based login to access the tool
- Cost tracking: log token usage + estimated cost to a database
- Memo history: users can view past memos (stored in Vercel KV or Postgres)
- Share link: unique URL per memo, publicly accessible

**Deliverable:** Production-ready SaaS product, deployable to paying users.

---

## 5. Data Model

### Deal Memo Schema (Zod)
```typescript
const DealMemoSchema = z.object({
  company: z.string(),
  generatedAt: z.string().datetime(),
  overview: z.object({
    description: z.string(),
    founded: z.string().optional(),
    headquarters: z.string().optional(),
    stage: z.string().optional(),
    founders: z.array(z.string()).optional(),
  }),
  market: z.object({
    size: z.string(),
    growth: z.string(),
    tailwinds: z.array(z.string()),
    headwinds: z.array(z.string()),
  }),
  competitors: z.array(z.object({
    name: z.string(),
    differentiation: z.string(),
  })),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  verdict: z.object({
    recommendation: z.enum(['Strong Buy', 'Buy', 'Watch', 'Pass']),
    rationale: z.string(),
    keyQuestions: z.array(z.string()),
  }),
  sources: z.array(z.string()).optional(),
});
```

---

## 6. API Design

### `POST /api/chat`
- **Input:** `{ messages: Message[], companyName?: string }`
- **Output:** Vercel AI SDK data stream (`text/event-stream`)
- **Auth:** Clerk session cookie (Milestone 5)
- **Rate Limit:** 5 req/hour/IP (Milestone 5)

### `POST /api/memo`
- **Input:** `{ company: string }`
- **Output:** `DealMemo` JSON object (non-streaming, for programmatic use)
- **Auth:** API key

### `GET /api/memo/[id]`
- **Output:** Stored `DealMemo` by ID

---

## 7. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Time to first token | < 2 seconds |
| Total memo generation time | < 60 seconds |
| Uptime | 99.9% (Vercel SLA) |
| Cost per memo | < $0.50 |
| Mobile responsive | Yes |
| Accessibility | WCAG 2.1 AA |

---

## 8. Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=          # Claude API key

# Milestone 2
TAVILY_API_KEY=             # Web search
SERPER_API_KEY=             # Alternative web search

# Milestone 4
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASEURL=           # https://cloud.langfuse.com

# Milestone 5
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## 9. Out of Scope (v1)

- Mobile app
- Team/collaboration features
- CRM integrations (Salesforce, HubSpot)
- Automated memo scheduling
- Custom memo templates per fund
