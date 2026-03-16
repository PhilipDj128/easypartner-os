import { getSupabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customers (id, name, company, email, phone)
    `)
    .eq('id', id)
    .single();

  if (error || !quote) notFound();

  const q = quote as {
    quote_number?: string;
    created_at: string;
    sent_at?: string | null;
    status: string;
    total_amount: number;
    one_time_cost?: number;
    monthly_cost?: number;
    line_items?: { type: string; specification: string; quantity?: number; unit_price?: number; binding_period?: string; contract_period?: string }[];
    valid_until?: string | null;
    notes?: string | null;
    recipient_name?: string | null;
    recipient_email?: string | null;
    sign_token?: string | null;
    signed_at?: string | null;
    signed_by_name?: string | null;
    customers?: { name?: string; company?: string; email?: string } | null;
  };

  const lineItems = Array.isArray(q.line_items) ? q.line_items : [];
  const oneTime = lineItems.filter((i) => i.type === 'one_time');
  const monthly = lineItems.filter((i) => i.type === 'monthly');

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/quotes" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← Tillbaka till offerter
        </Link>
        <div className="flex gap-3">
          <a
            href={`/api/quotes/${id}/pdf`}
            download
            className="btn-outline rounded-lg px-4 py-2 text-sm"
          >
            Ladda ner PDF
          </a>
          {q.sign_token && (
            <a
              href={`/quotes/sign/${q.sign_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary rounded-lg px-4 py-2 text-sm"
            >
              Öppna signeringslänk
            </a>
          )}
        </div>
      </div>

      <div className="card overflow-hidden rounded-xl">
        <div className="border-b border-[var(--border)] px-6 py-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-[var(--foreground)]">
                {q.quote_number || `#${id.slice(0, 8)}`}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {formatDate(q.created_at)} · Status: {q.status}
              </p>
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)]">
              {formatCurrency(q.total_amount ?? 0)}
            </p>
          </div>
        </div>

        <div className="border-b border-[var(--border)] px-6 py-4">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Mottagare</p>
          <p className="mt-1 font-medium text-[var(--foreground)]">
            {(q.recipient_name || (q.customers as { name?: string })?.name) ?? '—'}
          </p>
          {q.recipient_email && (
            <p className="text-sm text-[var(--muted-foreground)]">{q.recipient_email}</p>
          )}
        </div>

        {(oneTime.length > 0 || monthly.length > 0) && (
          <div className="border-b border-[var(--border)] px-6 py-4">
            {oneTime.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Engångskostnad</p>
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                      <th className="pb-2">Specifikation</th>
                      <th className="pb-2 text-right">Antal</th>
                      <th className="pb-2 text-right">Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oneTime.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--border)]/50">
                        <td className="py-2">{r.specification}</td>
                        <td className="py-2 text-right">{r.quantity ?? 1}</td>
                        <td className="py-2 text-right">
                          {formatCurrency((r.quantity ?? 1) * (r.unit_price ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {monthly.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Månadskostnad</p>
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                      <th className="pb-2">Specifikation</th>
                      <th className="pb-2">Bindning</th>
                      <th className="pb-2 text-right">Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--border)]/50">
                        <td className="py-2">{r.specification}</td>
                        <td className="py-2">{r.binding_period || '—'}</td>
                        <td className="py-2 text-right">
                          {formatCurrency((r.quantity ?? 1) * (r.unit_price ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {q.valid_until && (
          <div className="border-b border-[var(--border)] px-6 py-4">
            <p className="text-sm text-[var(--muted-foreground)]">Giltig till: {formatDate(q.valid_until)}</p>
          </div>
        )}

        {q.notes && (
          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Övriga villkor</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">{q.notes}</p>
          </div>
        )}

        {(q.status === 'signerad' || q.status === 'signed') && q.signed_at && (
          <div className="border-t border-[var(--border)] px-6 py-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Signerad av {q.signed_by_name ?? '—'} den {formatDate(q.signed_at)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
