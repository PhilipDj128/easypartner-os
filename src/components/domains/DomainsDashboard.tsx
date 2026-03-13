'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Domain {
  id: string;
  domain: string;
  hosting_provider: string | null;
  renewal_date: string | null;
  built_by_us: boolean;
  status: string;
  customers?: { id: string; name: string } | null;
}

interface Customer {
  id: string;
  name: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRenewalStatus(renewalDate: string | null): 'green' | 'yellow' | 'red' {
  if (!renewalDate) return 'green';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 'red';
  if (daysUntil <= 30) return 'yellow';
  return 'green';
}

const STATUS_STYLES = {
  green: 'bg-emerald-500/20 text-emerald-400',
  yellow: 'bg-amber-500/20 text-amber-400',
  red: 'bg-rose-500/20 text-rose-400',
};

const STATUS_LABELS = {
  green: 'Aktiv',
  yellow: 'Förfaller snart',
  red: 'Förfallen',
};

export function DomainsDashboard({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(Array.isArray(data) ? data : []);
      }
    } catch {
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          domain: fd.get('domain')?.toString().trim() || '',
          hosting_provider: fd.get('hosting_provider')?.toString().trim() || null,
          renewal_date: fd.get('renewal_date')?.toString() || null,
          built_by_us: fd.get('built_by_us') === 'true',
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        form.reset();
        await fetchDomains();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte spara');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#94a3b8]">Laddar domäner…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-150"
        >
          + Lägg till domän
        </button>
      </div>

      {domains.length === 0 ? (
        <div className="glass-card rounded-xl p-20 text-center">
          <p className="text-lg text-[#94a3b8]">Inga domäner ännu. Lägg till din första domän ovan.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Kund
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Domän
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Webbhotell
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Förnyelsedatum
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Byggd av oss
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Status
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Säljmöjlighet
                </th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => {
                const renewalStatus = getRenewalStatus(d.renewal_date);
                const isSalesOpp = !d.built_by_us;
                return (
                  <tr key={d.id} className="table-row-hover border-b border-white/[0.04] transition-colors duration-150">
                    <td className="px-6 py-5 font-medium text-white">
                      {d.customers?.name ?? '—'}
                    </td>
                    <td className="px-6 py-5 text-white">{d.domain}</td>
                    <td className="px-6 py-5 text-[#94a3b8]">
                      {d.hosting_provider || '—'}
                    </td>
                    <td className="px-6 py-5 text-[#94a3b8]">
                      {formatDate(d.renewal_date)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${d.built_by_us ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-[#94a3b8]'}`}
                      >
                        {d.built_by_us ? 'Ja' : 'Nej'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[renewalStatus]}`}
                      >
                        {STATUS_LABELS[renewalStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {isSalesOpp ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400"
                          title="Säljmöjlighet – hemsidan byggd av annan leverantör"
                        >
                          🔶 Säljmöjlighet
                        </span>
                      ) : (
                        <span className="text-[#64748b]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-xl border-white/20 p-6">
            <h3 className="font-heading text-xl font-semibold text-white">Ny domän</h3>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8]">Kund *</label>
                <select
                  name="customer_id"
                  required
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                >
                  <option value="">— Välj kund —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#111827] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8]">Domän *</label>
                <input
                  type="text"
                  name="domain"
                  required
                  placeholder="t.ex. example.se"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8]">Webbhotell</label>
                <input
                  type="text"
                  name="hosting_provider"
                  placeholder="t.ex. Loopia, One.com"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8]">Förnyelsedatum</label>
                <input
                  type="date"
                  name="renewal_date"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8]">Byggd av oss</label>
                <select
                  name="built_by_us"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                >
                  <option value="false" className="bg-[#111827] text-white">Nej</option>
                  <option value="true" className="bg-[#111827] text-white">Ja</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-all duration-150 hover:bg-white/5"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
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
