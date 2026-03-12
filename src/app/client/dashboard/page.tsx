import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Customer } from '@/types/database';

interface SeoRanking {
  id: string;
  keyword: string;
  position: number | null;
  previous_position: number | null;
  search_volume: number | null;
  date: string;
}

interface SeoSuggestion {
  id: string;
  suggestions: {
    meta_title?: string;
    meta_description?: string;
    content_suggestions?: string[];
    technical_actions?: string[];
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/client/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/client/login');

  const admin = getSupabaseAdmin();
  if (!admin) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Systemet är inte fullt konfigurerad.
        </div>
      </div>
    );
  }

  const { data: customers } = await admin
    .from('customers')
    .select('*')
    .eq('email', user.email)
    .limit(1);

  const customer = (customers ?? [])[0] as Customer | undefined;
  if (!customer) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Ingen kund kopplad till denna e-post. Kontakta din partner.
        </div>
      </div>
    );
  }

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: rankings } = await admin
    .from('seo_rankings')
    .select('*')
    .eq('customer_id', customer.id)
    .gte('date', firstDayOfMonth)
    .order('date', { ascending: false });

  const rankingList = (rankings ?? []) as SeoRanking[];

  const { data: suggestionsData } = await admin
    .from('seo_suggestions')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const latestSuggestion = suggestionsData as SeoSuggestion | null;

  const keywordsUp = rankingList.filter(
    (r) =>
      r.previous_position != null &&
      r.position != null &&
      r.position < r.previous_position
  );
  const keywordsDown = rankingList.filter(
    (r) =>
      r.previous_position != null &&
      r.position != null &&
      r.position > r.previous_position
  );

  const top10Keywords = rankingList.filter(
    (r) => r.position != null && r.position <= 10
  );
  const avgSearchVolume =
    top10Keywords.length > 0
      ? top10Keywords.reduce((sum, r) => sum + (r.search_volume ?? 0), 0) /
        top10Keywords.length
      : 0;
  const seoValue = Math.round(top10Keywords.length * avgSearchVolume * 5);

  const estimatedVisitors = rankingList.reduce((sum, r) => {
    const pos = r.position ?? 20;
    const vol = r.search_volume ?? 0;
    if (pos <= 0) return sum;
    return sum + Math.round(vol / pos);
  }, 0);

  const companyName = customer.company || customer.name;

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-sand-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          {customer.logo_url ? (
            <img
              src={customer.logo_url}
              alt={companyName}
              className="h-10 object-contain"
            />
          ) : (
            <span className="font-serif text-lg font-semibold text-brand-900">
              {companyName}
            </span>
          )}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-brand-600 hover:text-brand-900"
            >
              Logga ut
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-2xl font-semibold text-brand-900">
          Välkommen, {companyName}
        </h1>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-brand-600">
              Beräknade besökare denna månad
            </p>
            <p className="mt-2 text-2xl font-semibold text-brand-900">
              {estimatedVisitors.toLocaleString('sv-SE')}
            </p>
          </div>
          <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-brand-600">SEO-värde (kronor)</p>
            <p className="mt-2 text-2xl font-semibold text-brand-900">
              {formatCurrency(seoValue)}
            </p>
            <p className="mt-1 text-xs text-sand-200">
              {top10Keywords.length} topp-10-sökord × {Math.round(avgSearchVolume).toLocaleString()} snitt sökvolym × 5 kr
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-sand-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-brand-900">
              ↑ Sökord som klättrat denna månad
            </h2>
            {keywordsUp.length === 0 ? (
              <p className="mt-4 text-sm text-sand-200">
                Inga sökord har klättrat ännu denna månad.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {keywordsUp.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 text-sm text-green-700"
                  >
                    <span className="text-lg">↑</span>
                    <span>{r.keyword}</span>
                    <span className="text-sand-200">
                      {r.previous_position} → {r.position}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-sand-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-brand-900">
              ↓ Sökord som behöver åtgärd
            </h2>
            {keywordsDown.length === 0 ? (
              <p className="mt-4 text-sm text-sand-200">
                Inga sökord som behöver åtgärd denna månad.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {keywordsDown.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 text-sm text-red-700"
                  >
                    <span className="text-lg">↓</span>
                    <span>{r.keyword}</span>
                    <span className="text-sand-200">
                      {r.previous_position} → {r.position}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {latestSuggestion?.suggestions && (
          <div className="mt-8 rounded-lg border border-sand-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-brand-900">
              Senaste AI-analys
            </h2>
            <div className="mt-4 space-y-4">
              {latestSuggestion.suggestions.meta_title && (
                <div>
                  <p className="text-xs font-medium uppercase text-brand-600">
                    Meta-titel
                  </p>
                  <p className="mt-1 text-brand-900">
                    {latestSuggestion.suggestions.meta_title}
                  </p>
                </div>
              )}
              {latestSuggestion.suggestions.content_suggestions &&
                latestSuggestion.suggestions.content_suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase text-brand-600">
                      Innehållsförslag
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-brand-900">
                      {latestSuggestion.suggestions.content_suggestions.map(
                        (s, i) => (
                          <li key={i}>{s}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-sand-200">
          <Link href="/" className="text-brand-600 hover:underline">
            EasyPartner OS
          </Link>
        </p>
      </div>
    </div>
  );
}
