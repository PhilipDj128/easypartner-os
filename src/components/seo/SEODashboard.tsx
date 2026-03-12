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
          <label className="block text-sm font-medium text-brand-600">Välj kund</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="mt-1 min-w-[200px] rounded-lg border border-sand-200 px-3 py-2"
          >
            <option value="">— Välj kund —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            + Lägg till sökord
          </button>
          <button
            type="button"
            onClick={handleUpdateRankings}
            disabled={updating || !selectedCustomerId || rankings.length === 0}
            className="rounded-lg border border-brand-500 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
          >
            {updating ? 'Uppdaterar…' : 'Uppdatera ranking'}
          </button>
          <button
            type="button"
            onClick={handleAnalyzeAI}
            disabled={optimizing || !selectedCustomerId || rankings.length === 0}
            className="rounded-lg border border-brand-500 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
          >
            {optimizing ? 'Analyserar…' : 'Analysera med AI'}
          </button>
        </div>
      </div>

      {selectedCustomerId && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wider text-brand-600">
                I topp 3
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold text-brand-900">{top3}</p>
            </div>
            <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wider text-brand-600">
                I topp 10
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold text-brand-900">{top10}</p>
            </div>
            <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wider text-brand-600">
                I topp 30
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold text-brand-900">{top30}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-sand-200">Laddar sökord…</p>
            </div>
          ) : rankings.length === 0 ? (
            <div className="rounded-xl border border-sand-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sand-200">Inga bevakade sökord. Lägg till sökord ovan.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-sand-200">
                <thead>
                  <tr>
                    <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                      Sökord
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                      Position idag
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                      Position förra veckan
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                      Trend
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                      Sökvolym
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {rankings.map((r) => {
                    const trend = getTrend(r.position, r.previous_position);
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-sand-50">
                        <td className="px-6 py-5 font-medium text-brand-900">{r.keyword}</td>
                        <td className="px-6 py-5 text-sand-200">
                          {r.position ?? '—'}
                        </td>
                        <td className="px-6 py-5 text-sand-200">
                          {r.previous_position ?? '—'}
                        </td>
                        <td className="px-6 py-5">
                          {trend === 'up' && (
                            <span className="text-green-600" title="Upp">↑</span>
                          )}
                          {trend === 'down' && (
                            <span className="text-red-600" title="Ner">↓</span>
                          )}
                          {trend === 'unchanged' && (
                            <span className="text-gray-400" title="Oförändrad">→</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-sand-200">
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
        <div className="rounded-xl border border-sand-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sand-200">Välj en kund för att se bevakade sökord.</p>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-serif text-xl text-brand-900">Nytt bevakat sökord</h3>
            <form onSubmit={handleAddSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-900">Kund *</label>
                <select
                  name="customer_id"
                  required
                  className="mt-1 w-full rounded-lg border border-sand-200 px-3 py-2"
                >
                  <option value="">— Välj kund —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-900">Domän</label>
                <select
                  name="domain"
                  className="mt-1 w-full rounded-lg border border-sand-200 px-3 py-2"
                >
                  <option value="">— Välj domän —</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.domain}>
                      {d.domain}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-900">Sökord *</label>
                <input
                  type="text"
                  name="keyword"
                  required
                  placeholder="t.ex. webbhotell stockholm"
                  className="mt-1 w-full rounded-lg border border-sand-200 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-sand-200 px-4 py-2 text-sm"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitting ? 'Sparar…' : 'Spara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {suggestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-serif text-xl text-brand-900">Claudes SEO-förslag</h3>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-brand-600">Ny meta-titel</p>
                <p className="mt-1 rounded-lg bg-sand-50 p-3 text-brand-900">{suggestionsModal.meta_title || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-600">Ny meta-beskrivning</p>
                <p className="mt-1 rounded-lg bg-sand-50 p-3 text-brand-900">{suggestionsModal.meta_description || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-600">Innehållsförslag</p>
                <ul className="mt-1 list-inside list-disc space-y-1 rounded-lg bg-sand-50 p-3 text-brand-900">
                  {suggestionsModal.content_suggestions?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                  {(!suggestionsModal.content_suggestions || suggestionsModal.content_suggestions.length === 0) && <li>—</li>}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-600">Tekniska åtgärder</p>
                <ul className="mt-1 list-inside list-disc space-y-1 rounded-lg bg-sand-50 p-3 text-brand-900">
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
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
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
