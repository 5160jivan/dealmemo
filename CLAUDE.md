# DealMemo — Claude Code Guidelines

## Project Overview
DealMemo is a Next.js 15 App Router app using the Vercel AI SDK and @ai-sdk/anthropic.
It's a startup research agent that streams deal memos using Claude.

## Key Commands
```bash
npm run dev        # Start local dev server (http://localhost:3000)
npm run build      # Production build
npm run type-check # TypeScript check without building
npm run lint       # ESLint
```

## Environment Setup
```bash
cp .env.local.example .env.local
# Fill in ANTHROPIC_API_KEY at minimum
```

## Architecture

```
app/
  layout.tsx          # Root layout with header/footer
  page.tsx            # Home page (embeds Chat component)
  globals.css         # Tailwind + custom styles
  api/
    chat/route.ts     # Main AI endpoint — streamText with Claude
components/
  Chat.tsx            # useChat hook, input, message list
  MemoRenderer.tsx    # Markdown parser + structured memo display
lib/                  # (future) tools, schemas, utilities
```

## Development Conventions
- Use `'use client'` only in components that need browser APIs or hooks
- API routes are Server Components by default (no 'use client')
- Keep components small — split when > ~150 lines
- Use Tailwind for all styling; no inline styles
- Type everything — no `any`

## Branch Strategy
- Main development branch: `claude/startup-research-agent-Tm71S`
- Commit after each meaningful increment
- Push after each milestone is working

## Current Milestone
**M1: Skeleton** — Basic streaming chat using `streamText` + `useChat`

## Adding Tools (M2)
When adding tools to the agent:
1. Define tool in `lib/tools/[name].ts` using the `tool()` helper from `ai`
2. Import and add to the `tools` object in `app/api/chat/route.ts`
3. Add `maxSteps: 10` to `streamText` to enable multi-step agentic loop
4. Test tool calls with `console.log` before wiring to frontend
