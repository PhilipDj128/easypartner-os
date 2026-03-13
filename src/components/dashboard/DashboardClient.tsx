'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const { todos = [], stats = {} as { activeCustomers?: number; thisMonthRevenue?: number; openQuotes?: number; newLeads?: number }, leads = [], reminders = [] } = data ?? {};
  const kpis: { label: string; value: string | number; trend: 'up' | 'neutral' | 'down' }[] = [
    { label: 'Aktiva kunder', value: stats.activeCustomers ?? 0, trend: 'up' },
    { label: 'Omsättning denna månad', value: formatCurrency(stats.thisMonthRevenue ?? 0), trend: 'up' },
    { label: 'Öppna offerter', value: stats.openQuotes ?? 0, trend: 'neutral' },
    { label: 'Nya leads', value: stats.newLeads ?? 0, trend: 'up' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-[#94a3b8]">{formatDate(new Date().toISOString())}</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold text-white">
          Hej {userName}!
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Att göra</h2>
          {todos.length === 0 ? (
            <p className="mt-4 text-sm text-[#94a3b8]">Inget akut just nu.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {todos.slice(0, 8).map((t, i) => (
                <li key={i}>
                  <Link
                    href={t.href}
                    className="block rounded-lg border border-white/[0.06] p-4 text-sm text-white transition-all duration-150 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/5"
                  >
                    {t.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Snabbstatistik</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {kpis.map((kpi, i) => (
              <div key={i} className="rounded-lg bg-white/[0.04] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#94a3b8]">{kpi.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-heading text-2xl font-bold text-white">{kpi.value}</p>
                  {kpi.trend === 'up' && (
                    <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
                  )}
                  {kpi.trend === 'down' && (
                    <ArrowTrendingDownIcon className="h-5 w-5 text-rose-400" />
                  )}
                  {kpi.trend === 'neutral' && (
                    <span className="h-5 w-5 text-[#64748b]">−</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-white">Senaste leads</h2>
            <Link href="/prospektering" className="text-sm text-[#3b82f6] transition-colors hover:text-[#60a5fa]">
              Visa alla →
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="mt-4 text-sm text-[#94a3b8]">Inga nya leads.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {leads.map((l) => (
                <li key={(l as { id: string }).id} className="flex items-center justify-between rounded-lg border border-white/[0.06] p-4 transition-all duration-150 hover:bg-[#3b82f6]/5">
                  <span className="font-medium text-white">{(l as { company_name?: string }).company_name ?? '—'}</span>
                  <span className="rounded-full bg-[#3b82f6]/20 px-2.5 py-0.5 text-xs font-medium text-[#3b82f6]">
                    Score: {(l as { score?: number }).score ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Kommande påminnelser</h2>
          {reminders.length === 0 ? (
            <p className="mt-4 text-sm text-[#94a3b8]">Inga påminnelser.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {reminders.map((r) => (
                <li key={(r as { id: string }).id} className="rounded-lg border border-white/[0.06] p-4">
                  <p className="text-white">{(r as { message?: string }).message ?? (r as { type?: string }).type ?? 'Påminnelse'}</p>
                  <p className="mt-1 text-sm text-[#94a3b8]">
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

      <div className="flex flex-wrap gap-4">
        <Link
          href="/customers"
          className="btn-primary inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white"
        >
          Ny kund
        </Link>
        <Link
          href="/quotes"
          className="inline-flex items-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-white/5 hover:border-white/30"
        >
          Ny offert
        </Link>
        <Link
          href="/prospektering"
          className="inline-flex items-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-white/5 hover:border-white/30"
        >
          Starta prospektering
        </Link>
      </div>
    </div>
  );
}
