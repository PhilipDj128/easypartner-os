import { NextResponse } from 'next/server';

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
    ['built_by_other'],
  ];
  return companies.slice(0, 6).map((name, i) => {
    const issues = issueSets[i];
    const score = Math.floor(20 + Math.random() * 75);
    return {
      id: `demo-${i}-${Date.now()}`,
      company_name: name,
      website: `https://${domains[i]}`,
      contact_email: `info@${domains[i]}`,
      contact_phone: null,
      score,
      issues,
      poor_seo: issues?.includes('poor_seo') ?? false,
      runs_ads: issues?.includes('runs_ads') ?? false,
      slow_site: issues?.includes('slow_site') ?? false,
      built_by: issues?.includes('built_by_other') ? 'annan_byra' : null,
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
        const result = await searchSerp(q);
        const orgs = result?.organic_results?.slice(0, 8) || [];
        const leads = orgs.map((r: { title?: string; link?: string; position?: number }, i: number) => {
          const issues: string[] = [];
          if (Math.random() > 0.4) issues.push('poor_seo');
          if (Math.random() > 0.6) issues.push('runs_ads');
          if (Math.random() > 0.5) issues.push('slow_site');
          if (Math.random() > 0.5) issues.push('built_by_other');
          const score = Math.floor(25 + Math.random() * 70);
          return {
            id: `serp-${i}-${Date.now()}`,
            company_name: r.title || `Företag ${i + 1}`,
            website: r.link || '',
            contact_email: null,
            contact_phone: null,
            score,
            issues,
            poor_seo: issues.includes('poor_seo'),
            runs_ads: issues.includes('runs_ads'),
            slow_site: issues.includes('slow_site'),
            built_by: issues.includes('built_by_other') ? 'annan_byra' : null,
          };
        });
        return NextResponse.json(leads);
      } catch {
        return NextResponse.json(generateDemoLeads(industry, city));
      }
    }

    return NextResponse.json(generateDemoLeads(industry, city));
  } catch (err) {
    console.error('[POST /api/prospects]', err);
    return NextResponse.json({ error: 'Kunde inte söka.' }, { status: 500 });
  }
}
