'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SeoRanking {
  id: string;
  keyword: string;
  domain: string | null;
  position: number | null;
  previous_position: number | null;
  search_volume: number | null;
}

interface Customer {
  id: string;
  name: string;
}

interface Domain {
  id: string;
  domain: string;
  customer_id: string | null;
}

function getTrend(
  position: number | null,
  previousPosition: number | null
): 'up' | 'down' | 'unchanged' {
  if (position == null || previousPosition == null) return 'unchanged';
  if (position < previousPosition) return 'up';
  if (position > previousPosition) return 'down';
  return 'unchanged';
}

export function SEODashboard({
  customers,
  domains,
}: {
  customers: Customer[];
  domains: Domain[];
}) {
  const router = useRouter();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [rankings, setRankings] = useState<SeoRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [suggestionsModal, setSuggestionsModal] = useState<{
    meta_title: string;
    meta_description: string;
    content_suggestions: string[];
    technical_actions: string[];
  } | null>(null);

  const customerDomains = domains.filter((d) => d.customer_id === selectedCustomerId);

  const fetchRankings = async () => {
    if (!selectedCustomerId) {
      setRankings([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/rankings?customer_id=${selectedCustomerId}`);
      if (res.ok) {
        const data = await res.json();
        setRankings(Array.isArray(data) ? data : []);
      }
    } catch {
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchRankings();
    } else {
      setRankings([]);
    }
  }, [selectedCustomerId]);

  const top3 = rankings.filter((r) => r.position != null && r.position <= 3).length;
  const top10 = rankings.filter((r) => r.position != null && r.position <= 10).length;
  const top30 = rankings.filter((r) => r.position != null && r.position <= 30).length;

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const customerId = fd.get('customer_id') as string;
    if (!customerId) {
      alert('Välj en kund');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/seo/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          domain: fd.get('domain')?.toString().trim() || null,
          keyword: fd.get('keyword')?.toString().trim() || '',
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        form.reset();
        if (selectedCustomerId === customerId) await fetchRankings();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte spara');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnalyzeAI = async () => {
    if (!selectedCustomerId) {
      alert('Välj en kund först');
      return;
    }
    setOptimizing(true);
    setSuggestionsModal(null);
    try {
      const res = await fetch('/api/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: selectedCustomerId }),
      });
      const data = await res.json();
      if (res.ok && data.suggestions) {
        setSuggestionsModal(data.suggestions);
      } else {
        alert(data.error || 'Kunde inte analysera');
      }
    } finally {
      setOptimizing(false);
    }
  };

  const handleUpdateRankings = async () => {
    if (!selectedCustomerId) {
      alert('Välj en kund först');
      return;
    }
    const domain = customerDomains[0]?.domain;
    setUpdating(true);
    try {
      const res = await fetch('/api/seo/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          domain: domain || null,
        }),
      });
      if (res.ok) {
        await fetchRankings();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte uppdatera');
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Välj kund</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="mt-1 min-w-[200px] rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Välj kund —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--card)] text-[var(--foreground)]">
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150"
          >
            + Lägg till sökord
          </button>
          <button
            type="button"
            onClick={handleUpdateRankings}
            disabled={updating || !selectedCustomerId || rankings.length === 0}
            className="rounded-lg border border-[var(--border)]/20 px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150 hover:bg-white/5 disabled:opacity-50"
          >
            {updating ? 'Uppdaterar…' : 'Uppdatera ranking'}
          </button>
          <button
            type="button"
            onClick={handleAnalyzeAI}
            disabled={optimizing || !selectedCustomerId || rankings.length === 0}
            className="rounded-lg border border-[var(--border)]/20 px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150 hover:bg-white/5 disabled:opacity-50"
          >
            {optimizing ? 'Analyserar…' : 'Analysera med AI'}
          </button>
        </div>
      </div>

      {selectedCustomerId && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card rounded-xl p-5 transition-all duration-150 hover:border-[var(--border)]/[0.12]">
              <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                I topp 3
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-[var(--foreground)]">{top3}</p>
            </div>
            <div className="card rounded-xl p-5 transition-all duration-150 hover:border-[var(--border)]/[0.12]">
              <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                I topp 10
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-[var(--foreground)]">{top10}</p>
            </div>
            <div className="card rounded-xl p-5 transition-all duration-150 hover:border-[var(--border)]/[0.12]">
              <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                I topp 30
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-[var(--foreground)]">{top30}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-[var(--muted-foreground)]">Laddar sökord…</p>
            </div>
          ) : rankings.length === 0 ? (
            <div className="card rounded-xl p-12 text-center">
              <p className="text-[var(--muted-foreground)]">Inga bevakade sökord. Lägg till sökord ovan.</p>
            </div>
          ) : (
            <div className="card overflow-hidden rounded-xl">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Sökord
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Position idag
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Position förra veckan
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Trend
                    </th>
                    <th className="border-b border-[var(--border)]/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Sökvolym
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r) => {
                    const trend = getTrend(r.position, r.previous_position);
                    return (
                      <tr key={r.id} className="table-row-hover border-b border-[var(--border)]/[0.04] transition-colors duration-150">
                        <td className="px-6 py-5 font-medium text-[var(--foreground)]">{r.keyword}</td>
                        <td className="px-6 py-5 text-[var(--muted-foreground)]">
                          {r.position ?? '—'}
                        </td>
                        <td className="px-6 py-5 text-[var(--muted-foreground)]">
                          {r.previous_position ?? '—'}
                        </td>
                        <td className="px-6 py-5">
                          {trend === 'up' && (
                            <span className="text-emerald-400" title="Upp">↑</span>
                          )}
                          {trend === 'down' && (
                            <span className="text-rose-400" title="Ner">↓</span>
                          )}
                          {trend === 'unchanged' && (
                            <span className="text-[#64748b]" title="Oförändrad">→</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-[var(--muted-foreground)]">
                          {r.search_volume != null
                            ? r.search_volume.toLocaleString('sv-SE')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!selectedCustomerId && (
        <div className="card rounded-xl p-12 text-center">
          <p className="text-[var(--muted-foreground)]">Välj en kund för att se bevakade sökord.</p>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md rounded-xl border-[var(--border)]/20 p-6">
            <h3 className="font-heading text-xl font-semibold text-[var(--foreground)]">Nytt bevakat sökord</h3>
            <form onSubmit={handleAddSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Kund *</label>
                <select
                  name="customer_id"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Domän</label>
                <select
                  name="domain"
                  className="mt-1 w-full rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">— Välj domän —</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.domain} className="bg-[var(--card)] text-[var(--foreground)]">
                      {d.domain}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)]">Sökord *</label>
                <input
                  type="text"
                  name="keyword"
                  required
                  placeholder="t.ex. webbhotell stockholm"
                  className="mt-1 w-full rounded-lg border border-[var(--border)]/20 bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-[var(--border)]/20 px-4 py-2 text-sm text-[var(--foreground)] transition-all duration-150 hover:bg-white/5"
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

      {suggestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border-[var(--border)]/20 p-6">
            <h3 className="font-heading text-xl font-semibold text-[var(--foreground)]">Claudes SEO-förslag</h3>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Ny meta-titel</p>
                <p className="mt-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-3 text-[var(--foreground)]">{suggestionsModal.meta_title || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Ny meta-beskrivning</p>
                <p className="mt-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-3 text-[var(--foreground)]">{suggestionsModal.meta_description || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Innehållsförslag</p>
                <ul className="mt-1 list-inside list-disc space-y-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-3 text-[var(--muted-foreground)]">
                  {suggestionsModal.content_suggestions?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                  {(!suggestionsModal.content_suggestions || suggestionsModal.content_suggestions.length === 0) && <li>—</li>}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Tekniska åtgärder</p>
                <ul className="mt-1 list-inside list-disc space-y-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-3 text-[var(--muted-foreground)]">
                  {suggestionsModal.technical_actions?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                  {(!suggestionsModal.technical_actions || suggestionsModal.technical_actions.length === 0) && <li>—</li>}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSuggestionsModal(null)}
                className="btn-primary rounded-lg px-4 py-2 text-sm text-[var(--foreground)]"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
