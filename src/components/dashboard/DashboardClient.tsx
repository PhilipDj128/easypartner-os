'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';

interface DashboardData {
  todos: { type: string; text: string; href: string }[];
  stats: { activeCustomers: number; thisMonthRevenue: number; openQuotes: number; newLeads: number };
  leads: { id: string; company_name?: string; website?: string; score?: number }[];
  reminders: { id: string; message?: string; due_date?: string; type?: string }[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const userName = process.env.NEXT_PUBLIC_USER_NAME || 'där';

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  const { todos = [], stats = {} as { activeCustomers?: number; thisMonthRevenue?: number; openQuotes?: number; newLeads?: number }, leads = [], reminders = [] } = data ?? {};
  const kpis: { label: string; value: string | number; trend: 'up' | 'neutral' | 'down'; icon?: React.ReactNode }[] = [
    { label: 'Aktiva kunder', value: stats.activeCustomers ?? 0, trend: 'up', icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Omsättning denna månad', value: formatCurrency(stats.thisMonthRevenue ?? 0), trend: 'up', icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Öppna offerter', value: stats.openQuotes ?? 0, trend: 'neutral' },
    { label: 'Nya leads', value: stats.newLeads ?? 0, trend: 'up', icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div>
        <p className="text-sm text-[var(--muted-foreground)]">{formatDate(new Date().toISOString())}</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold text-[var(--foreground)]">
          Hej {userName}!
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KPICard key={i} label={kpi.label} value={kpi.value} trend={kpi.trend} icon={kpi.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">Att göra</h2>
          {todos.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">Inget akut just nu.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {todos.slice(0, 8).map((t, i) => (
                <li key={i}>
                  <Link
                    href={t.href}
                    className="table-row-hover flex items-center rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                  >
                    {t.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">Senaste leads</h2>
            <Link href="/prospektering" className="text-sm text-indigo-400 hover:underline">
              Visa alla →
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">Inga nya leads.</p>
          ) : (
            <ul className="mt-4 space-y-0">
              {leads.map((l) => (
                <li key={(l as { id: string }).id} className="table-row-hover flex items-center justify-between border-b border-white/5 px-4 last:border-0">
                  <span className="font-medium text-[var(--foreground)]">{(l as { company_name?: string }).company_name ?? '—'}</span>
                  <span className="badge-gray px-2 py-0.5 text-xs">
                    Score: {(l as { score?: number }).score ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">Kommande påminnelser</h2>
          {reminders.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">Inga påminnelser.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {reminders.map((r) => (
                <li key={(r as { id: string }).id} className="rounded-lg border border-[var(--border)] p-4">
                  <p className="text-[var(--foreground)]">{(r as { message?: string }).message ?? (r as { type?: string }).type ?? 'Påminnelse'}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {(r as { due_date?: string }).due_date
                      ? formatDate((r as { due_date: string }).due_date)
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/customers" className="btn-primary inline-flex items-center px-5 py-2.5 text-sm">
          Ny kund
        </Link>
        <Link href="/quotes" className="btn-outline inline-flex items-center px-5 py-2.5 text-sm">
          Ny offert
        </Link>
        <Link href="/prospektering" className="btn-outline inline-flex items-center px-5 py-2.5 text-sm">
          Starta prospektering
        </Link>
      </div>
    </div>
  );
}
