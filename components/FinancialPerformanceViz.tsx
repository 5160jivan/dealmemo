'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import type { FinancialVizPayload } from '@/lib/schemas/financialViz';

function formatKpiValue(
  value: number | string,
  unit?: string,
  currency?: string
): string {
  if (typeof value === 'string') return value;
  if (unit === '%') return `${value}%`;
  if (unit === 'x') return `${value}×`;
  if (unit === 'M' || unit === 'm')
    return `${currency === 'USD' || !currency ? '$' : ''}${value}M`;
  if (unit === 'B' || unit === 'b')
    return `${currency === 'USD' || !currency ? '$' : ''}${value}B`;
  if (unit === 'K' || unit === 'k')
    return `${currency === 'USD' || !currency ? '$' : ''}${value}K`;
  return String(value);
}

export default function FinancialPerformanceViz({ data }: { data: FinancialVizPayload }) {
  const rev = data.revenueOrMrrSeries?.filter((d) => Number.isFinite(d.value)) ?? [];
  const rounds = data.fundingRounds?.filter((r) => r.amountM != null && Number.isFinite(r.amountM)) ?? [];

  const chartTooltipStyle = {
    backgroundColor: 'rgba(255,255,255,0.96)',
    border: '1px solid rgb(231 229 228)',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="not-prose my-6 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-white to-cyan-50/40 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 m-0">Financial snapshot</h3>
          <p className="text-xs text-stone-500 m-0 mt-0.5">
            Key figures investors track — sourced from public disclosures where noted.
          </p>
        </div>
        {data.context && (
          <p className="text-xs text-amber-900/80 bg-amber-100/60 border border-amber-200/50 rounded-lg px-3 py-2 max-w-md">
            {data.context}
          </p>
        )}
      </div>

      {data.kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {data.kpis.map((k, i) => (
            <div
              key={`${k.label}-${i}`}
              className="rounded-xl border border-stone-200/80 bg-white/90 px-3 py-3 shadow-sm"
            >
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wide m-0 leading-tight">
                {k.label}
              </p>
              <p className="text-lg font-semibold text-stone-900 m-0 mt-1 tabular-nums">
                {formatKpiValue(k.value, k.unit, data.currency)}
              </p>
              {(k.period || k.note) && (
                <p className="text-[10px] text-stone-400 m-0 mt-1 leading-snug">
                  {[k.period, k.note].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rev.length >= 2 && (
          <div className="rounded-xl border border-stone-200/70 bg-white/80 p-3">
            <p className="text-xs font-semibold text-stone-700 m-0 mb-2 px-1">
              Revenue / ARR trajectory ({data.currency})
            </p>
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rev} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}B` : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [
                      value != null && typeof value === 'number'
                        ? value.toLocaleString()
                        : String(value ?? ''),
                      'Value',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ fill: '#ea580c', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {rounds.length >= 1 && (
          <div className="rounded-xl border border-stone-200/70 bg-white/80 p-3">
            <p className="text-xs font-semibold text-stone-700 m-0 mb-2 px-1">
              Funding rounds (USD millions, where disclosed)
            </p>
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rounds.map((r) => ({
                    name: r.year ? `${r.name} (${r.year})` : r.name,
                    amountM: r.amountM ?? 0,
                  }))}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} interval={0} angle={-12} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`$${value ?? ''}M`, 'Amount']}
                  />
                  <Bar dataKey="amountM" fill="#0891b2" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {data.kpis.length === 0 && rev.length < 2 && rounds.length < 1 && (
        <p className="text-sm text-stone-500 m-0 text-center py-4">
          No chartable financial series were included. Try another company or check disclosures.
        </p>
      )}
    </div>
  );
}
