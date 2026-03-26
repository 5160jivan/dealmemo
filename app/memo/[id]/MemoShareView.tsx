'use client';

import MemoRenderer from '@/components/MemoRenderer';
import ExportPptxButton from '@/components/ExportPptxButton';
import Link from 'next/link';
import type { MemoRecord } from '@/lib/memoStore';

export default function MemoShareView({ memo }: { memo: MemoRecord }) {
  const date = new Date(memo.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen py-10 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500 mb-1">
              Deal Memo
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">{memo.company}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Generated {date}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportPptxButton memoId={memo.id} company={memo.company} />
            <Link
              href="/"
              className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg transition-colors"
            >
              Research a company
            </Link>
          </div>
        </div>
        <MemoRenderer content={memo.text} isStreaming={false} />
      </div>
    </div>
  );
}
