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
        <div className="glass-card rounded-lg border-amber-500/30 p-4 text-amber-400">
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
          className="text-sm text-[#3b82f6] transition-colors duration-150 hover:text-blue-400"
        >
          ← Tillbaka till kunder
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/quotes?customer=${id}`}
            className="btn-primary rounded-lg px-4 py-2 text-sm text-white"
          >
            Generera offert
          </Link>
          <SendLoginLinkButton email={c.email} customerName={c.name} />
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-all duration-150 hover:bg-white/5"
          >
            Skicka hälsokoll
          </button>
        </div>
      </div>

      {/* Kundprofil */}
      <div className="glass-card mb-8 rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
        <h1 className="font-heading text-2xl font-semibold text-white">{c.name}</h1>
        <p className="mt-1 text-[#94a3b8]">{c.company || '—'}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-[#94a3b8]">E-post</p>
            <a
              href={c.email ? `mailto:${c.email}` : '#'}
              className="text-[#3b82f6] transition-colors duration-150 hover:text-blue-400 hover:underline"
            >
              {c.email || '—'}
            </a>
          </div>
          <div>
            <p className="text-xs uppercase text-[#94a3b8]">Telefon</p>
            <a
              href={c.phone ? `tel:${c.phone}` : '#'}
              className="text-[#3b82f6] transition-colors duration-150 hover:text-blue-400 hover:underline"
            >
              {c.phone || '—'}
            </a>
          </div>
          <div>
            <p className="text-xs uppercase text-[#94a3b8]">Avtalsvärde</p>
            <p className="text-white">{formatCurrency(c.contract_value)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[#94a3b8]">Status</p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${
                c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-[#94a3b8]'
              }`}
            >
              {c.status}
            </span>
          </div>
        </div>
        {(c.contract_start || c.contract_end) && (
          <div className="mt-4 flex gap-6 text-sm text-[#94a3b8]">
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
            <p className="text-xs uppercase text-[#94a3b8]">Tjänster</p>
            <p className="text-white">{c.services.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Anteckningar */}
      {c.notes && (
        <div className="glass-card mb-8 rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Anteckningar</h2>
          <p className="mt-2 whitespace-pre-wrap text-[#94a3b8]">{c.notes}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Domäner */}
        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Domäner</h2>
          {domainList.length === 0 ? (
            <p className="mt-2 text-sm text-[#94a3b8]">Inga domäner registrerade</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="pb-2 font-medium text-[#94a3b8]">Domän</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Hosting</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Förnyelse</th>
                </tr>
              </thead>
              <tbody>
                {domainList.map((d) => (
                  <tr key={d.id} className="table-row-hover border-b border-white/[0.04]">
                    <td className="py-2 text-white">{d.domain}</td>
                    <td className="py-2 text-[#94a3b8]">{d.hosting_provider || '—'}</td>
                    <td className="py-2 text-[#94a3b8]">
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
        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Påminnelser</h2>
          {reminderList.length === 0 ? (
            <p className="mt-2 text-sm text-[#94a3b8]">Inga aktiva påminnelser</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {reminderList.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between rounded border border-white/10 bg-white/5 p-2 text-sm text-[#94a3b8]"
                >
                  <span className="text-white">{r.message || r.type || 'Påminnelse'}</span>
                  <span>
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
        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">Faktureringshistorik</h2>
          {revenueList.length === 0 ? (
            <p className="mt-2 text-sm text-[#94a3b8]">Inga intäkter registrerade</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="pb-2 font-medium text-[#94a3b8]">Belopp</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Tjänst</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Datum</th>
                </tr>
              </thead>
              <tbody>
                {revenueList.map((r) => (
                  <tr key={r.id} className="table-row-hover border-b border-white/[0.04]">
                    <td className="py-2 text-white">{formatCurrency(r.amount)}</td>
                    <td className="py-2 text-[#94a3b8]">{r.service || '—'}</td>
                    <td className="py-2 text-[#94a3b8]">
                      {format(new Date(r.created_at), 'd MMM yyyy', { locale: sv })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* SEO-rankinghistorik */}
        <div className="glass-card rounded-xl p-6 transition-all duration-150 hover:border-white/[0.12]">
          <h2 className="font-heading text-lg font-semibold text-white">SEO-rankinghistorik</h2>
          {seoList.length === 0 ? (
            <p className="mt-2 text-sm text-[#94a3b8]">Ingen SEO-data ännu</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="pb-2 font-medium text-[#94a3b8]">Nyckelord</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Position</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Föregående</th>
                  <th className="pb-2 font-medium text-[#94a3b8]">Datum</th>
                </tr>
              </thead>
              <tbody>
                {seoList.map((sr: { id: string; keyword: string; position: number; previous_position: number; date: string }) => (
                  <tr key={sr.id} className="table-row-hover border-b border-white/[0.04]">
                    <td className="py-2 text-white">{sr.keyword}</td>
                    <td className="py-2 text-white">{sr.position}</td>
                    <td className="py-2 text-[#94a3b8]">{sr.previous_position ?? '—'}</td>
                    <td className="py-2 text-[#94a3b8]">
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
