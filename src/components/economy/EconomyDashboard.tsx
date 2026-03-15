'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyData {
  month: number;
  year: number;
  label: string;
  revenue: number;
  expenses: number;
}

interface EconomyData {
  thisMonthRevenue: number;
  thisMonthExpenses: number;
  margin: number;
  monthlyData: MonthlyData[];
}

interface Customer {
  id: string;
  name: string;
}

const EXPENSE_CATEGORIES = [
  'Löner',
  'Kontor',
  'Hosting',
  'Verktyg',
  'Reklam',
  'Övrigt',
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

export function EconomyDashboard({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [data, setData] = useState<EconomyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    setFetchError(null);
    try {
      const res = await fetch('/api/economy');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setData(null);
        setFetchError(json.error || 'Kunde inte hämta data');
      }
    } catch {
      setData(null);
      setFetchError('Nätverksfel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevenueSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSubmitting(true);
    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: fd.get('customer_id') || null,
          amount: parseFloat((fd.get('amount') as string) || '0'),
          service: fd.get('service') || null,
          month: parseInt((fd.get('month') as string) || String(currentMonth), 10),
          year: parseInt((fd.get('year') as string) || String(currentYear), 10),
        }),
      });
      if (res.ok) {
        setRevenueOpen(false);
        form.reset();
        await fetchData();
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.details ? `${err.error}\n\n${err.details}` : (err.error || 'Kunde inte spara'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: fd.get('category') || null,
          description: fd.get('description') || null,
          amount: parseFloat((fd.get('amount') as string) || '0'),
          month: parseInt((fd.get('month') as string) || String(currentMonth), 10),
          year: parseInt((fd.get('year') as string) || String(currentYear), 10),
          supplier: fd.get('supplier') || null,
        }),
      });
      if (res.ok) {
        setExpenseOpen(false);
        form.reset();
        await fetchData();
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.details ? `${err.error}\n\n${err.details}` : (err.error || 'Kunde inte spara'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--muted-foreground)]">Laddar ekonomi…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="card rounded-xl border-rose-500/30 p-6 text-rose-400">
          <p className="font-semibold">Kunde inte ladda ekonomidatan</p>
          <p className="mt-2 text-sm">{fetchError}</p>
          <p className="mt-4 text-sm">
            Skapa tabellerna <code className="rounded bg-red-100 px-1">revenue</code> och{' '}
            <code className="rounded bg-red-100 px-1">expenses</code> i Supabase. Gå till SQL Editor
            och kör följande:
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-white p-4 text-xs">
{`create table revenue (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  customer_id uuid references customers(id),
  amount numeric not null,
  service text,
  month integer,
  year integer,
  recurring boolean default false
);

create table expenses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  category text,
  description text,
  amount numeric not null,
  month integer,
  year integer,
  supplier text
);`}
          </pre>
        </div>
      </div>
    );
  }

  const expenseRatio = data.thisMonthRevenue > 0
    ? (data.thisMonthExpenses / data.thisMonthRevenue) * 100
    : 0;
  const showWarning = expenseRatio > 60;

  const chartData = data.monthlyData.map((d) => ({
    name: d.label,
    Intäkter: d.revenue,
    Utgifter: d.expenses,
  }));

  return (
    <div className="space-y-10">
      {/* Varning */}
      {showWarning && (
        <div className="card rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-5 text-rose-400">
          <p className="font-semibold">Varning: Utgifterna överstiger 60% av intäkterna</p>
          <p className="mt-1 text-sm">
            Utgiftsandelen är {expenseRatio.toFixed(1)}% denna månad. Överväg att öka intäkterna
            eller minska kostnaderna.
          </p>
        </div>
      )}

      {/* KPI-kort */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Omsättning (denna månad)
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(data.thisMonthRevenue)}
          </p>
        </div>
        <div className="card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Utgifter (denna månad)
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(data.thisMonthExpenses)}
          </p>
        </div>
        <div className="card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Marginal
          </p>
          <p
            className={`mt-2 font-heading text-2xl font-semibold ${
              data.margin >= 0 ? 'text-[var(--foreground)]' : 'text-rose-400'
            }`}
          >
            {data.margin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Grafen */}
      <div className="card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
        <h3 className="mb-6 font-heading text-lg font-semibold text-[var(--foreground)]">
          Intäkter vs utgifter — senaste 12 månaderna
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
                contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="Intäkter" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Utgifter" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Formulär-knappar */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setRevenueOpen(true)}
          className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150"
        >
          + Logga intäkt
        </button>
        <button
          type="button"
          onClick={() => setExpenseOpen(true)}
          className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150 hover:bg-white/5"
        >
          + Logga utgift
        </button>
      </div>

      {/* Modal: Ny intäkt */}
      {revenueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md rounded-xl border-white/20 p-6">
            <h3 className="font-heading text-xl font-semibold text-[var(--foreground)]">Ny intäkt</h3>
            <form onSubmit={handleRevenueSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Kund</label>
                <select
                  name="customer_id"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                >
                  <option value="">— Välj kund —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[var(--card)] text-[var(--foreground)]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Belopp (kr) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Tjänst</label>
                <input
                  type="text"
                  name="service"
                  placeholder="t.ex. Hemsida, SEO"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)]">Månad</label>
                  <select
                    name="month"
                    defaultValue={currentMonth}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m} className="bg-[var(--card)] text-[var(--foreground)]">
                        {new Date(2000, m - 1).toLocaleString('sv', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)]">År</label>
                  <input
                    type="number"
                    name="year"
                    defaultValue={currentYear}
                    min="2020"
                    max="2030"
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setRevenueOpen(false)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-[var(--foreground)] transition-all duration-150 hover:bg-white/5"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary rounded-lg px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
                >
                  {submitting ? 'Sparar…' : 'Spara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ny utgift */}
      {expenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md rounded-xl border-white/20 p-6">
            <h3 className="font-heading text-xl font-semibold text-[var(--foreground)]">Ny utgift</h3>
            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Kategori</label>
                <select
                  name="category"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                >
                  <option value="">— Välj —</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[var(--card)] text-[var(--foreground)]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Beskrivning</label>
                <input
                  type="text"
                  name="description"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Belopp (kr) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Leverantör</label>
                <input
                  type="text"
                  name="supplier"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)]">Månad</label>
                  <select
                    name="month"
                    defaultValue={currentMonth}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m} className="bg-[var(--card)] text-[var(--foreground)]">
                        {new Date(2000, m - 1).toLocaleString('sv', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)]">År</label>
                  <input
                    type="number"
                    name="year"
                    defaultValue={currentYear}
                    min="2020"
                    max="2030"
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setExpenseOpen(false)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-[var(--foreground)] transition-all duration-150 hover:bg-white/5"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary rounded-lg px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
                >
                  {submitting ? 'Sparar…' : 'Spara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
