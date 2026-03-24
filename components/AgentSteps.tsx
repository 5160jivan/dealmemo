'use client';

import { type Message } from 'ai/react';

interface AgentStepsProps {
  messages: Message[];
}

/**
 * Displays the agent's tool calls as visible "thinking" steps.
 * Shows what the agent is doing: searching, fetching, formatting.
 */
export default function AgentSteps({ messages }: AgentStepsProps) {
  // Collect all tool invocations from all messages
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

  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 pl-8">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
        Agent initializing...
      </div>
    );
  }

  return (
    <div className="space-y-2 pl-8">
      {steps.map((step, i) => (
        <StepRow key={i} step={step} index={i} />
      ))}
    </div>
  );
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
      className={`flex items-start gap-2.5 text-xs rounded-lg px-3 py-2 border transition-all
        ${isPending ? 'bg-gray-900/50 border-gray-800 text-gray-400' : ''}
        ${!isPending && !isError ? 'bg-gray-900/30 border-gray-800/50 text-gray-500' : ''}
        ${isError ? 'bg-red-950/20 border-red-900/50 text-red-400' : ''}
      `}
    >
      {/* Step number */}
      <span className="text-gray-700 font-mono flex-shrink-0 mt-0.5">
        {index + 1}.
      </span>

      {/* Icon */}
      <span className="flex-shrink-0">{icon}</span>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className={isPending ? 'text-gray-300' : ''}>{label}</span>
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {isPending ? (
          <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : isError ? (
          <span className="text-red-500">✗</span>
        ) : (
          <span className="text-emerald-500">✓</span>
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
        label: `Formatting deal memo for ${company}...`,
      };
    }

    default:
      return {
        icon: '⚙️',
        label: `Running ${step.toolName}...`,
      };
  }
}
