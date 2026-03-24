# DealMemo — Task Tracker

> Updated: 2026-03-24 | Branch: `claude/startup-research-agent-Tm71S`

---

## Milestone 1: The Skeleton — Basic Streaming Chat

### Setup & Scaffold
- [x] Write PRD.md with full requirements
- [x] Write TODO.md task tracker
- [ ] Initialize Next.js 15 project with TypeScript + Tailwind
- [ ] Install Vercel AI SDK (`ai`) and `@ai-sdk/anthropic`
- [ ] Configure `next.config.ts` (edge runtime settings)
- [ ] Set up `.env.local.example` with required vars
- [ ] Configure `tsconfig.json`

### API Layer
- [ ] Create `app/api/chat/route.ts` with `streamText`
- [ ] Write system prompt for deal memo generation
- [ ] Wire up `@ai-sdk/anthropic` model (`claude-sonnet-4-6`)
- [ ] Return `toDataStreamResponse()` for streaming

### Frontend
- [ ] Create `app/layout.tsx` with Tailwind base
- [ ] Create `app/page.tsx` as the main chat interface
- [ ] Build `components/Chat.tsx` using `useChat` hook
- [ ] Company name input with submit handling
- [ ] Display streamed markdown response
- [ ] Basic loading state

### Deployment
- [ ] Add `.gitignore`
- [ ] Initial commit and push to branch
- [ ] Connect to Vercel project
- [ ] Set `ANTHROPIC_API_KEY` in Vercel env vars
- [ ] Verify streaming works on production

---

## Milestone 2: Add Tools — Make It Agentic

### Tool Infrastructure
- [ ] Install Tavily SDK (`@tavily/core`) or Serper HTTP client
- [ ] Create `lib/tools/webSearch.ts` — search tool definition
- [ ] Create `lib/tools/fetchUrl.ts` — URL scrape/summarize tool
- [ ] Create `lib/tools/formatMemo.ts` — `generateObject` with Zod schema
- [ ] Define `DealMemoSchema` in `lib/schemas/dealMemo.ts`

### Agent Loop
- [ ] Update `/api/chat` to use `maxSteps` for multi-turn tool calling
- [ ] Add `tools` object to `streamText` call
- [ ] Test that model autonomously calls tools in sequence
- [ ] Add `maxTokens` and `temperature` config
- [ ] Handle tool errors gracefully

### Environment
- [ ] Add `TAVILY_API_KEY` to `.env.local.example`
- [ ] Test web search tool returns relevant results
- [ ] Test fetch_url tool parses company homepage

---

## Milestone 3: Streaming UI with Tool Visibility

### Progress Indicators
- [ ] Stream tool call events to the client
- [ ] Create `components/AgentStep.tsx` — shows current tool being called
- [ ] Display: "Searching for [company]...", "Reading [url]...", "Formatting memo..."
- [ ] Show elapsed time per step

### Memo Rendering
- [ ] Create `components/DealMemoCard.tsx` — structured memo display
- [ ] Section components: Overview, Market, Competitors, Strengths, Risks, Verdict
- [ ] Color-coded verdict badge (Strong Buy = green, Pass = red)
- [ ] Collapsible sections
- [ ] Sources list with links

### UX Polish
- [ ] Loading skeleton while agent works
- [ ] Copy-to-clipboard button for full memo
- [ ] Export to PDF (browser print dialog)
- [ ] Error state UI
- [ ] Mobile responsive layout

---

## Milestone 4: Observability & Error Handling

### Langfuse Integration
- [ ] Install `langfuse` and `langfuse-vercel-ai-sdk`
- [ ] Wrap `streamText` with Langfuse tracing middleware
- [ ] Log: prompt, response, model, tokens used, cost, latency
- [ ] Add session/user ID to traces
- [ ] View traces in Langfuse dashboard

### Error Handling
- [ ] Web search returns empty → fallback to model knowledge, note in memo
- [ ] URL fetch fails → skip URL, log warning, continue
- [ ] Rate limit hit on external APIs → retry with backoff
- [ ] Model timeout (>60s) → return partial memo with error note
- [ ] Invalid company name → return validation error before LLM call

### Logging
- [ ] Log token usage per request to console (dev) / Vercel logs (prod)
- [ ] Estimate and log cost per memo ($)
- [ ] Add request ID to all log lines

---

## Milestone 5: Production Hardening

### Rate Limiting
- [ ] Install `@upstash/ratelimit` and `@upstash/redis`
- [ ] Implement 5 requests/hour per IP on `/api/chat`
- [ ] Return `429` with retry-after header when limited
- [ ] Show rate limit error in UI

### Auth
- [ ] Install and configure Clerk
- [ ] Wrap app with `ClerkProvider`
- [ ] Add sign-in page
- [ ] Protect `/api/chat` with Clerk auth middleware
- [ ] Show user avatar in header

### Input Validation
- [ ] Sanitize company name (strip HTML, limit length to 100 chars)
- [ ] Detect and block obvious prompt injection attempts
- [ ] Validate request body schema with Zod before processing

### History & Persistence
- [ ] Set up Vercel KV or Neon Postgres
- [ ] Save completed memos to DB with user ID
- [ ] Create `app/history/page.tsx` — list past memos
- [ ] Create `app/memo/[id]/page.tsx` — view a specific memo
- [ ] Generate shareable link per memo

### Cost Tracking
- [ ] Log input/output tokens per request to DB
- [ ] Calculate and store estimated cost
- [ ] Admin dashboard showing daily/monthly spend

---

## Ongoing / Cross-Cutting

- [ ] Add `CLAUDE.md` with development guidelines
- [ ] Write component unit tests (Vitest)
- [ ] Write API route integration tests
- [ ] Set up GitHub Actions CI (lint + type-check on PR)
- [ ] Add Vercel Analytics
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit

---

## Progress Summary

| Milestone | Status | Target |
|-----------|--------|--------|
| M1: Skeleton | 🔄 In Progress | Day 1 AM |
| M2: Tools | ⬜ Not Started | Day 1 PM |
| M3: Streaming UI | ⬜ Not Started | Day 2 AM |
| M4: Observability | ⬜ Not Started | Day 2 PM |
| M5: Production | ⬜ Not Started | Weekend 2 |
