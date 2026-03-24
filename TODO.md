# DealMemo — Task Tracker

> Updated: 2026-03-24 | Branch: `claude/startup-research-agent-Tm71S`

---

## Milestone 1: The Skeleton — Basic Streaming Chat ✅

### Setup & Scaffold
- [x] Write PRD.md with full requirements
- [x] Write TODO.md task tracker
- [x] Initialize Next.js 15 project with TypeScript + Tailwind
- [x] Install Vercel AI SDK (`ai`) and `@ai-sdk/anthropic`
- [x] Configure `next.config.ts`
- [x] Set up `.env.local.example` with required vars
- [x] Configure `tsconfig.json`

### API Layer
- [x] Create `app/api/chat/route.ts` with `streamText`
- [x] Write system prompt for deal memo generation
- [x] Wire up `@ai-sdk/anthropic` model (`claude-sonnet-4-6`)
- [x] Return `toDataStreamResponse()` for streaming

### Frontend
- [x] Create `app/layout.tsx` with Tailwind base
- [x] Create `app/page.tsx` as the main chat interface
- [x] Build `components/Chat.tsx` using `useChat` hook
- [x] Company name input with submit handling
- [x] Display streamed markdown response via `MemoRenderer.tsx`
- [x] Loading state with spinner

### Deployment Prep
- [x] Add `.gitignore`
- [x] Add `vercel.json` with 60s maxDuration
- [x] Add `CLAUDE.md` dev guidelines
- [x] Initial commit and push to branch
- [ ] Connect to Vercel project (manual step)
- [ ] Set `ANTHROPIC_API_KEY` in Vercel env vars (manual step)

---

## Milestone 2: Add Tools — Make It Agentic ✅

### Tool Infrastructure
- [x] Install Tavily SDK (`@tavily/core`)
- [x] Create `lib/tools/webSearch.ts` — Tavily search with graceful fallback
- [x] Create `lib/tools/fetchUrl.ts` — Jina Reader URL extraction
- [x] Create `lib/tools/formatMemo.ts` — `generateObject` with Zod + Claude Haiku
- [x] Define `DealMemoSchema` in `lib/schemas/dealMemo.ts`

### Agent Loop
- [x] Update `/api/chat` to use `maxSteps: 10` for multi-turn tool calling
- [x] Add `tools` object to `streamText` call (web_search, fetch_url, format_memo)
- [x] System prompt guides agent through: search → fetch → search competitors → format
- [x] Add `maxTokens: 4096` and `temperature: 0.3`
- [x] Tool errors handled gracefully (return error object, agent continues)

---

## Milestone 3: Streaming UI with Tool Visibility ✅

### Progress Indicators
- [x] Stream tool call events to the client (via `message.parts`)
- [x] Create `components/AgentSteps.tsx` — live tool call status
- [x] Display: "Searching: [query]", "Reading [hostname]", "Formatting deal memo..."
- [x] Step status: spinning (pending), ✓ (done), ✗ (error)

### Memo Rendering
- [x] Create `components/DealMemoCard.tsx` — full structured memo display
- [x] Section components: Overview, Market, Competitors, Strengths, Risks, Verdict
- [x] Color-coded verdict badge (Strong Buy = emerald, Pass = red)
- [x] Collapsible sections with chevron toggle
- [x] Sources list with links
- [x] `components/MemoRenderer.tsx` — markdown-to-JSX for streaming text

### UX Polish
- [x] Copy-to-clipboard button in MemoRenderer
- [x] Error state UI in Chat
- [x] Mobile responsive layout
- [ ] Export to PDF (browser print) — deferred
- [ ] Loading skeleton — deferred (AgentSteps serves this purpose)

---

## Milestone 4: Observability & Error Handling ✅

### Observability
- [x] Install `langfuse` package
- [x] `lib/observability.ts` — structured logging helpers
- [x] `generateRequestId()` — unique ID per request for log correlation
- [x] `logMemoEvent()` — start/complete/error events with timing
- [x] `estimateCost()` — USD cost estimate from token usage
- [x] `getTelemetryConfig()` — Vercel AI SDK `experimental_telemetry` metadata
- [x] `onFinish` callback logs tokens, cost, duration, finishReason

### Error Handling
- [x] Web search returns empty → returns error object, agent falls back to training knowledge
- [x] URL fetch fails → returns error object, agent skips and continues
- [x] Invalid company name → validation error returned before LLM call
- [x] JSON parse errors → 400 response
- [x] Agent startup errors → 500 with requestId

### Logging
- [x] Structured JSON logs per request (dev: pretty, prod: compact)
- [x] Token usage logged in `onFinish`
- [x] Estimated cost logged per request
- [x] Request ID on all log lines and response header (`x-request-id`)

---

## Milestone 5: Production Hardening ✅ (partial)

### Rate Limiting ✅
- [x] Install `@upstash/ratelimit` and `@upstash/redis`
- [x] `lib/rateLimit.ts` — 5 requests/hour per IP
- [x] Upstash Redis when configured, in-memory fallback for dev
- [x] `429` response with `Retry-After`, `X-RateLimit-*` headers
- [x] `getClientIp()` — Vercel-compatible IP extraction

### Input Validation ✅
- [x] `lib/validation.ts` — company name and request body validation
- [x] Sanitize: strip HTML, enforce 2-100 char length
- [x] Block prompt injection patterns
- [x] Validate messages array schema (roles, lengths, count)

### Structured Memo Card ✅
- [x] `components/DealMemoCard.tsx` — full structured rendering from JSON schema
- [x] Metric cards, bullet lists, collapsible sections, verdict badge

### Remaining (manual setup required)
- [ ] Connect Clerk auth (install + configure)
- [ ] Set up Vercel KV / Neon for memo history
- [ ] `app/history/page.tsx` — past memos list
- [ ] `app/memo/[id]/page.tsx` — individual memo view
- [ ] Share link generation
- [ ] Admin cost dashboard

---

## Ongoing / Cross-Cutting

- [x] `CLAUDE.md` development guidelines
- [ ] Write component unit tests (Vitest)
- [ ] Write API route integration tests
- [ ] Set up GitHub Actions CI (lint + type-check on PR)
- [ ] Add Vercel Analytics
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit

---

## Progress Summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| M1: Skeleton | ✅ Complete | Streaming chat working |
| M2: Tools | ✅ Complete | web_search, fetch_url, format_memo |
| M3: Streaming UI | ✅ Complete | AgentSteps, DealMemoCard, MemoRenderer |
| M4: Observability | ✅ Complete | Structured logging, cost tracking, validation |
| M5: Production | 🔄 Partial | Rate limiting + validation done; auth/history TBD |
