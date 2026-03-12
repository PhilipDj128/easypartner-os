'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface QuoteService {
  name: string;
  price: number;
}

interface Quote {
  id: string;
  created_at: string;
  customer_id: string | null;
  services: QuoteService[];
  total_amount: number;
  status: string;
  customers?: { id: string; name: string; company: string | null } | null;
}

interface Customer {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  sent: 'Skickad',
  opened: 'Öppnad',
  signed: 'Signerad',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  opened: 'bg-amber-100 text-amber-800',
  signed: 'bg-green-100 text-green-800',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function QuotesDashboard({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<QuoteService[]>([{ name: '', price: 0 }]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) {
        const data = await res.json();
        setQuotes(Array.isArray(data) ? data : []);
      }
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const totalAmount = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const addService = () => setServices((p) => [...p, { name: '', price: 0 }]);

  const updateService = (i: number, field: 'name' | 'price', value: string | number) => {
    setServices((p) =>
      p.map((s, j) => (j === i ? { ...s, [field]: value } : s))
    );
  };

  const removeService = (i: number) => {
    if (services.length > 1) setServices((p) => p.filter((_, j) => j !== i));
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const customerId = (fd.get('customer_id') as string) || null;
    if (!customerId) {
      alert('Välj en kund');
      return;
    }
    const validServices = services
      .filter((s) => s.name.trim())
      .map((s) => ({ name: s.name.trim(), price: Number(s.price) || 0 }));
    if (validServices.length === 0) {
      alert('Lägg till minst en tjänst');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          services: validServices,
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setServices([{ name: '', price: 0 }]);
        form.reset();
        await fetchQuotes();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte skapa offert');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const markAsSent = async (id: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      if (res.ok) {
        await fetchQuotes();
        router.refresh();
      }
    } catch {
      alert('Kunde inte uppdatera');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sand-200">Laddar offerter…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          + Skapa ny offert
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-white p-20 text-center shadow-sm">
          <p className="text-lg text-sand-200">Inga offerter ännu. Skapa din första offert ovan.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-sand-200">
            <thead>
              <tr>
                <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                  ID
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                  Datum
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                  Kund
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                  Belopp
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
                  Status
                </th>
                <th className="px-6 py-5 text-right text-xs font-medium uppercase tracking-wider text-brand-600">
                  Åtgärd
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {quotes.map((q) => {
                const customer = q.customers;
                const customerName = customer?.name ?? '—';
                return (
                  <tr key={q.id} className="transition-colors hover:bg-sand-50">
                    <td className="whitespace-nowrap px-6 py-5 font-mono text-sm text-brand-900">
                      #{q.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-5 text-sm text-sand-200">{formatDate(q.created_at)}</td>
                    <td className="px-6 py-5 font-medium text-brand-900">{customerName}</td>
                    <td className="px-6 py-5 text-sand-200">
                      {formatCurrency(q.total_amount ?? 0)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_LABELS[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-right">
                      {q.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => markAsSent(q.id)}
                          className="text-sm text-brand-600 hover:text-brand-900"
                        >
                          Markera som skickad
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-serif text-xl text-brand-900">Ny offert</h3>
            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-brand-900">Tjänster</label>
                  <button
                    type="button"
                    onClick={addService}
                    className="text-sm text-brand-600 hover:text-brand-900"
                  >
                    + Lägg till
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {services.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tjänst (t.ex. Hemsida)"
                        value={s.name}
                        onChange={(e) => updateService(i, 'name', e.target.value)}
                        className="flex-1 rounded-lg border border-sand-200 px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Pris"
                        min="0"
                        step="1"
                        value={s.price || ''}
                        onChange={(e) =>
                          updateService(i, 'price', parseFloat(e.target.value) || 0)
                        }
                        className="w-28 rounded-lg border border-sand-200 px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        className="rounded-lg border border-sand-200 px-2 text-sand-200 hover:bg-sand-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 p-4">
                <p className="text-sm text-brand-600">Totalsumma</p>
                <p className="font-serif text-xl font-semibold text-brand-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-sand-200 px-4 py-2 text-sm"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitting ? 'Skapar…' : 'Skapa offert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
