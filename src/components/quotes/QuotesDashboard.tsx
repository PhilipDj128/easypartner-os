'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Quote {
  id: string;
  quote_number: string | null;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  status: string;
  total_amount: number;
  valid_until: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  sign_token: string | null;
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
  signerad: 'Signerad',
  signed: 'Signerad',
  declined: 'Avböjd',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-[var(--muted-foreground)]',
  sent: 'bg-blue-500/20 text-blue-400',
  opened: 'bg-amber-500/20 text-amber-400',
  signerad: 'bg-emerald-500/20 text-emerald-400',
  signed: 'bg-emerald-500/20 text-emerald-400',
  declined: 'bg-red-500/20 text-red-400',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
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
  const [remindingId, setRemindingId] = useState<string | null>(null);

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

  const sendReminder = async (q: Quote) => {
    const email = q.recipient_email || (q.customers as { email?: string })?.email;
    if (!email?.includes('@')) {
      alert('Ingen e-postadress för mottagaren.');
      return;
    }
    setRemindingId(q.id);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quote_reminder',
          to: email,
          customerName: q.recipient_name || (q.customers as { name?: string })?.name,
        }),
      });
      if (res.ok) {
        router.refresh();
        await fetchQuotes();
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte skicka påminnelse');
      }
    } finally {
      setRemindingId(null);
    }
  };

  const canRemind = (q: Quote) => {
    if (q.status !== 'sent' || !q.sent_at) return false;
    const sent = new Date(q.sent_at).getTime();
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return sent < twoDaysAgo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--muted-foreground)]">Laddar offerter…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/quotes/new" className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium">
          + Ny offert
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="card rounded-xl p-20 text-center">
          <p className="text-lg text-[var(--muted-foreground)]">
            Inga offerter ännu. Skapa din första offert ovan.
          </p>
          <Link href="/quotes/new" className="mt-4 inline-block text-indigo-400 hover:underline">
            Skapa offert →
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed sm:table-auto">
              <thead className="table-sticky-header border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Offert#
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Kund
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Belopp
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Skickad
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Giltig till
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const customer = q.customers;
                  const customerName =
                    (q.recipient_name || (customer as { name?: string })?.name) ?? '—';
                  return (
                    <tr
                      key={q.id}
                      className="table-row-hover border-b border-[var(--border)]/50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm text-[var(--foreground)]">
                        {q.quote_number || `#${q.id.slice(0, 8)}`}
                      </td>
                      <td className="px-4 py-4 font-medium text-[var(--foreground)]">
                        {customerName}
                      </td>
                      <td className="px-4 py-4 text-[var(--muted-foreground)]">
                        {formatCurrency(q.total_amount ?? 0)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            STATUS_COLORS[q.status] ?? 'bg-white/10 text-[var(--muted-foreground)]'
                          }`}
                        >
                          {STATUS_LABELS[q.status] ?? q.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                        {formatDate(q.sent_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                        {formatDate(q.valid_until)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/quotes/${q.id}`}
                            className="text-sm text-indigo-400 hover:underline"
                          >
                            Visa
                          </Link>
                          {q.sign_token && (
                            <a
                              href={`/quotes/sign/${q.sign_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-400 hover:underline"
                            >
                              Signeringslänk
                            </a>
                          )}
                          {canRemind(q) && (
                            <button
                              type="button"
                              onClick={() => sendReminder(q)}
                              disabled={remindingId === q.id}
                              className="text-sm text-amber-400 hover:underline disabled:opacity-50"
                            >
                              {remindingId === q.id ? 'Skickar…' : 'Påminn'}
                            </button>
                          )}
                          <a
                            href={`/api/quotes/${q.id}/pdf`}
                            download={`offert-${q.quote_number || q.id.slice(0, 8)}.pdf`}
                            className="text-sm text-indigo-400 hover:underline"
                          >
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
