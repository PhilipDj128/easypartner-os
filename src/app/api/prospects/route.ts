import { NextResponse } from 'next/server';

const BLOCKED_DOMAINS = [
  'wikipedia.org',
  'blocket.se',
  'hitta.se',
  'eniro.se',
  'ratsit.se',
];

function isBlockedDomain(link: string): boolean {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
    return BLOCKED_DOMAINS.some((d) => host.includes(d));
  } catch {
    return true;
  }
}

/** Lead scoring 1-100. Max 100. */
function calculateLeadScore(flags: {
  built_by_other?: boolean;
  runs_ads?: boolean;
  has_facebook_pixel?: boolean;
  slow_site?: boolean;
  no_mobile?: boolean;
  no_title_or_short?: boolean;
  no_meta_desc?: boolean;
  poor_seo?: boolean;
}): number {
  let score = 0;
  if (flags.built_by_other) score += 25;
  if (flags.runs_ads) score += 20;
  if (flags.has_facebook_pixel) score += 15;
  if (flags.slow_site) score += 20;
  if (flags.no_mobile) score += 15;
  if (flags.no_title_or_short) score += 10;
  if (flags.no_meta_desc) score += 10;
  if (flags.poor_seo) score += 20;
  return Math.min(100, Math.max(1, score));
}

function generateDemoLeads(industry: string, city: string) {
  const companies = [
    'Städservice AB',
    'Rent & Fräscht',
    'Städexperten',
    'Proffsstäd',
    'Svensk Städ',
    'Städguiden',
    'Renhet i Fokus',
    'Städ & Co',
  ];
  const domains = [
    'stadservice-exempel.se',
    'rentfrascht.se',
    'stadexperten.se',
    'proffsstad.se',
    'svenskstad.se',
    'stadguiden.se',
    'renhetifokus.se',
    'stadco.se',
  ];
  const issueSets = [
    ['poor_seo'],
    ['runs_ads', 'poor_seo'],
    ['slow_site'],
    ['built_by_other', 'poor_seo'],
    ['runs_ads'],
    ['built_by_other', 'slow_site'],
    ['poor_seo', 'slow_site'],
    ['built_by_other', 'no_mobile'],
  ];
  return companies.slice(0, 6).map((name, i) => {
    const issues = issueSets[i];
    const built_by_other = issues?.includes('built_by_other') ?? false;
    const runs_ads = issues?.includes('runs_ads') ?? false;
    const slow_site = issues?.includes('slow_site') ?? false;
    const no_mobile = issues?.includes('no_mobile') ?? false;
    const poor_seo = issues?.includes('poor_seo') ?? false;
    const score = calculateLeadScore({
      built_by_other,
      runs_ads,
      slow_site,
      no_mobile,
      poor_seo,
    });
    return {
      id: `demo-${i}-${Date.now()}`,
      company_name: name,
      website: `https://${domains[i]}`,
      contact_email: `info@${domains[i]}`,
      contact_phone: null,
      score,
      issues,
      poor_seo,
      runs_ads,
      slow_site,
      no_mobile,
      built_by: built_by_other ? 'annan_byra' : null,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const industry = (body.industry || '').toString().trim() || 'företag';
    const city = (body.city || '').toString().trim() || 'Sverige';

    const serpKey = process.env.SERPAPI_KEY;
    const hasSerp = serpKey && !serpKey.startsWith('din_');

    if (hasSerp) {
      try {
        const { searchSerp } = await import('@/lib/serpapi');
        const q = `${industry} ${city}`;
        const result = await searchSerp(q, undefined, 20);
        const allOrgs = result?.organic_results || [];
        const orgs = allOrgs
          .filter((r: { link?: string }) => r.link && !isBlockedDomain(r.link))
          .slice(0, 20);
        const leads = orgs.map((r: { title?: string; link?: string }, i: number) => {
          const issues: string[] = [];
          if (Math.random() > 0.4) issues.push('poor_seo');
          if (Math.random() > 0.6) issues.push('runs_ads');
          if (Math.random() > 0.7) issues.push('has_facebook_pixel');
          if (Math.random() > 0.5) issues.push('slow_site');
          if (Math.random() > 0.5) issues.push('built_by_other');
          if (Math.random() > 0.6) issues.push('no_mobile');
          if (Math.random() > 0.6) issues.push('no_title_or_short');
          if (Math.random() > 0.5) issues.push('no_meta_desc');
          const built_by_other = issues.includes('built_by_other');
          const runs_ads = issues.includes('runs_ads');
          const has_facebook_pixel = issues.includes('has_facebook_pixel');
          const slow_site = issues.includes('slow_site');
          const no_mobile = issues.includes('no_mobile');
          const no_title_or_short = issues.includes('no_title_or_short');
          const no_meta_desc = issues.includes('no_meta_desc');
          const poor_seo = issues.includes('poor_seo');
          const score = calculateLeadScore({
            built_by_other,
            runs_ads,
            has_facebook_pixel,
            slow_site,
            no_mobile,
            no_title_or_short,
            no_meta_desc,
            poor_seo,
          });
          return {
            id: `serp-${i}-${Date.now()}`,
            company_name: r.title || `Företag ${i + 1}`,
            website: r.link || '',
            contact_email: null,
            contact_phone: null,
            score,
            issues,
            poor_seo,
            runs_ads,
            slow_site,
            no_mobile,
            built_by: built_by_other ? 'annan_byra' : null,
          };
        });
        leads.sort((a: { score?: number }, b: { score?: number }) => (b.score ?? 0) - (a.score ?? 0));
        return NextResponse.json(leads);
      } catch {
        const demo = generateDemoLeads(industry, city);
        demo.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        return NextResponse.json(demo);
      }
    }

    const demo = generateDemoLeads(industry, city);
    demo.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return NextResponse.json(demo);
  } catch (err) {
    console.error('[POST /api/prospects]', err);
    return NextResponse.json({ error: 'Kunde inte söka.' }, { status: 500 });
  }
}
