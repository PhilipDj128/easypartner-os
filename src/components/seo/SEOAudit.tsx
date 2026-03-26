'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  MousePointerClick,
  Eye,
  TrendingUp,
  Search,
  FileCheck,
  FileX,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

interface SiteEntry {
  siteUrl?: string;
  permissionLevel?: string;
}

interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface AuditData {
  siteUrl: string;
  period: { startDate: string; endDate: string; days: number };
  summary: {
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    avgCtr: number;
  };
  indexing: { inspected: number; indexed: number; notIndexed: number } | null;
  topQueries: QueryRow[];
  topPages: PageRow[];
}

type SortField = 'clicks' | 'impressions' | 'ctr' | 'position';

export function SEOAudit() {
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [days, setDays] = useState(28);
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [querySort, setQuerySort] = useState<SortField>('clicks');
  const [querySortAsc, setQuerySortAsc] = useState(false);
  const [tab, setTab] = useState<'queries' | 'pages'>('queries');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoadingSites(true);
    try {
      const res = await fetch('/api/seo/audit');
      if (res.ok) {
        const json = await res.json();
        setSites(json.sites || []);
        if (json.sites?.length === 1) {
          setSelectedSite(json.sites[0].siteUrl || '');
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchAudit = async (site?: string, d?: number) => {
    const s = site || selectedSite;
    if (!s) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/audit?site=${encodeURIComponent(s)}&days=${d || days}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSite) fetchAudit();
  }, [selectedSite, days]);

  const sortedQueries = data
    ? [...data.topQueries].sort((a, b) => {
        const diff = querySortAsc
          ? a[querySort] - b[querySort]
          : b[querySort] - a[querySort];
        return diff;
      })
    : [];

  const sortedPages = data
    ? [...data.topPages].sort((a, b) => b.clicks - a.clicks)
    : [];

  const toggleSort = (field: SortField) => {
    if (querySort === field) {
      setQuerySortAsc(!querySortAsc);
    } else {
      setQuerySort(field);
      setQuerySortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`ml-1 inline h-3 w-3 ${querySort === field ? 'text-indigo-400' : 'text-zinc-500'}`}
    />
  );

  return (
    <div className="space-y-6">
      {/* Site selector & period */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Sajt</label>
          {loadingSites ? (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Laddar sajter...</p>
          ) : sites.length === 0 ? (
            <p className="mt-1 text-sm text-rose-400">
              Inga sajter hittades. Lägg till service account i Search Console.
            </p>
          ) : (
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="mt-1 min-w-[300px] rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Välj sajt --</option>
              {sites.map((s) => (
                <option key={s.siteUrl} value={s.siteUrl} className="bg-[var(--card)]">
                  {s.siteUrl}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Period</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={7}>7 dagar</option>
            <option value={28}>28 dagar</option>
            <option value={90}>90 dagar</option>
          </select>
        </div>
        <button
          onClick={() => fetchAudit()}
          disabled={loading || !selectedSite}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)]/20 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Laddar...' : 'Uppdatera'}
        </button>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-16">
          <p className="text-[var(--muted-foreground)]">Hämtar data från Search Console...</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card rounded-xl p-5">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-indigo-400" />
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Klick
                </p>
              </div>
              <p className="mt-2 font-heading text-3xl font-semibold text-[var(--foreground)]">
                {data.summary.totalClicks.toLocaleString('sv-SE')}
              </p>
            </div>
            <div className="card rounded-xl p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-400" />
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Visningar
                </p>
              </div>
              <p className="mt-2 font-heading text-3xl font-semibold text-[var(--foreground)]">
                {data.summary.totalImpressions.toLocaleString('sv-SE')}
              </p>
            </div>
            <div className="card rounded-xl p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Snittposition
                </p>
              </div>
              <p className="mt-2 font-heading text-3xl font-semibold text-[var(--foreground)]">
                {data.summary.avgPosition}
              </p>
            </div>
            <div className="card rounded-xl p-5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Snitt-CTR
                </p>
              </div>
              <p className="mt-2 font-heading text-3xl font-semibold text-[var(--foreground)]">
                {data.summary.avgCtr}%
              </p>
            </div>
          </div>

          {/* Indexing status */}
          {data.indexing && (
            <div className="card rounded-xl p-5">
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--foreground)]">
                <Globe className="h-5 w-5 text-indigo-400" />
                Indexeringsstatus
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Indexerade</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">
                      {data.indexing.indexed.toLocaleString('sv-SE')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileX className="h-5 w-5 text-rose-400" />
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Ej indexerade</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">
                      {data.indexing.notIndexed.toLocaleString('sv-SE')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Inskickade</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">
                      {data.indexing.inspected.toLocaleString('sv-SE')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-1">
            <button
              onClick={() => setTab('queries')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === 'queries'
                  ? 'bg-indigo-600 text-white'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Topp-sökord ({data.topQueries.length})
            </button>
            <button
              onClick={() => setTab('pages')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === 'pages'
                  ? 'bg-indigo-600 text-white'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Topp-sidor ({data.topPages.length})
            </button>
          </div>

          {/* Queries table */}
          {tab === 'queries' && (
            <div className="card overflow-hidden rounded-xl">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Sökord
                    </th>
                    <th
                      onClick={() => toggleSort('clicks')}
                      className="cursor-pointer border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
                    >
                      Klick <SortIcon field="clicks" />
                    </th>
                    <th
                      onClick={() => toggleSort('impressions')}
                      className="cursor-pointer border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
                    >
                      Visningar <SortIcon field="impressions" />
                    </th>
                    <th
                      onClick={() => toggleSort('ctr')}
                      className="cursor-pointer border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
                    >
                      CTR <SortIcon field="ctr" />
                    </th>
                    <th
                      onClick={() => toggleSort('position')}
                      className="cursor-pointer border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
                    >
                      Position <SortIcon field="position" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQueries.map((q) => (
                    <tr
                      key={q.query}
                      className="table-row-hover border-b border-[var(--border)]/[0.04] transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                        {q.query}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                        {q.clicks.toLocaleString('sv-SE')}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                        {q.impressions.toLocaleString('sv-SE')}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                        {q.ctr}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={
                            q.position <= 3
                              ? 'font-semibold text-emerald-400'
                              : q.position <= 10
                                ? 'text-amber-400'
                                : 'text-[var(--muted-foreground)]'
                          }
                        >
                          {q.position}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedQueries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
                        Ingen data för vald period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pages table */}
          {tab === 'pages' && (
            <div className="card overflow-hidden rounded-xl">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Sida
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Klick
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Visningar
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      CTR
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Position
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPages.map((p) => {
                    let shortUrl = p.page;
                    try {
                      shortUrl = new URL(p.page).pathname;
                    } catch {
                      // keep full url
                    }
                    return (
                      <tr
                        key={p.page}
                        className="table-row-hover border-b border-[var(--border)]/[0.04] transition-colors"
                      >
                        <td className="max-w-[300px] truncate px-6 py-4 font-medium text-[var(--foreground)]" title={p.page}>
                          {shortUrl}
                        </td>
                        <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                          {p.clicks.toLocaleString('sv-SE')}
                        </td>
                        <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                          {p.impressions.toLocaleString('sv-SE')}
                        </td>
                        <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                          {p.ctr}%
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={
                              p.position <= 3
                                ? 'font-semibold text-emerald-400'
                                : p.position <= 10
                                  ? 'text-amber-400'
                                  : 'text-[var(--muted-foreground)]'
                            }
                          >
                            {p.position}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedPages.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
                        Ingen data för vald period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!selectedSite && !loadingSites && sites.length > 0 && (
        <div className="card rounded-xl p-12 text-center">
          <p className="text-[var(--muted-foreground)]">Välj en sajt för att se Search Console-data.</p>
        </div>
      )}
    </div>
  );
}
