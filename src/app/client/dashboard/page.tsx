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
      <div className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
        <div className="card border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
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
      <div className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
        <div className="card border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
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
    <div
      className="min-h-screen"
      style={{
        backgroundImage: [
          'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, #0a0a0a 80%)',
        ].join(', '),
        backgroundSize: '24px 24px, 100% 100%',
        backgroundPosition: '0 0, 0 0',
      }}
    >
      <header className="border-b px-6 py-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          {customer.logo_url ? (
            <img src={customer.logo_url} alt={companyName} className="h-10 object-contain" />
          ) : (
            <span className="font-heading text-lg font-semibold text-[var(--foreground)]">
              {companyName}
            </span>
          )}
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Logga ut
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="font-heading text-2xl font-semibold text-[var(--foreground)]">
          Välkommen, {companyName}
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Beräknade besökare denna månad
            </p>
            <p className="mt-2 font-heading text-[22px] font-semibold text-[var(--foreground)]" style={{ fontWeight: 600 }}>
              {estimatedVisitors.toLocaleString('sv-SE')}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">SEO-värde (kronor)</p>
            <p className="mt-2 font-heading text-[22px] font-semibold text-[var(--foreground)]" style={{ fontWeight: 600 }}>
              {formatCurrency(seoValue)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {top10Keywords.length} topp-10-sökord × {Math.round(avgSearchVolume).toLocaleString()} snitt sökvolym × 5 kr
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">
              ↑ Sökord som klättrat denna månad
            </h2>
            {keywordsUp.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">Inga sökord har klättrat ännu denna månad.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {keywordsUp.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="text-lg">↑</span>
                    <span>{r.keyword}</span>
                    <span className="text-[var(--muted-foreground)]">{r.previous_position} → {r.position}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">
              ↓ Sökord som behöver åtgärd
            </h2>
            {keywordsDown.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">Inga sökord som behöver åtgärd denna månad.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {keywordsDown.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-sm text-red-400">
                    <span className="text-lg">↓</span>
                    <span>{r.keyword}</span>
                    <span className="text-[var(--muted-foreground)]">{r.previous_position} → {r.position}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {latestSuggestion?.suggestions && (
          <div className="mt-8 card p-6">
            <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">Senaste AI-analys</h2>
            <div className="mt-4 space-y-4">
              {latestSuggestion.suggestions.meta_title && (
                <div>
                  <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Meta-titel</p>
                  <p className="mt-1 text-[var(--foreground)]">{latestSuggestion.suggestions.meta_title}</p>
                </div>
              )}
              {latestSuggestion.suggestions.content_suggestions &&
                latestSuggestion.suggestions.content_suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Innehållsförslag</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--foreground)]">
                      {latestSuggestion.suggestions.content_suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="text-indigo-400 hover:underline">
            EasyPartner OS
          </Link>
        </p>
      </div>
    </div>
  );
}
