'use client';

import { useState } from 'react';
import type { DealMemo } from '@/lib/schemas/dealMemo';

interface DealMemoCardProps {
  memo: DealMemo;
}

/**
 * Renders a fully structured deal memo from parsed JSON.
 * Used when the agent successfully calls format_memo and returns structured data.
 */
export default function DealMemoCard({ memo }: DealMemoCardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'market', 'competitors', 'strengths', 'risks', 'verdict'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isOpen = (id: string) => expandedSections.has(id);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-100">{memo.company}</h2>
              {memo.overview.stage && (
                <span className="badge bg-gray-800 text-gray-400 border border-gray-700">
                  {memo.overview.stage}
                </span>
              )}
            </div>
            {memo.overview.headquarters && (
              <p className="text-xs text-gray-500">
                📍 {memo.overview.headquarters}
                {memo.overview.founded && ` · Founded ${memo.overview.founded}`}
              </p>
            )}
          </div>
          <VerdictBadge recommendation={memo.verdict.recommendation} size="lg" />
        </div>
        <p className="text-sm text-gray-300 mt-3">{memo.overview.description}</p>
        {memo.overview.founders && memo.overview.founders.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {memo.overview.founders.map((f, i) => (
              <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Market Analysis */}
      <Section
        id="market"
        icon="📈"
        title="Market Analysis"
        isOpen={isOpen('market')}
        onToggle={() => toggleSection('market')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Market Size" value={memo.market.size} />
            <MetricCard label="Growth" value={memo.market.growth} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BulletList
              title="Tailwinds"
              items={memo.market.tailwinds}
              color="emerald"
              icon="↑"
            />
            <BulletList
              title="Headwinds"
              items={memo.market.headwinds}
              color="orange"
              icon="↓"
            />
          </div>
        </div>
      </Section>

      {/* Competitors */}
      <Section
        id="competitors"
        icon="⚔️"
        title="Competitive Landscape"
        isOpen={isOpen('competitors')}
        onToggle={() => toggleSection('competitors')}
      >
        <div className="space-y-2">
          {memo.competitors.map((c, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-gray-600 font-mono text-xs mt-0.5 flex-shrink-0 w-4">
                {i + 1}.
              </span>
              <div>
                <span className="font-medium text-gray-200">{c.name}</span>
                <span className="text-gray-500 mx-1.5">—</span>
                <span className="text-gray-400">{c.differentiation}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Strengths and Risks side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section
          id="strengths"
          icon="💪"
          title="Strengths"
          isOpen={isOpen('strengths')}
          onToggle={() => toggleSection('strengths')}
        >
          <ul className="space-y-2">
            {memo.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="risks"
          icon="⚠️"
          title="Key Risks"
          isOpen={isOpen('risks')}
          onToggle={() => toggleSection('risks')}
        >
          <ul className="space-y-2">
            {memo.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Verdict */}
      <Section
        id="verdict"
        icon="⚖️"
        title="Verdict"
        isOpen={isOpen('verdict')}
        onToggle={() => toggleSection('verdict')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <VerdictBadge recommendation={memo.verdict.recommendation} size="md" />
          </div>
          <p className="text-sm text-gray-300">{memo.verdict.rationale}</p>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
              Key Questions to Resolve
            </p>
            <ul className="space-y-1.5">
              {memo.verdict.keyQuestions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-400">
                  <span className="text-brand-500 flex-shrink-0">?</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Sources */}
      {memo.sources && memo.sources.length > 0 && (
        <div className="text-xs text-gray-600 px-1">
          <span className="font-medium text-gray-500">Sources: </span>
          {memo.sources.map((src, i) => (
            <span key={i}>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-400 transition-colors"
              >
                [{i + 1}]
              </a>
              {i < memo.sources!.length - 1 && ' '}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-700 px-1">
        Generated {new Date(memo.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-gray-100">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-200 font-medium">{value}</p>
    </div>
  );
}

function BulletList({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: string[];
  color: 'emerald' | 'orange';
  icon: string;
}) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' : 'text-orange-400';
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5 text-xs text-gray-400">
            <span className={`${colorClass} flex-shrink-0`}>{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerdictBadge({
  recommendation,
  size,
}: {
  recommendation: DealMemo['verdict']['recommendation'];
  size: 'md' | 'lg';
}) {
  const config = {
    'Strong Buy': { bg: 'bg-emerald-900/60 border-emerald-700', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    'Buy': { bg: 'bg-green-900/50 border-green-800', text: 'text-green-300', dot: 'bg-green-400' },
    'Watch': { bg: 'bg-yellow-900/50 border-yellow-800', text: 'text-yellow-300', dot: 'bg-yellow-400' },
    'Pass': { bg: 'bg-red-900/50 border-red-800', text: 'text-red-300', dot: 'bg-red-400' },
  };

  const c = config[recommendation] ?? config['Watch'];
  const sizeClass = size === 'lg' ? 'px-4 py-2 text-sm font-semibold' : 'px-3 py-1 text-xs font-medium';

  return (
    <span className={`badge border ${c.bg} ${c.text} ${sizeClass} flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {recommendation}
    </span>
  );
}
