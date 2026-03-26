'use client';

import { useState } from 'react';

interface Props {
  memoId: string;
  company: string;
  variant?: 'icon' | 'button';
}

export default function ExportPptxButton({ memoId, company, variant = 'button' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}/pptx`);
      if (!res.ok) throw new Error('Export failed');

      const contentType = res.headers.get('Content-Type') ?? '';

      if (contentType.includes('json')) {
        // Vercel Blob — open URL in new tab
        const { url } = await res.json() as { url: string };
        const a = document.createElement('a');
        a.href = url;
        a.download = `${company}-deal-memo.pptx`;
        a.target = '_blank';
        a.click();
      } else {
        // Direct binary download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${company}-deal-memo.pptx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[ExportPptx]', err);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleExport}
        disabled={loading}
        className="p-1 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
        title={loading ? 'Generating…' : 'Export as PowerPoint'}
      >
        {loading ? <SpinnerIcon /> : <PptxIcon />}
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-amber-700
        bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300
        px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
    >
      {loading ? <SpinnerIcon /> : <PptxIcon />}
      {loading ? 'Generating…' : 'Export PPT'}
    </button>
  );
}

function PptxIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 3v6h6M9 17v-4m0 0h2.5a1.5 1.5 0 010 3H9m0-3v3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
