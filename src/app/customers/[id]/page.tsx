import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { SendLoginLinkButton } from '@/components/customers/SendLoginLinkButton';
import type { Customer, Domain, Revenue, Reminder } from '@/types/database';

function formatCurrency(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Supabase är inte konfigurerad.
        </div>
      </div>
    );
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (customerError || !customer) {
    notFound();
  }

  const c = customer as Customer;

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('customer_id', id)
    .order('domain');

  const { data: revenue } = await supabase
    .from('revenue')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('customer_id', id)
    .eq('completed', false)
    .order('due_date');

  const { data: seoRankings } = await supabase
    .from('seo_rankings')
    .select('*')
    .eq('customer_id', id)
    .order('date', { ascending: false })
    .limit(10);

  const domainList = (domains ?? []) as Domain[];
  const revenueList = (revenue ?? []) as Revenue[];
  const reminderList = (reminders ?? []) as Reminder[];
  const seoList = seoRankings ?? [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/customers"
          className="text-sm text-brand-600 hover:text-brand-900"
        >
          ← Tillbaka till kunder
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/quotes?customer=${id}`}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            Generera offert
          </Link>
          <SendLoginLinkButton email={c.email} customerName={c.name} />
          <button
            type="button"
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm text-brand-600 hover:bg-brand-50"
          >
            Skicka hälsokoll
          </button>
        </div>
      </div>

      {/* Kundprofil */}
      <div className="mb-8 rounded-lg border border-sand-200 bg-white p-6">
        <h1 className="font-serif text-2xl text-brand-900">{c.name}</h1>
        <p className="mt-1 text-sand-200">{c.company || '—'}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-brand-600">E-post</p>
            <a
              href={c.email ? `mailto:${c.email}` : '#'}
              className="text-brand-900 hover:underline"
            >
              {c.email || '—'}
            </a>
          </div>
          <div>
            <p className="text-xs uppercase text-brand-600">Telefon</p>
            <a
              href={c.phone ? `tel:${c.phone}` : '#'}
              className="text-brand-900 hover:underline"
            >
              {c.phone || '—'}
            </a>
          </div>
          <div>
            <p className="text-xs uppercase text-brand-600">Avtalsvärde</p>
            <p className="text-brand-900">{formatCurrency(c.contract_value)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-brand-600">Status</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-sand-100'
              }`}
            >
              {c.status}
            </span>
          </div>
        </div>
        {(c.contract_start || c.contract_end) && (
          <div className="mt-4 flex gap-6 text-sm text-sand-200">
            {c.contract_start && (
              <span>Avtalsstart: {format(new Date(c.contract_start), 'd MMM yyyy', { locale: sv })}</span>
            )}
            {c.contract_end && (
              <span>Avtalslut: {format(new Date(c.contract_end), 'd MMM yyyy', { locale: sv })}</span>
            )}
          </div>
        )}
        {c.services && c.services.length > 0 && (
          <div className="mt-2">
            <p className="text-xs uppercase text-brand-600">Tjänster</p>
            <p className="text-brand-900">{c.services.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Anteckningar */}
      {c.notes && (
        <div className="mb-8 rounded-lg border border-sand-200 bg-white p-6">
          <h2 className="font-serif text-lg text-brand-900">Anteckningar</h2>
          <p className="mt-2 whitespace-pre-wrap text-sand-200">{c.notes}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Domäner */}
        <div className="rounded-lg border border-sand-200 bg-white p-6">
          <h2 className="font-serif text-lg text-brand-900">Domäner</h2>
          {domainList.length === 0 ? (
            <p className="mt-2 text-sm text-sand-200">Inga domäner registrerade</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left">
                  <th className="pb-2 font-medium text-brand-600">Domän</th>
                  <th className="pb-2 font-medium text-brand-600">Hosting</th>
                  <th className="pb-2 font-medium text-brand-600">Förnyelse</th>
                </tr>
              </thead>
              <tbody>
                {domainList.map((d) => (
                  <tr key={d.id} className="border-b border-sand-100">
                    <td className="py-2">{d.domain}</td>
                    <td className="py-2 text-sand-200">{d.hosting_provider || '—'}</td>
                    <td className="py-2 text-sand-200">
                      {d.renewal_date
                        ? format(new Date(d.renewal_date), 'd MMM yyyy', { locale: sv })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Påminnelser */}
        <div className="rounded-lg border border-sand-200 bg-white p-6">
          <h2 className="font-serif text-lg text-brand-900">Påminnelser</h2>
          {reminderList.length === 0 ? (
            <p className="mt-2 text-sm text-sand-200">Inga aktiva påminnelser</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {reminderList.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between rounded border border-sand-100 p-2 text-sm"
                >
                  <span>{r.message || r.type || 'Påminnelse'}</span>
                  <span className="text-sand-200">
                    {r.due_date
                      ? format(new Date(r.due_date), 'd MMM', { locale: sv })
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Faktureringshistorik */}
        <div className="rounded-lg border border-sand-200 bg-white p-6">
          <h2 className="font-serif text-lg text-brand-900">Faktureringshistorik</h2>
          {revenueList.length === 0 ? (
            <p className="mt-2 text-sm text-sand-200">Inga intäkter registrerade</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left">
                  <th className="pb-2 font-medium text-brand-600">Belopp</th>
                  <th className="pb-2 font-medium text-brand-600">Tjänst</th>
                  <th className="pb-2 font-medium text-brand-600">Datum</th>
                </tr>
              </thead>
              <tbody>
                {revenueList.map((r) => (
                  <tr key={r.id} className="border-b border-sand-100">
                    <td className="py-2">{formatCurrency(r.amount)}</td>
                    <td className="py-2 text-sand-200">{r.service || '—'}</td>
                    <td className="py-2 text-sand-200">
                      {format(new Date(r.created_at), 'd MMM yyyy', { locale: sv })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* SEO-rankinghistorik */}
        <div className="rounded-lg border border-sand-200 bg-white p-6">
          <h2 className="font-serif text-lg text-brand-900">SEO-rankinghistorik</h2>
          {seoList.length === 0 ? (
            <p className="mt-2 text-sm text-sand-200">Ingen SEO-data ännu</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left">
                  <th className="pb-2 font-medium text-brand-600">Nyckelord</th>
                  <th className="pb-2 font-medium text-brand-600">Position</th>
                  <th className="pb-2 font-medium text-brand-600">Föregående</th>
                  <th className="pb-2 font-medium text-brand-600">Datum</th>
                </tr>
              </thead>
              <tbody>
                {seoList.map((sr: { id: string; keyword: string; position: number; previous_position: number; date: string }) => (
                  <tr key={sr.id} className="border-b border-sand-100">
                    <td className="py-2">{sr.keyword}</td>
                    <td className="py-2">{sr.position}</td>
                    <td className="py-2 text-sand-200">{sr.previous_position ?? '—'}</td>
                    <td className="py-2 text-sand-200">
                      {format(new Date(sr.date), 'd MMM', { locale: sv })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
