'use client';

import { useState } from 'react';

interface MemoRendererProps {
  content: string;
  isStreaming: boolean;
}

// Simple markdown-to-JSX renderer for deal memos
export default function MemoRenderer({ content, isStreaming }: MemoRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card relative group">
      {/* Copy button */}
      {content && !isStreaming && (
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity
                     text-xs text-gray-500 hover:text-gray-300 bg-gray-800 px-2 py-1 rounded"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      )}

      {/* Rendered memo */}
      <div className="prose prose-invert prose-sm max-w-none">
        <MarkdownContent content={content} isStreaming={isStreaming} />
      </div>
    </div>
  );
}

function MarkdownContent({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  if (!content) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
        Generating deal memo...
      </div>
    );
  }

  // Parse content into sections for structured rendering
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H2 headers (## Section Name)
    if (line.startsWith('## ')) {
      const title = line.replace('## ', '');
      const icon = getSectionIcon(title);
      elements.push(
        <div key={key++} className="flex items-center gap-2 mt-6 mb-3 first:mt-0">
          <span className="text-lg">{icon}</span>
          <h2 className="text-base font-semibold text-gray-100 m-0">{title}</h2>
        </div>
      );
      continue;
    }

    // H3 headers (### Sub-section)
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-gray-200 mt-4 mb-2 m-0">
          {line.replace('### ', '')}
        </h3>
      );
      continue;
    }

    // Horizontal rule
    if (line.startsWith('---')) {
      elements.push(<hr key={key++} className="border-gray-800 my-4" />);
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[-*] /, '');
      elements.push(
        <div key={key++} className="flex gap-2 text-sm text-gray-300 my-0.5">
          <span className="text-brand-400 mt-0.5 flex-shrink-0">•</span>
          <span><InlineMarkdown text={text} /></span>
        </div>
      );
      continue;
    }

    // Verdict recommendation line (special styling)
    if (line.includes('**Recommendation:**')) {
      const verdict = extractVerdict(line);
      elements.push(
        <div key={key++} className="my-2">
          <VerdictBadge verdict={verdict} />
        </div>
      );
      continue;
    }

    // Regular paragraph lines
    if (line.trim()) {
      elements.push(
        <p key={key++} className="text-sm text-gray-300 my-1 m-0">
          <InlineMarkdown text={line} />
        </p>
      );
    } else {
      // Empty line = spacing
      elements.push(<div key={key++} className="h-1" />);
    }
  }

  // Add streaming cursor to last element
  if (isStreaming && elements.length > 0) {
    elements.push(
      <span key="cursor" className="inline-block w-0.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-text-bottom" />
    );
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle **bold** and *italic* inline
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-gray-100 font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} className="text-gray-200">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    'Strong Buy': 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
    'Buy': 'bg-green-900/50 text-green-300 border-green-800',
    'Watch': 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
    'Pass': 'bg-red-900/50 text-red-300 border-red-800',
  };

  const colorClass = colors[verdict] || 'bg-gray-800 text-gray-300 border-gray-700';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 font-medium">Recommendation:</span>
      <span className={`badge border ${colorClass} text-sm px-3 py-1`}>
        {verdict || 'See analysis'}
      </span>
    </div>
  );
}

function getSectionIcon(title: string): string {
  const icons: Record<string, string> = {
    'Company Overview': '🏢',
    'Market Analysis': '📈',
    'Competitive Landscape': '⚔️',
    'Strengths': '💪',
    'Key Risks': '⚠️',
    'Verdict': '⚖️',
  };
  return icons[title] ?? '📌';
}

function extractVerdict(line: string): string {
  const match = line.match(/\*\*Recommendation:\*\*\s*\[?([^\]]+)\]?/);
  return match ? match[1].trim() : '';
}
