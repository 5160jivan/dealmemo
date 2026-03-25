'use client';

import { useState } from 'react';
import FinancialPerformanceViz from './FinancialPerformanceViz';
import { prepareMemoDisplay, FINANCE_VIZ_PLACEHOLDER } from '@/lib/parseFinancialSection';
import type { FinancialVizPayload } from '@/lib/schemas/financialViz';

interface MemoRendererProps {
  content: string;
  isStreaming: boolean;
}

export default function MemoRenderer({ content, isStreaming }: MemoRendererProps) {
  const [copied, setCopied] = useState(false);
  const { display, finance } = prepareMemoDisplay(content, isStreaming);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative group rounded-2xl border border-stone-200/90 bg-white bg-gradient-to-b from-white to-stone-50/90
        shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-12px_rgba(251,146,60,0.12),0_8px_16px_-8px_rgba(0,0,0,0.06)]
        ring-1 ring-stone-100"
    >
      {content && !isStreaming && (
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity
            text-xs text-stone-500 hover:text-stone-800 bg-stone-200/90 hover:bg-stone-200 px-2.5 py-1 rounded-lg font-medium"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}

      <div className="p-8 sm:p-10">
        <div className="prose prose-stone prose-sm max-w-none prose-headings:tracking-tight prose-headings:font-semibold">
          <MarkdownContent
            content={display}
            isStreaming={isStreaming}
            financeData={finance}
          />
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({
  content,
  isStreaming,
  financeData,
}: {
  content: string;
  isStreaming: boolean;
  financeData: FinancialVizPayload | null;
}) {
  if (!content) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm not-prose py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-cyan-500 animate-pulse" />
        Preparing your memo…
      </div>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === FINANCE_VIZ_PLACEHOLDER) {
      if (financeData) {
        elements.push(<FinancialPerformanceViz key={key++} data={financeData} />);
      }
      continue;
    }

    if (line.startsWith('## ')) {
      const title = line.replace('## ', '');
      const icon = getSectionIcon(title);
      elements.push(
        <div key={key++} className="flex items-center gap-2 mt-8 mb-3 first:mt-0 not-prose">
          <span className="text-lg" aria-hidden>
            {icon}
          </span>
          <h2 className="text-base font-semibold text-stone-900 m-0 tracking-tight">{title}</h2>
        </div>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-stone-800 mt-5 mb-2 m-0">
          {line.replace('### ', '')}
        </h3>
      );
      continue;
    }

    if (line.startsWith('---')) {
      elements.push(
        <hr key={key++} className="border-stone-200/90 my-5" />
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[-*] /, '');
      elements.push(
        <div key={key++} className="flex gap-2 text-sm text-stone-700 my-0.5 not-prose leading-relaxed">
          <span className="text-amber-500 mt-0.5 flex-shrink-0 font-bold">·</span>
          <span>
            <InlineMarkdown text={text} />
          </span>
        </div>
      );
      continue;
    }

    if (line.includes('**Recommendation:**')) {
      const verdict = extractVerdict(line);
      elements.push(
        <div key={key++} className="my-3 not-prose">
          <VerdictBadge verdict={verdict} />
        </div>
      );
      continue;
    }

    if (line.trim()) {
      elements.push(
        <p key={key++} className="text-sm text-stone-700 my-1.5 m-0 leading-relaxed">
          <InlineMarkdown text={line} />
        </p>
      );
    } else {
      elements.push(<div key={key++} className="h-1" />);
    }
  }

  if (isStreaming && elements.length > 0) {
    elements.push(
      <span
        key="cursor"
        className="inline-block w-0.5 h-4 bg-gradient-to-b from-amber-500 to-orange-500 animate-pulse ml-0.5 align-text-bottom not-prose rounded-sm"
      />
    );
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-stone-900 font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={i} className="text-stone-800">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    'Strong Buy': 'bg-emerald-50 text-emerald-900 border-emerald-200',
    Buy: 'bg-green-50 text-green-900 border-green-200',
    Watch: 'bg-amber-50 text-amber-950 border-amber-200',
    Pass: 'bg-red-50 text-red-900 border-red-200',
  };

  const colorClass = colors[verdict] || 'bg-stone-100 text-stone-800 border-stone-200';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-stone-500 font-medium">Recommendation</span>
      <span className={`badge border ${colorClass} text-sm px-3 py-1 font-medium`}>
        {verdict || 'See analysis'}
      </span>
    </div>
  );
}

function getSectionIcon(title: string): string {
  const icons: Record<string, string> = {
    'Company Overview': '🏢',
    'Recent Financial Performance': '💹',
    'Market Analysis': '📈',
    'Competitive Landscape': '⚔️',
    Strengths: '💪',
    'Key Risks': '⚠️',
    Verdict: '⚖️',
  };
  return icons[title] ?? '📌';
}

function extractVerdict(line: string): string {
  const match = line.match(/\*\*Recommendation:\*\*\s*\[?([^\]]+)\]?/);
  return match ? match[1].trim() : '';
}
