'use client';

import { useState } from 'react';
import { Search, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import { ScoreCircle } from './components/ScoreCircle';
import { CoreWebVitals } from './components/CoreWebVitals';
import { IssuesList } from './components/IssuesList';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { SearchConsoleData } from './components/SearchConsoleData';
import type { AuditResult } from '@/types/audit';

export default function AuditPage() {
  const [url, setUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'pagespeed' | 'onpage' | 'gsc'>('overview');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, siteUrl: siteUrl || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setActiveTab('overview');
      } else {
        setError(data.error || 'Något gick fel');
      }
    } catch {
      setError('Kunde inte nå servern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-[var(--foreground)]">SEO Audit</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Analysera on-page SEO, Core Web Vitals och Search Console-data
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="card rounded-xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--muted-foreground)]">URL att analysera *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="mt-1 w-full rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--muted-foreground)]">
              Search Console sajt-URL <span className="text-xs">(valfri)</span>
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="sc-domain:example.com"
              className="mt-1 w-full rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !url}
              className="btn-primary flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyserar...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analysera
                </>
              )}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          <p className="text-[var(--muted-foreground)]">Analyserar sajten... detta kan ta upp till 30 sekunder</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Header with score */}
          <div className="card flex flex-col items-center gap-6 rounded-xl p-8 sm:flex-row sm:items-start">
            <ScoreCircle score={result.seoScore} />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-heading text-xl font-semibold text-[var(--foreground)]">
                SEO-analys av {result.url}
              </h2>
              <div className="mt-2 flex flex-wrap justify-center gap-3 sm:justify-start">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Öppna sajt
                </a>
                {result.createdAt && (
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Analyserad {new Date(result.createdAt).toLocaleString('sv-SE')}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.issues.filter((i) => i.severity === 'critical').length > 0 && (
                  <span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-400">
                    {result.issues.filter((i) => i.severity === 'critical').length} kritiska issues
                  </span>
                )}
                {result.pagespeedMobile && (
                  <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-400">
                    Performance: {result.pagespeedMobile.performance}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)]/20 px-4 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" /> Analysera igen
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-1">
            {[
              { key: 'overview', label: 'Översikt' },
              { key: 'pagespeed', label: 'Core Web Vitals' },
              { key: 'onpage', label: 'On-page SEO' },
              { key: 'gsc', label: 'Search Console' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card rounded-xl p-5">
                  <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">SEO-poäng</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{result.seoScore}/100</p>
                </div>
                {result.pagespeedMobile && (
                  <div className="card rounded-xl p-5">
                    <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Performance (mobil)</p>
                    <p className={`mt-2 text-3xl font-bold ${result.pagespeedMobile.performance >= 90 ? 'text-emerald-400' : result.pagespeedMobile.performance >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {result.pagespeedMobile.performance}
                    </p>
                  </div>
                )}
                <div className="card rounded-xl p-5">
                  <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Issues</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{result.issues.length}</p>
                </div>
                <div className="card rounded-xl p-5">
                  <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Kategorier OK</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-400">
                    {result.onPageAnalysis.categories.filter((c) => c.score === c.maxScore).length}/{result.onPageAnalysis.categories.length}
                  </p>
                </div>
              </div>

              {/* Issues */}
              <div className="card rounded-xl p-6">
                <h3 className="mb-4 font-heading text-lg font-semibold text-[var(--foreground)]">Issues</h3>
                <IssuesList issues={result.issues} />
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="card rounded-xl p-6">
                  <h3 className="mb-4 font-heading text-lg font-semibold text-[var(--foreground)]">Rekommendationer</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        <span className="text-[var(--foreground)]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pagespeed' && (
            <div className="grid gap-6 lg:grid-cols-2">
              {result.pagespeedMobile ? (
                <CoreWebVitals data={result.pagespeedMobile} label="Mobil" />
              ) : (
                <div className="card rounded-xl p-8 text-center">
                  <p className="text-[var(--muted-foreground)]">Ingen PageSpeed-data (API-nyckel saknas)</p>
                </div>
              )}
              {result.pagespeedDesktop ? (
                <CoreWebVitals data={result.pagespeedDesktop} label="Desktop" />
              ) : (
                <div className="card rounded-xl p-8 text-center">
                  <p className="text-[var(--muted-foreground)]">Ingen PageSpeed-data (API-nyckel saknas)</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'onpage' && (
            <div className="card rounded-xl p-6">
              <h3 className="mb-6 font-heading text-lg font-semibold text-[var(--foreground)]">
                On-page SEO — Poäng per kategori
              </h3>
              <CategoryBreakdown categories={result.onPageAnalysis.categories} />
            </div>
          )}

          {activeTab === 'gsc' && (
            <div>
              {result.gscData ? (
                <SearchConsoleData data={result.gscData} />
              ) : (
                <div className="card rounded-xl p-8 text-center">
                  <p className="text-[var(--muted-foreground)]">
                    Ingen Search Console-data. Ange en sajt-URL (t.ex. sc-domain:example.com) och kör analysen igen.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
