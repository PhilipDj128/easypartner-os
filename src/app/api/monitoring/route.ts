import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/** Extrahera sidfotens text från HTML */
function extractFooterText(html: string): string {
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) {
    return footerMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const body = bodyMatch[1];
    const lastPart = body.slice(-3000);
    return lastPart.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(-2000);
}

/** Normalisera domän för jämförelse */
function normalizeDomain(url: string): string {
  try {
    const u = url.startsWith('http') ? new URL(url) : new URL(`https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^www\./, '').toLowerCase();
  }
}

/** Hämta full URL från domän */
function toUrl(domain: string): string {
  return domain.includes('://') ? domain : `https://${domain}`;
}

export async function GET() {
  return runMonitoring();
}

export async function POST() {
  return runMonitoring();
}

async function runMonitoring() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  const newLeads: { domain: string; company_name: string }[] = [];
  const errors: { domain: string; error: string }[] = [];

  try {
    const domainsToCheck: { domain: string; company_name: string; source: string; source_id: string }[] = [];

    const { data: leadsData } = await supabase.from('leads').select('id, website, company_name').not('website', 'is', null);
    for (const row of leadsData ?? []) {
      const domain = normalizeDomain(row.website ?? '');
      if (domain && domain.length > 3) {
        domainsToCheck.push({
          domain,
          company_name: row.company_name ?? 'Okänt företag',
          source: 'leads',
          source_id: row.id ?? '',
        });
      }
    }

    const { data: domainsData } = await supabase
      .from('domains')
      .select('domain, customer_id, customers(id, name, company)');
    for (const row of domainsData ?? []) {
      const domain = normalizeDomain(row.domain ?? '');
      if (domain && domain.length > 3 && !domainsToCheck.some((d) => d.domain === domain)) {
        const cust = (row as { customers?: { name?: string; company?: string } | null }).customers;
        const company_name = cust?.company || cust?.name || 'Okänt företag';
        const r = row as { customer_id?: string };
        domainsToCheck.push({
          domain,
          company_name: String(company_name),
          source: 'customers',
          source_id: r.customer_id ?? '',
        });
      }
    }

    const uniqueDomains = Array.from(new Map(domainsToCheck.map((d) => [d.domain, d])).values());

    for (const { domain, company_name, source, source_id } of uniqueDomains) {
      try {
        const url = toUrl(domain);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EasyPartnerBot/1.0; +https://easypartner.se)' },
          redirect: 'follow',
        });
        clearTimeout(t);
        const html = await res.text();
        const snapshotText = extractFooterText(html);

        const { data: lastSnapshot } = await supabase
          .from('footer_snapshots')
          .select('snapshot_text')
          .eq('domain', domain)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const prevText = (lastSnapshot?.snapshot_text ?? '').trim();
        const currText = snapshotText.trim();
        const hasChanged = prevText && currText && prevText !== currText;

        await supabase.from('footer_snapshots').insert({
          domain,
          source,
          source_id: source_id || null,
          company_name,
          snapshot_text: currText || '(tom)',
        });

        if (hasChanged) {
          const { error: insertErr } = await supabase.from('leads').insert({
            company_name,
            website: url,
            score: 90,
            issues: ['bytt_byra_nyligen'],
            built_by: 'annan_byra',
            status: 'new',
            notes: 'Byråbyte-bevakning: sidfoten har ändrats.',
          });
          if (!insertErr) {
            newLeads.push({ domain, company_name });
          }
        }
      } catch (err) {
        errors.push({ domain, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: uniqueDomains.length,
      new_leads: newLeads.length,
      new_leads_list: newLeads,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error('[monitoring]', err);
    return NextResponse.json(
      { error: 'Bevakning misslyckades', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
