'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { type Message } from 'ai/react';

interface AgentStepsProps {
  messages: Message[];
  memoContent: string;
}

export default function AgentSteps({ messages, memoContent }: AgentStepsProps) {
  const steps = useMemo(() => collectSteps(messages), [messages]);

  const memoStarted =
    memoContent.trim().length >= 72 || memoContent.includes('##');

  const [open, setOpen] = useState(!memoStarted);
  const didAutoCollapse = useRef(false);

  useEffect(() => {
    if (memoStarted && !didAutoCollapse.current) {
      didAutoCollapse.current = true;
      setOpen(false);
    }
  }, [memoStarted]);

  const lastLabel =
    steps.length > 0 ? getStepDisplay(steps[steps.length - 1]).label : null;

  return (
    <div
      className="mt-6 rounded-2xl border border-stone-200 bg-white/80 overflow-hidden shadow-sm shadow-amber-100/50
        ring-1 ring-amber-100/40"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left
          hover:bg-amber-50/50 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100
              text-amber-800 text-[10px] font-bold shrink-0 border border-amber-200/60"
            aria-hidden
          >
            {open ? '▾' : '▸'}
          </span>
          <span className="text-sm font-semibold text-slate-800">Research activity</span>
          {steps.length > 0 && (
            <span className="text-xs text-slate-500 tabular-nums shrink-0">
              {steps.length} {steps.length === 1 ? 'step' : 'steps'}
            </span>
          )}
        </span>
        {!open && (
          <span className="text-xs text-slate-500 truncate max-w-[45%] hidden sm:inline">
            {lastLabel ?? (steps.length === 0 ? 'Starting…' : '')}
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-0 space-y-1.5 border-t border-stone-100">
          {steps.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 pl-1 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Getting ready…
            </div>
          ) : (
            steps.map((step, i) => <StepRow key={i} step={step} index={i} />)
          )}
        </div>
      )}
    </div>
  );
}

function collectSteps(messages: Message[]): Step[] {
  const steps: Step[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    const parts = message.parts ?? [];
    for (const part of parts) {
      if (part.type === 'tool-invocation') {
        const inv = part.toolInvocation;
        steps.push({
          toolName: inv.toolName,
          args: inv.args,
          state: inv.state,
          result: inv.state === 'result' ? inv.result : undefined,
        });
      }
    }
  }
  return steps;
}

interface Step {
  toolName: string;
  args: Record<string, unknown>;
  state: 'call' | 'result' | 'partial-call';
  result?: unknown;
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const isPending = step.state === 'call' || step.state === 'partial-call';
  const isError =
    step.state === 'result' &&
    step.result &&
    typeof step.result === 'object' &&
    'error' in (step.result as Record<string, unknown>);

  const { icon, label } = getStepDisplay(step);

  return (
    <div
      className={`flex items-start gap-2.5 text-xs rounded-xl px-3 py-2.5 border transition-all
        ${isPending ? 'bg-amber-50/80 border-amber-200/70 text-slate-700' : ''}
        ${!isPending && !isError ? 'bg-stone-50 border-stone-200/80 text-slate-600' : ''}
        ${isError ? 'bg-red-50 border-red-200 text-red-700' : ''}
      `}
    >
      <span className="text-slate-400 font-mono flex-shrink-0 mt-0.5 w-4">
        {index + 1}.
      </span>
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className={isPending ? 'text-slate-800 font-medium' : ''}>{label}</span>
      </div>
      <div className="flex-shrink-0">
        {isPending ? (
          <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        ) : isError ? (
          <span className="text-red-600">✗</span>
        ) : (
          <span className="text-emerald-600">✓</span>
        )}
      </div>
    </div>
  );
}

function getStepDisplay(step: Step): { icon: string; label: string } {
  switch (step.toolName) {
    case 'web_search': {
      const query = String(step.args.query ?? '');
      return {
        icon: '🔍',
        label: `Searching: "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}"`,
      };
    }

    case 'fetch_url': {
      const url = String(step.args.url ?? '');
      const reason = step.args.reason ? String(step.args.reason) : null;
      let displayUrl: string;
      try {
        displayUrl = new URL(url).hostname;
      } catch {
        displayUrl = url.slice(0, 40);
      }
      return {
        icon: '📄',
        label: reason
          ? `Reading ${displayUrl} — ${reason}`
          : `Reading ${displayUrl}`,
      };
    }

    case 'format_memo': {
      const company = String(step.args.company ?? 'company');
      return {
        icon: '📋',
        label: `Formatting deal memo for ${company}…`,
      };
    }

    default:
      return {
        icon: '⚙️',
        label: `Running ${step.toolName}…`,
      };
  }
}
