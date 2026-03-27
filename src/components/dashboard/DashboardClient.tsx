'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, Receipt, Target, Zap, ArrowRight, Bell, CheckCircle2 } from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';

interface DashboardData {
  todos: { type: string; text: string; href: string }[];
  stats: { activeCustomers: number; thisMonthRevenue: number; openQuotes: number; newLeads: number; nightlyLeads?: number };
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

  const userName = process.env.NEXT_PUBLIC_USER_NAME || 'Philip';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Laddar dashboard...</p>
      </div>
    );
  }

  const {
    todos = [],
    stats = {} as { activeCustomers?: number; thisMonthRevenue?: number; openQuotes?: number; newLeads?: number; nightlyLeads?: number },
    leads = [],
    reminders = [],
  } = data ?? {};

  const kpis: { label: string; value: string | number; trend: 'up' | 'neutral' | 'down'; icon?: React.ReactNode }[] = [
    { label: 'Aktiva kunder', value: stats.activeCustomers ?? 0, trend: 'up', icon: <Users className="h-4 w-4" /> },
    { label: 'Omsättning denna månad', value: formatCurrency(stats.thisMonthRevenue ?? 0), trend: 'up', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Öppna offerter', value: stats.openQuotes ?? 0, trend: 'neutral', icon: <Target className="h-4 w-4" /> },
    { label: 'Nya leads', value: stats.newLeads ?? 0, trend: 'up', icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 50%, rgba(0,0,0,0) 100%)',
          border: '1px solid rgba(99,102,241,0.1)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
        />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1
          className="mt-2 font-heading text-3xl font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          Hej {userName}
          <span style={{ color: '#818cf8' }}>.</span>
        </h1>

        {stats.nightlyLeads && stats.nightlyLeads > 0 ? (
          <button
            type="button"
            onClick={() => { window.location.href = '/prospektering?source=auto-nightly'; }}
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all hover:scale-105"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.15)',
              color: '#86efac',
            }}
          >
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Nytt från natten: {stats.nightlyLeads} leads
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpis.map((kpi, i) => (
          <KPICard key={i} label={kpi.label} value={kpi.value} trend={kpi.trend} icon={kpi.icon} />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Att göra */}
        <div
          className="rounded-xl p-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5" style={{ color: '#818cf8' }} />
            <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Att göra
            </h2>
          </div>
          {todos.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Inget akut just nu — bra jobbat!
            </p>
          ) : (
            <ul className="space-y-2">
              {todos.slice(0, 8).map((t, i) => (
                <li key={i}>
                  <Link
                    href={t.href}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      color: 'var(--foreground)',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    <span>{t.text}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Senaste leads */}
        <div
          className="rounded-xl p-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: '#818cf8' }} />
              <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Senaste leads
              </h2>
            </div>
            <Link href="/prospektering" className="text-sm hover:underline" style={{ color: '#a5b4fc' }}>
              Visa alla →
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Inga nya leads ännu.
            </p>
          ) : (
            <ul className="space-y-1">
              {leads.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {l.company_name ?? '—'}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: l.score && l.score >= 70 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                      color: l.score && l.score >= 70 ? '#86efac' : 'var(--muted)',
                    }}
                  >
                    {l.score ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Påminnelser */}
      {reminders.length > 0 && (
        <div
          className="rounded-xl p-6 mb-8"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5" style={{ color: '#fbbf24' }} />
            <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Kommande påminnelser
            </h2>
          </div>
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="rounded-lg px-4 py-3"
                style={{
                  background: 'rgba(251,191,36,0.04)',
                  border: '1px solid rgba(251,191,36,0.08)',
                }}
              >
                <p style={{ color: 'var(--foreground)' }}>{r.message ?? r.type ?? 'Påminnelse'}</p>
                {r.due_date && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {formatDate(r.due_date)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            boxShadow: '0 0 20px rgba(99,102,241,0.2)',
          }}
        >
          <Users className="h-4 w-4" />
          Ny kund
        </Link>
        <Link
          href="/quotes"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--muted)',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
            (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
          }}
        >
          <Receipt className="h-4 w-4" />
          Ny offert
        </Link>
        <Link
          href="/prospektering"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--muted)',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
            (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
          }}
        >
          <Target className="h-4 w-4" />
          Starta prospektering
        </Link>
      </div>
    </div>
  );
}
