'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
      <div className="flex justify-center py-12">
        <p className="text-sand-200">Laddar…</p>
      </div>
    );
  }

  const { todos = [], stats = {} as { activeCustomers?: number; thisMonthRevenue?: number; openQuotes?: number; newLeads?: number }, leads = [], reminders = [] } = data ?? {};

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sand-200">{formatDate(new Date().toISOString())}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-brand-900">
          Hej {userName}!
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-brand-900">Att göra</h2>
          {todos.length === 0 ? (
            <p className="mt-4 text-sm text-sand-200">Inget akut just nu.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {todos.slice(0, 8).map((t, i) => (
                <li key={i}>
                  <Link
                    href={t.href}
                    className="block rounded-lg border border-sand-100 p-3 text-sm text-brand-900 transition-colors hover:bg-sand-50"
                  >
                    {t.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-brand-900">Snabbstatistik</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-sand-50 p-4">
              <p className="text-sm text-brand-600">Aktiva kunder</p>
              <p className="font-serif text-2xl font-semibold text-brand-900">{stats.activeCustomers ?? 0}</p>
            </div>
            <div className="rounded-lg bg-sand-50 p-4">
              <p className="text-sm text-brand-600">Omsättning denna månad</p>
              <p className="font-serif text-2xl font-semibold text-brand-900">{formatCurrency(stats.thisMonthRevenue ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-sand-50 p-4">
              <p className="text-sm text-brand-600">Öppna offerter</p>
              <p className="font-serif text-2xl font-semibold text-brand-900">{stats.openQuotes ?? 0}</p>
            </div>
            <div className="rounded-lg bg-sand-50 p-4">
              <p className="text-sm text-brand-600">Nya leads</p>
              <p className="font-serif text-2xl font-semibold text-brand-900">{stats.newLeads ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-brand-900">Senaste leads</h2>
            <Link href="/prospektering" className="text-sm text-brand-600 hover:text-brand-900">Visa alla →</Link>
          </div>
          {leads.length === 0 ? (
            <p className="mt-4 text-sm text-sand-200">Inga nya leads.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {leads.map((l) => (
                <li key={(l as { id: string }).id} className="flex justify-between rounded-lg border border-sand-100 p-3 text-sm">
                  <span className="font-medium text-brand-900">{(l as { company_name?: string }).company_name ?? '—'}</span>
                  <span className="text-sand-200">Score: {(l as { score?: number }).score ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-brand-900">Kommande påminnelser</h2>
          {reminders.length === 0 ? (
            <p className="mt-4 text-sm text-sand-200">Inga påminnelser.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {reminders.map((r) => (
                <li key={(r as { id: string }).id} className="rounded-lg border border-sand-100 p-3 text-sm">
                  <p className="text-brand-900">{(r as { message?: string }).message ?? (r as { type?: string }).type ?? 'Påminnelse'}</p>
                  <p className="mt-1 text-sand-200">
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
          className="inline-flex items-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          Ny kund
        </Link>
        <Link
          href="/quotes"
          className="inline-flex items-center rounded-lg border border-brand-500 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          Ny offert
        </Link>
        <Link
          href="/prospektering"
          className="inline-flex items-center rounded-lg border border-brand-500 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          Starta prospektering
        </Link>
      </div>
    </div>
  );
}
