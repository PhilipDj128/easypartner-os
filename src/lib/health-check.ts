/**
 * Hälsokoll: SEO-analys, ranking, konkurrenter, beräknad intäktsförlust.
 */

import { analyzeWebsite } from './prospect-analyzer';
import { searchSerp } from './serpapi';

function getDomain(link: string): string | null {
  try {
    return new URL(link).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

const SKIP_DOMAINS = [
  'wikipedia.org', 'blocket.se', 'hitta.se', 'eniro.se', 'ratsit.se',
  'facebook.com', 'linkedin.com', 'youtube.com', 'google.com',
];

export interface HealthCheckResult {
  company_name: string;
  website: string;
  seo_score: number;
  seo_findings: string[];
  title: string | null;
  meta_description: string | null;
  has_h1: boolean;
  load_time_ms: number;
  name_rank: number | null;
  competitors: { name: string; domain: string; rank: number }[];
  estimated_lost_customers_per_month: number;
  search_volume_used: number;
}

export async function runHealthCheck(
  website: string,
  companyName?: string | null
): Promise<HealthCheckResult> {
  const url = website.startsWith('http') ? website : `https://${website}`;
  const siteHost = getDomain(url) ?? '';

  const analysis = await analyzeWebsite(url);
  const start = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EasyPartnerBot/1.0)' },
    redirect: 'follow',
  });
  const html = await res.text();
  const loadTime = Math.max(analysis.load_time_ms, Date.now() - start);
  const findings: string[] = [];
  let seoScore = 100;

  if (analysis.no_title_or_short) {
    findings.push('Saknar eller för kort title');
    seoScore -= 25;
  }
  if (analysis.no_meta_desc) {
    findings.push('Saknar meta description');
    seoScore -= 20;
  }
  if (analysis.slow_site || loadTime > 2000) {
    findings.push(`Långsam laddningstid: ${loadTime}ms`);
    seoScore -= 15;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? null;
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const meta_description = metaDescMatch?.[1]?.trim() ?? null;
  const has_h1 = /<h1[^>]*>[\s\S]*?<\/h1>/i.test(html);

  if (!has_h1) {
    findings.push('Saknar H1-rubrik');
    seoScore -= 15;
  }

  const searchName = companyName || title?.replace(/\s*[-|–].*$/, '').trim() || siteHost.replace(/\.(se|com|nu|net|org)$/, '');
  if (!searchName) {
    return {
      company_name: companyName || siteHost,
      website: url,
      seo_score: Math.max(0, seoScore),
      seo_findings: findings,
      title,
      meta_description,
      has_h1,
      load_time_ms: loadTime,
      name_rank: null,
      competitors: [],
      estimated_lost_customers_per_month: 0,
      search_volume_used: 0,
    };
  }

  const serpResult = await searchSerp(`"${searchName}"`, 'Sweden', 40);
  const organic = serpResult?.organic_results ?? [];

  let name_rank: number | null = null;
  const competitors: { name: string; domain: string; rank: number }[] = [];

  for (let i = 0; i < organic.length; i++) {
    const r = organic[i];
    const link = r.link ?? '';
    const d = getDomain(link);
    if (!d || SKIP_DOMAINS.some((s) => d.includes(s))) continue;

    const isMainSite = d === siteHost || siteHost.endsWith(d) || d.endsWith(siteHost);
    if (isMainSite) {
      name_rank = i + 1;
    } else if (competitors.length < 3 && r.title) {
      const compName = (r.title as string).replace(/\s*[-|–].*$/, '').trim().slice(0, 60);
      competitors.push({ name: compName, domain: d, rank: i + 1 });
    }
  }

  const avgSearchVolume = 800;
  let lostCustomers = 0;
  if (name_rank != null && competitors.length > 0) {
    const bestCompetitor = competitors[0];
    const rankDiff = Math.max(0, name_rank - bestCompetitor.rank);
    lostCustomers = Math.round(rankDiff * avgSearchVolume * 0.02);
  }

  return {
    company_name: companyName || searchName,
    website: url,
    seo_score: Math.max(0, seoScore),
    seo_findings: findings,
    title,
    meta_description,
    has_h1,
    load_time_ms: loadTime,
    name_rank,
    competitors,
    estimated_lost_customers_per_month: lostCustomers,
    search_volume_used: avgSearchVolume,
  };
}
