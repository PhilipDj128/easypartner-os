'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const COMPANY = {
  name: 'Philip Dejager',
  email: 'philip@easypartnerisverige.se',
  phone: '+46705751013',
  company: 'EasyPartner AB',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface LineItem {
  type: string;
  specification: string;
  quantity?: number;
  unit_price?: number;
  binding_period?: string;
  contract_period?: string;
}

export default function QuoteSignPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';
  const [quote, setQuote] = useState<{
    quote_number?: string;
    created_at?: string;
    total_amount?: number;
    one_time_cost?: number;
    monthly_cost?: number;
    line_items?: LineItem[];
    valid_until?: string;
    notes?: string;
    recipient_name?: string;
    signed_at?: string;
    signed_by_name?: string;
    status?: string;
    customers?: { name?: string; company?: string; email?: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Länk saknas');
      return;
    }
    fetch(`/api/quotes/sign/${token}/open`, { method: 'POST' }).catch(() => {});
    fetch(`/api/quotes/sign/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Offert hittades inte');
        return r.json();
      })
      .then(setQuote)
      .catch((e) => setError(e.message || 'Kunde inte ladda offert'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    const name = signName.trim();
    if (!name) {
      alert('Ange ditt fullständiga namn');
      return;
    }
    setSigning(true);
    try {
      const res = await fetch('/api/quotes/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signed_by_name: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Kunde inte signera');
      setModalOpen(false);
      setSigned(true);
      setQuote((p) => (p ? { ...p, status: 'signerad', signed_at: new Date().toISOString(), signed_by_name: name } : null));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunde inte signera');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--muted-foreground)]">Laddar offert…</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="card max-w-md p-8 text-center">
          <p className="text-red-400">{error || 'Offert hittades inte'}</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Kontrollera länken eller kontakta oss.
          </p>
        </div>
      </div>
    );
  }

  const isSigned = quote.status === 'signerad' || signed;
  const lineItems = (quote.line_items || []) as LineItem[];
  const oneTimeItems = (quote as { one_time_items?: LineItem[] }).one_time_items;
  const monthlyItems = (quote as { monthly_items?: LineItem[] }).monthly_items;
  const oneTime = (oneTimeItems && oneTimeItems.length > 0 ? oneTimeItems : lineItems.filter((i) => i.type === 'one_time')) as LineItem[];
  const monthly = (monthlyItems && monthlyItems.length > 0 ? monthlyItems : lineItems.filter((i) => i.type === 'monthly')) as LineItem[];
  const rowSum = (qty: number, unit: number, disc?: number) => (qty * unit) * (1 - (disc ?? 0) / 100);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="card overflow-hidden rounded-2xl">
          <div className="border-b border-[var(--border)] bg-white/5 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-semibold text-[var(--foreground)]">
                  EasyPartner AB
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{COMPANY.email} · {COMPANY.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-[var(--muted-foreground)]">Offertnummer</p>
                <p className="font-mono font-semibold text-[var(--foreground)]">
                  {quote.quote_number || '—'}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {quote.created_at ? formatDate(quote.created_at) : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--border)] px-6 py-6">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Offert till
            </p>
            <p className="mt-1 font-semibold text-[var(--foreground)]">
              {quote.recipient_name || (quote.customers as { name?: string })?.name || '—'}
            </p>
            {(quote.customers as { company?: string })?.company && (
              <p className="text-sm text-[var(--muted-foreground)]">
                {(quote.customers as { company: string }).company}
              </p>
            )}
          </div>

          {(oneTime.length > 0 || monthly.length > 0) && (
            <div className="border-b border-[var(--border)] px-6 py-6">
              {oneTime.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-medium uppercase text-[var(--muted-foreground)]">
                    Engångskostnad
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                        <th className="pb-2">Specifikation</th>
                        <th className="pb-2 text-right">Antal</th>
                        <th className="pb-2 text-right">Á pris</th>
                        <th className="pb-2 text-right">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oneTime.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--border)]/50">
                          <td className="py-2">{r.specification}</td>
                          <td className="py-2 text-right">{r.quantity ?? 1}</td>
                          <td className="py-2 text-right">{formatCurrency(r.unit_price ?? 0)}</td>
                          <td className="py-2 text-right">
                            {formatCurrency(rowSum(r.quantity ?? 1, r.unit_price ?? 0, (r as { discount_percent?: number }).discount_percent))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {monthly.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium uppercase text-[var(--muted-foreground)]">
                    Månadskostnad
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                        <th className="pb-2">Specifikation</th>
                        <th className="pb-2">Bindning</th>
                        <th className="pb-2">Avtalstid</th>
                        <th className="pb-2 text-right">Antal</th>
                        <th className="pb-2 text-right">Á pris</th>
                        <th className="pb-2 text-right">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--border)]/50">
                          <td className="py-2">{r.specification}</td>
                          <td className="py-2">{r.binding_period || '—'}</td>
                          <td className="py-2">{r.contract_period || '—'}</td>
                          <td className="py-2 text-right">{r.quantity ?? 1}</td>
                          <td className="py-2 text-right">{formatCurrency(r.unit_price ?? 0)}</td>
                          <td className="py-2 text-right">
                            {formatCurrency(rowSum(r.quantity ?? 1, r.unit_price ?? 0, (r as { discount_percent?: number }).discount_percent))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="border-b border-[var(--border)] px-6 py-4">
            <div className="flex justify-end">
              <p className="text-lg font-semibold text-[var(--foreground)]">
                Totalsumma: {formatCurrency(quote.total_amount ?? 0)}
              </p>
            </div>
          </div>

          {quote.notes && (
            <div className="border-b border-[var(--border)] px-6 py-4">
              <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Övriga villkor</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">{quote.notes}</p>
            </div>
          )}

          {quote.valid_until && (
            <div className="border-b border-[var(--border)] px-6 py-4">
              <p className="text-xs text-[var(--muted-foreground)]">
                Offerten gäller till: {formatDate(quote.valid_until)}
              </p>
            </div>
          )}

          <div className="px-6 py-8">
            {isSigned ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center">
                <p className="font-semibold text-emerald-400">✓ Dokumentet är signerat</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Signerat av {quote.signed_by_name}
                  {quote.signed_at && ` den ${formatDate(quote.signed_at)}`}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn-primary w-full rounded-xl py-4 text-base font-semibold"
              >
                Signera dokument
              </button>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-md p-6">
            <h3 className="font-heading text-lg font-semibold text-[var(--foreground)]">
              Signera med ditt fullständiga namn
            </h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Skriv ditt namn nedan för att signera offerten.
            </p>
            <input
              type="text"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="För- och efternamn"
              className="mt-4 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={signing}
                className="btn-outline flex-1 rounded-lg py-2.5 disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSign}
                disabled={signing}
                className="btn-primary flex-1 rounded-lg py-2.5 disabled:opacity-50"
              >
                {signing ? 'Signerar…' : 'Signera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
