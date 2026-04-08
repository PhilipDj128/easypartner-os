import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';
import { getBaseUrl } from '@/lib/url';

const NIGHTLY_SEARCHES: { bransch: string; stad: string }[] = [
  { bransch: 'rörmokare', stad: 'Stockholm' },
  { bransch: 'rörmokare', stad: 'Västerås' },
  { bransch: 'elektriker', stad: 'Stockholm' },
  { bransch: 'elektriker', stad: 'Västerås' },
  { bransch: 'städfirma', stad: 'Stockholm' },
  { bransch: 'städfirma', stad: 'Västerås' },
  { bransch: 'flyttfirma', stad: 'Stockholm' },
  { bransch: 'snickare', stad: 'Stockholm' },
  { bransch: 'målare', stad: 'Stockholm' },
  { bransch: 'bilverkstad', stad: 'Västerås' },
];

interface AnalyzedLead {
  company_name: string;
  website: string;
  score: number;
  issues: string[];
}

function normalizeDomain(url: string): string | null {
  try {
    const u = url.startsWith('http') ? new URL(url) : new URL(`https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^www\./, '').toLowerCase() || null;
  }
}

const ISSUE_LABELS: Record<string, string> = {
  built_by_other: 'Byggd av annan byrå',
  runs_ads: 'Kör Google Ads',
  has_facebook_pixel: 'Facebook Pixel',
  pays_catalog: 'Betalar katalog',
  buys_leads: 'Köper leads',
  slow_site: 'Långsam hemsida',
  no_mobile: 'Ingen mobil',
  no_title_or_short: 'Saknar title',
  no_meta_desc: 'Saknar meta description',
  poor_seo: 'Dålig SEO',
  low_ranking: 'Låg ranking',
  bad_google_reviews: 'Dåliga Google-recensioner',
  agency_bad_reviews: 'Byrån har dåliga recensioner',
  bytt_byra_nyligen: 'Bytt byrå nyligen',
};

async function fetchAnalyzedLeads(industry: string, city: string): Promise<AnalyzedLead[]> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/prospects/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
    },
    body: JSON.stringify({ industry, city, save_to_db: false }),
  });

  if (!res.ok || !res.body) return [];

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const leads: AnalyzedLead[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(part.slice(6));
        if (data.type === 'lead' && data.lead) {
          const l = data.lead as AnalyzedLead;
          if (l.company_name && l.website) {
            leads.push({
              company_name: l.company_name,
              website: l.website,
              score: l.score ?? 0,
              issues: Array.isArray(l.issues) ? l.issues : [],
            });
          }
        } else if (data.type === 'done' && Array.isArray(data.leads)) {
          // Fallback: om API:t skickar slutlista, använd den
          return (data.leads as AnalyzedLead[]).map((l) => ({
            company_name: l.company_name,
            website: l.website,
            score: l.score ?? 0,
            issues: Array.isArray(l.issues) ? l.issues : [],
          }));
        }
      } catch {
        // ignorera parse-fel
      }
    }
  }

  return leads;
}

async function handleCron() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  const key = process.env.RESEND_API_KEY;
  const canEmail = key && !key.startsWith('din_');

  let totalAnalyzed = 0;
  let newLeads = 0;
  let duplicates = 0;
  const createdLeads: { name: string; domain: string; score: number; topIssue: string | null }[] = [];

  for (const search of NIGHTLY_SEARCHES) {
    const industry = search.bransch;
    const city = search.stad;

    const leads = await fetchAnalyzedLeads(industry, city);
    totalAnalyzed += leads.length;

    const highScore = leads.filter((l) => (l.score ?? 0) >= 70);

    for (const lead of highScore) {
      const domain = normalizeDomain(lead.website);
      if (!domain || domain.length < 3) continue;

      try {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .ilike('website', `%${domain}%`);

        if ((count ?? 0) > 0) {
          duplicates++;
          continue;
        }

        const topIssueKey = Array.isArray(lead.issues) && lead.issues.length > 0 ? lead.issues[0] : null;
        const topIssueLabel = topIssueKey ? ISSUE_LABELS[topIssueKey] || topIssueKey : null;

        const { error } = await supabase.from('leads').insert({
          company_name: lead.company_name,
          website: lead.website,
          score: lead.score ?? 0,
          issues: Array.isArray(lead.issues) ? lead.issues : [],
          status: 'ny',
          source: 'auto-nightly',
          notes: topIssueLabel ? `Topp-signal: ${topIssueLabel}` : null,
        });

        if (!error) {
          newLeads++;
          createdLeads.push({
            name: lead.company_name,
            domain,
            score: lead.score ?? 0,
            topIssue: topIssueLabel,
          });
        }
      } catch {
        // hoppa vidare vid fel, cron ska inte dö
      }
    }
  }

  if (canEmail) {
    const appBase = getBaseUrl();

    const lines: string[] = [];
    lines.push(`<p>Den nattliga prospekteringen är klar.</p>`);
    lines.push(
      `<p>TOTALT analyserade: <strong>${totalAnalyzed}</strong><br/>Nya leads sparade: <strong>${newLeads}</strong><br/>Dubbletter skippade: <strong>${duplicates}</strong></p>`
    );

    if (createdLeads.length > 0) {
      lines.push('<h3>Nya leads</h3>');
      lines.push('<ul>');
      for (const l of createdLeads) {
        lines.push(
          `<li><strong>${l.name}</strong> – ${l.domain} – score ${l.score}${
            l.topIssue ? ` – topp-signal: ${l.topIssue}` : ''
          }</li>`
        );
      }
      lines.push('</ul>');
    } else {
      lines.push('<p>Inga nya leads hittades denna natt.</p>');
    }

    const link = `${appBase}/prospektering?source=auto-nightly`;
    lines.push(`<p><a href="${link}">Öppna prospekteringen →</a></p>`);

    try {
      await sendEmail({
        to: 'Philip94lgs@gmail.com',
        subject: `Nattlig prospektering klar — ${newLeads} nya leads hittade`,
        html: lines.join('\n'),
      });
    } catch {
      // mailfel ska inte krascha cron
    }
  }

  return NextResponse.json({
    ok: true,
    totalAnalyzed,
    newLeads,
    duplicates,
  });
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  return auth === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleCron();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleCron();
}

