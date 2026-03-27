'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Receipt,
  Target,
  Zap,
  ArrowRight,
  Bell,
  CheckCircle2,
  Bot,
  Send,
  Home,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  FileCheck,
  PieChart,
  Activity,
  BarChart3,
} from 'lucide-react';

interface DashboardData {
  todos: { type: string; text: string; href: string }[];
  stats: {
    activeCustomers: number;
    thisMonthRevenue: number;
    openQuotes: number;
    newLeads: number;
    nightlyLeads?: number;
  };
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

/* Circular Gauge */
function CircularGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
          <circle
            cx="24" cy="24" r={radius}
            stroke={color} strokeWidth="4" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* Donut Chart placeholder */
function DonutChart({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
          {segments.map((seg, i) => {
            const dashLength = circumference * (seg.pct / 100);
            const dashGap = circumference - dashLength;
            const rotation = (cumulativeOffset / 100) * 360;
            cumulativeOffset += seg.pct;
            return (
              <circle
                key={i}
                cx="32" cy="32" r={radius}
                stroke={seg.color} strokeWidth="8" fill="none"
                strokeDasharray={`${dashLength} ${dashGap}`}
                transform={`rotate(${rotation} 32 32)`}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-white/70">{seg.label} ({seg.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Bar Row */
function BarRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-white/50 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-3.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiQuery, setAiQuery] = useState('');

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-white/40">Laddar dashboard...</p>
      </div>
    );
  }

  const {
    todos = [],
    stats = {} as DashboardData['stats'],
    leads = [],
    reminders = [],
  } = data ?? {};

  const totalLeads = (stats.newLeads ?? 0) + (stats.activeCustomers ?? 0) + (stats.openQuotes ?? 0);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* === HERO SECTION with dynamic background === */}
      <div
        className="relative overflow-hidden rounded-2xl mb-8"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-900/70" />

        <div className="relative p-8">
          <p className="text-sm text-white/50">
            {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Hej {userName}
            <span className="text-blue-400">.</span>
          </h1>

          {stats.nightlyLeads && stats.nightlyLeads > 0 ? (
            <button
              type="button"
              onClick={() => { window.location.href = '/prospektering?source=auto-nightly'; }}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all hover:scale-105 bg-green-500/20 border border-green-500/30 text-green-300"
            >
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Nytt från natten: {stats.nightlyLeads} leads
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* === KPI CARDS with glassmorphism === */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card 1 - Kunder */}
        <div className="group relative overflow-hidden rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10 transition-all hover:border-blue-500/30 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Aktiva kunder</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-white">{stats.activeCustomers ?? 0}</span>
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />+15%
            </span>
          </div>
        </div>

        {/* Card 2 - Omsättning */}
        <div className="group relative overflow-hidden rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10 transition-all hover:border-green-500/30 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Omsättning</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-green-400" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-white">{formatCurrency(stats.thisMonthRevenue ?? 0)}</span>
          </div>
        </div>

        {/* Card 3 - Offerter */}
        <div className="group relative overflow-hidden rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10 transition-all hover:border-amber-500/30 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Öppna offerter</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Target className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-white">{stats.openQuotes ?? 0}</span>
          </div>
        </div>

        {/* Card 4 - Gauge */}
        <div className="group relative overflow-hidden rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10 transition-all hover:border-indigo-500/30 hover:scale-[1.02] flex items-center justify-around">
          <CircularGauge value={stats.newLeads ?? 0} max={Math.max(stats.newLeads ?? 1, 50)} label="Nya leads" color="#3B82F6" />
          <CircularGauge value={stats.openQuotes ?? 0} max={Math.max(stats.openQuotes ?? 1, 20)} label="Offerter" color="#F59E0B" />
        </div>
      </div>

      {/* === CHARTS ROW === */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Donut Chart */}
        <div className="rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-medium text-white">Fördelning</h3>
          </div>
          <DonutChart
            segments={[
              { label: 'Kunder', pct: 50, color: '#3B82F6' },
              { label: 'Leads', pct: 30, color: '#22C55E' },
              { label: 'Offerter', pct: 20, color: '#F59E0B' },
            ]}
          />
        </div>

        {/* Bar Chart */}
        <div className="rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-medium text-white">Lead-status</h3>
          </div>
          <div className="space-y-3">
            <BarRow label="Ny" pct={80} color="#22C55E" />
            <BarRow label="Kontaktad" pct={45} color="#3B82F6" />
            <BarRow label="Offert" pct={25} color="#F59E0B" />
            <BarRow label="Stängd" pct={15} color="#8B5CF6" />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Aktivitet</h3>
          </div>
          {todos.length === 0 && reminders.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">Inget akut just nu — bra jobbat!</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {todos.slice(0, 5).map((t, i) => (
                <li key={i}>
                  <Link
                    href={t.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="truncate">{t.text}</span>
                  </Link>
                </li>
              ))}
              {reminders.slice(0, 3).map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-amber-300/80">
                  <Bell className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="truncate">{r.message ?? r.type ?? 'Påminnelse'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* === BOTTOM ROW: Leads + AI Assistant === */}
      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        {/* Leads List */}
        <div className="lg:col-span-2 rounded-xl p-5 bg-slate-900/60 backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-medium text-white">Senaste leads</h3>
            </div>
            <Link href="/prospektering" className="text-xs text-blue-400 hover:underline">Visa alla →</Link>
          </div>
          {leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">Inga nya leads ännu.</p>
          ) : (
            <div className="space-y-1">
              {leads.slice(0, 8).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-cyan-400" />
                    </div>
                    <span className="font-medium text-sm text-white">{l.company_name ?? '—'}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: l.score && l.score >= 70 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                      color: l.score && l.score >= 70 ? '#86efac' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {l.score ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant Panel */}
        <div className="rounded-xl overflow-hidden border border-white/10 flex flex-col" style={{ background: 'rgba(255,255,255,0.97)' }}>
          <div className="p-4 flex items-center gap-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900">EasyPartner.AI</span>
              <p className="text-[10px] text-slate-400">Din proaktiva assistent</p>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-3 text-sm overflow-y-auto max-h-64">
            <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs">
              Ge mig en sammanfattning av dashboarden med rekommendationer.
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-xs">
              <p className="font-medium text-blue-600 mb-1.5">Insikter:</p>
              <ol className="space-y-1 text-slate-600 list-decimal list-inside">
                <li>{stats.activeCustomers ?? 0} aktiva kunder</li>
                <li>{stats.openQuotes ?? 0} öppna offerter att följa upp</li>
                <li>{stats.newLeads ?? 0} nya leads att bearbeta</li>
              </ol>
              {(stats.openQuotes ?? 0) > 0 && (
                <p className="mt-2 text-blue-500 text-[11px]">
                  Rekommendation: Följ upp de öppna offerterna innan veckan är slut.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-slate-200">
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white">
              <input
                type="text"
                placeholder="Ställ en fråga..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 text-xs text-slate-600 bg-transparent outline-none placeholder:text-slate-300"
              />
              <Send className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* === ACTION BUTTONS === */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-105 bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20"
        >
          <Users className="h-4 w-4" />
          Ny kund
        </Link>
        <Link
          href="/quotes"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:scale-105 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white"
        >
          <Receipt className="h-4 w-4" />
          Ny offert
        </Link>
        <Link
          href="/prospektering"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:scale-105 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white"
        >
          <Target className="h-4 w-4" />
          Starta prospektering
        </Link>
      </div>
    </div>
  );
}
