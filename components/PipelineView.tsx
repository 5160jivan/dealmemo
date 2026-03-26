'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { DealStatus, MemoSummary } from '@/lib/memoStore';
import { DEAL_STATUSES, STATUS_LABELS } from '@/lib/memoStore';

const STATUS_COLORS: Record<DealStatus, string> = {
  invested: 'bg-green-100 text-green-700 border-green-200',
  buy:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  watch:    'bg-amber-100 text-amber-700 border-amber-200',
  pass:     'bg-red-100 text-red-600 border-red-200',
  unreviewed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function PipelineView() {
  const [memos, setMemos] = useState<MemoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DealStatus | 'all'>('all');

  useEffect(() => {
    fetch('/api/memos')
      .then((r) => r.ok ? r.json() : [])
      .then((data: MemoSummary[]) => setMemos(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: DealStatus) => {
    setMemos((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
    await fetch(`/api/memo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const updateNotes = async (id: string, notes: string) => {
    await fetch(`/api/memo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  };

  const counts = DEAL_STATUSES.reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s]: memos.filter((m) => m.status === s).length }),
    { all: memos.length }
  );

  const visible = filter === 'all' ? memos : memos.filter((m) => m.status === filter);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Pipeline</h1>
        <p className="text-slate-500 text-sm">{memos.length} deal{memos.length !== 1 ? 's' : ''} tracked</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterTab
          label="All"
          count={memos.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {DEAL_STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={STATUS_LABELS[s]}
            count={counts[s] ?? 0}
            active={filter === s}
            onClick={() => setFilter(s)}
            statusColor={STATUS_COLORS[s]}
          />
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading…</div>
      ) : visible.length === 0 ? (
        <EmptyPipeline filter={filter} />
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60">
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 w-[30%]">
                  Company
                </th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 w-[14%]">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500 w-[14%]">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-500">
                  Notes
                </th>
                <th className="px-4 py-3 w-[5%]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((memo) => (
                <PipelineRow
                  key={memo.id}
                  memo={memo}
                  onStatusChange={(s) => updateStatus(memo.id, s)}
                  onNotesBlur={(n) => updateNotes(memo.id, n)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
  statusColor,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  statusColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
      }`}
    >
      {statusColor && !active && (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusColor}`}>
          {label}
        </span>
      )}
      {(!statusColor || active) && <span>{label}</span>}
      <span className={`text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function PipelineRow({
  memo,
  onStatusChange,
  onNotesBlur,
}: {
  memo: MemoSummary;
  onStatusChange: (s: DealStatus) => void;
  onNotesBlur: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(memo.notes ?? '');
  const [editing, setEditing] = useState(false);
  const notesRef = useRef<HTMLInputElement>(null);

  const date = new Date(memo.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <tr className="group hover:bg-stone-50/60 transition-colors">
      {/* Company */}
      <td className="px-4 py-3">
        <Link
          href={`/memo/${memo.id}`}
          className="font-semibold text-slate-800 hover:text-amber-700 transition-colors"
        >
          {memo.company}
        </Link>
      </td>

      {/* Status dropdown */}
      <td className="px-4 py-3">
        <select
          value={memo.status}
          onChange={(e) => onStatusChange(e.target.value as DealStatus)}
          className={`text-[11px] font-semibold px-2 py-1 rounded-md border cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors
            ${STATUS_COLORS[memo.status]}`}
        >
          {DEAL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-slate-500 tabular-nums">{date}</td>

      {/* Notes */}
      <td className="px-4 py-3">
        {editing ? (
          <input
            ref={notesRef}
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              setEditing(false);
              onNotesBlur(notes);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') notesRef.current?.blur();
              if (e.key === 'Escape') {
                setNotes(memo.notes ?? '');
                setEditing(false);
              }
            }}
            autoFocus
            className="w-full text-sm text-slate-700 bg-white border border-amber-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Add a note…"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`text-left w-full text-sm rounded-md px-2 py-1 transition-colors ${
              notes
                ? 'text-slate-600 hover:bg-amber-50/60'
                : 'text-slate-300 hover:text-slate-400 hover:bg-stone-100 italic'
            }`}
          >
            {notes || 'Add a note…'}
          </button>
        )}
      </td>

      {/* Open link */}
      <td className="px-4 py-3 text-right">
        <Link
          href={`/memo/${memo.id}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700"
          title="Open memo"
        >
          <OpenIcon />
        </Link>
      </td>
    </tr>
  );
}

function EmptyPipeline({ filter }: { filter: DealStatus | 'all' }) {
  return (
    <div className="py-20 text-center">
      <p className="text-slate-400 text-sm">
        {filter === 'all'
          ? 'No deals yet — research a company to get started.'
          : `No ${STATUS_LABELS[filter as DealStatus].toLowerCase()} deals.`}
      </p>
      {filter === 'all' && (
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
        >
          Research a company →
        </Link>
      )}
    </div>
  );
}

function OpenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
