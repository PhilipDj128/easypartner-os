'use client';

import type { PageSpeedResult } from '@/types/audit';

function parseMs(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.,]/g, '').replace(',', '.'));
  if (val.includes('s') && !val.includes('ms')) return n * 1000;
  return n;
}

function parseCls(val: string): number {
  return parseFloat(val.replace(',', '.')) || 0;
}

function getVitalColor(metric: 'lcp' | 'cls' | 'tbt', value: string): string {
  if (metric === 'lcp') {
    const ms = parseMs(value);
    if (ms <= 2500) return 'text-emerald-400';
    if (ms <= 4000) return 'text-amber-400';
    return 'text-rose-400';
  }
  if (metric === 'cls') {
    const v = parseCls(value);
    if (v <= 0.1) return 'text-emerald-400';
    if (v <= 0.25) return 'text-amber-400';
    return 'text-rose-400';
  }
  // tbt
  const ms = parseMs(value);
  if (ms <= 200) return 'text-emerald-400';
  if (ms <= 600) return 'text-amber-400';
  return 'text-rose-400';
}

function getVitalBg(metric: 'lcp' | 'cls' | 'tbt', value: string): string {
  const color = getVitalColor(metric, value);
  if (color.includes('emerald')) return 'bg-emerald-400/10';
  if (color.includes('amber')) return 'bg-amber-400/10';
  return 'bg-rose-400/10';
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[var(--muted-foreground)]">{label}</span>
        <span className="font-medium text-[var(--foreground)]">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5">
        <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function CoreWebVitals({ data, label }: { data: PageSpeedResult; label: string }) {
  const vitals: { key: 'lcp' | 'cls' | 'tbt'; name: string; desc: string }[] = [
    { key: 'lcp', name: 'LCP', desc: 'Largest Contentful Paint' },
    { key: 'cls', name: 'CLS', desc: 'Cumulative Layout Shift' },
    { key: 'tbt', name: 'TBT', desc: 'Total Blocking Time' },
  ];

  return (
    <div className="card rounded-xl p-5 space-y-5">
      <h3 className="font-heading text-lg font-semibold text-[var(--foreground)]">{label}</h3>

      <div className="grid gap-3 sm:grid-cols-3">
        {vitals.map((v) => (
          <div key={v.key} className={`rounded-lg p-4 ${getVitalBg(v.key, data.vitals[v.key])}`}>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{v.name}</p>
            <p className={`mt-1 text-2xl font-bold ${getVitalColor(v.key, data.vitals[v.key])}`}>
              {data.vitals[v.key]}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{v.desc}</p>
          </div>
        ))}
      </div>

      {data.vitals.speedIndex && data.vitals.speedIndex !== '—' && (
        <div className="rounded-lg bg-white/5 p-3">
          <span className="text-sm text-[var(--muted-foreground)]">Speed Index: </span>
          <span className="text-sm font-medium text-[var(--foreground)]">{data.vitals.speedIndex}</span>
        </div>
      )}

      <div className="space-y-3">
        <ScoreBar score={data.performance} label="Performance" />
        <ScoreBar score={data.accessibility} label="Accessibility" />
        <ScoreBar score={data.seo} label="SEO" />
        <ScoreBar score={data.bestPractices} label="Best Practices" />
      </div>
    </div>
  );
}
