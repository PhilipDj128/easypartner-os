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
  customers?: { id: string; name: string; company: string | null; email: string | null } | null;
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
  draft: 'bg-white/10 text-[#94a3b8]',
  sent: 'bg-blue-500/20 text-blue-400',
  opened: 'bg-amber-500/20 text-amber-400',
  signed: 'bg-emerald-500/20 text-emerald-400',
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
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
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

  const sendQuoteEmail = async (q: Quote) => {
    const email = q.customers?.email;
    if (!email) {
      alert('Kunden har ingen e-postadress. Lägg till e-post på kundprofilen.');
      return;
    }
    setSendingEmailId(q.id);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_quote',
          to: email,
          customerName: q.customers?.name,
          services: q.services ?? [],
          totalAmount: q.total_amount ?? 0,
        }),
      });
      if (res.ok) {
        await fetchQuotes();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte skicka');
      }
    } finally {
      setSendingEmailId(null);
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

  const markAsSigned = async (q: Quote) => {
    try {
      const res = await fetch(`/api/quotes/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signed' }),
      });
      if (res.ok) {
        const email = q.customers?.email;
        if (email) {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'quote_signed',
              to: email,
              customerName: q.customers?.name,
            }),
          });
        }
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
        <p className="text-[#94a3b8]">Laddar offerter…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-150"
        >
          + Skapa ny offert
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="glass-card rounded-xl p-20 text-center">
          <p className="text-lg text-[#94a3b8]">Inga offerter ännu. Skapa din första offert ovan.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  ID
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Datum
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Kund
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Belopp
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Status
                </th>
                <th className="border-b border-white/[0.06] px-6 py-5 text-right text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
                  Åtgärd
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const customer = q.customers;
                const customerName = customer?.name ?? '—';
                return (
                  <tr key={q.id} className="table-row-hover border-b border-white/[0.04] transition-colors duration-150">
                    <td className="whitespace-nowrap px-6 py-5 font-mono text-sm text-white">
                      #{q.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-5 text-sm text-[#94a3b8]">{formatDate(q.created_at)}</td>
                    <td className="px-6 py-5 font-medium text-white">{customerName}</td>
                    <td className="px-6 py-5 text-[#94a3b8]">
                      {formatCurrency(q.total_amount ?? 0)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-white/10 text-[#94a3b8]'}`}
                      >
                        {STATUS_LABELS[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-right">
                      <div className="flex justify-end gap-3">
                        <a
                          href={`/api/quotes/${q.id}/pdf`}
                          download={`offert-${q.id.slice(0, 8)}.pdf`}
                          className="text-sm text-[#3b82f6] transition-colors duration-150 hover:text-blue-400"
                        >
                          Ladda ner PDF
                        </a>
                        {q.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => markAsSent(q.id)}
                            className="text-sm text-[#3b82f6] transition-colors duration-150 hover:text-blue-400"
                          >
                            Markera som skickad
                          </button>
                        )}
                        {(q.status === 'draft' || q.status === 'sent') && (
                          <button
                            type="button"
                            onClick={() => sendQuoteEmail(q)}
                            disabled={sendingEmailId === q.id}
                            className="text-sm text-[#3b82f6] transition-colors duration-150 hover:text-blue-400 disabled:opacity-50"
                          >
                            {sendingEmailId === q.id ? 'Skickar…' : 'Skicka via mail'}
                          </button>
                        )}
                        {(q.status === 'sent' || q.status === 'opened') && (
                          <button
                            type="button"
                            onClick={() => markAsSigned(q)}
                            className="text-sm text-emerald-400 transition-colors duration-150 hover:text-emerald-300"
                          >
                            Markera som signerad
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border-white/20 p-6">
            <h3 className="font-heading text-xl font-semibold text-white">Ny offert</h3>
            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[#94a3b8]">Tjänster</label>
                  <button
                    type="button"
                    onClick={addService}
                    className="text-sm text-[#3b82f6] transition-colors duration-150 hover:text-blue-400"
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
                        className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
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
                        className="w-28 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                      />
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        className="rounded-lg border border-white/20 px-2 text-[#94a3b8] transition-all duration-150 hover:bg-white/5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-[#94a3b8]">Totalsumma</p>
                <p className="font-heading text-xl font-semibold text-white">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-all duration-150 hover:bg-white/5"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
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
