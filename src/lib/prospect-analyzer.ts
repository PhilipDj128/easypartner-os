import { extractPhonesFromHtml } from './company-info';
import { lookupHostingProvider } from './dns-hosting';

/**
 * Analyserar en webbplats via fetch (fungerar på Vercel serverless).
 * Hämtar hela HTML-källkoden och analyserar djupare för score-beräkning.
 */

export interface SiteAnalysis {
  built_by_other: boolean;
  built_by_agency: string | null;
  runs_ads: boolean;
  has_facebook_pixel: boolean;
  slow_site: boolean;
  no_mobile: boolean;
  no_title_or_short: boolean;
  no_meta_desc: boolean;
  built_by_text: string | null;
  load_time_ms: number;
  phones: string[];
  hosted_at: string | null;
}

/** Kända byrånamn att söka efter i HTML */
const KNOWN_AGENCIES = [
  'Addictivemedia',
  'Rio',
  'Wunderkraut',
  'Wikinggruppen',
  'Websolution',
  'Webbfabriken',
  'Webstep',
  'Webmeister',
  'Nordicmade',
  'Digitalbyrå',
  'Awave',
  'Zooma',
  'Stendahls',
  'Doe',
  'Familiar',
  'Borg',
  'Hemnet',
  'Cabonline',
  'Effective Media',
  'Netset',
  'Webbyrån',
  'Webbhuset',
  'Nordisk Media',
  'Adtraction',
  'Leadfront',
  'Kundo',
  'Mediafy',
  'Topvisible',
  'Precis Digital',
  'Keybroker',
  'Flowbox',
  'Bambuser',
  'Pineberry',
  'Bonnier',
  'Strossle',
  'Adnami',
  'Adssets',
  'Gotevent',
  'Webbhotell24',
  'Webbplatsen',
  'Itea',
  'Swevolver',
  'Gullviva',
  'Webmaster',
  'Mediabyrån',
  'Mediaplanet',
  'Reklambyrån',
  'Adsensus',
  'Adrecord',
  'Nordic Morning',
  'Comprend',
  'Pyramid',
  'Barsmark',
  'Gullers',
  'Spoon',
  'Diplomat',
  'Springtime',
  'Currystone',
  'Oakwood',
  'Lowe Brindfors',
];

/** Nyckelord för footer/byrå-detektion (exakt enligt spec) */
const AGENCY_KEYWORDS = [
  'webdesign',
  'webbyrå',
  'byggd av',
  'skapad av',
  'designed by',
  'developed by',
];

/** "by" endast som del av längre fras för att undvika falska träffar */
const AGENCY_KEYWORD_BY = /\b(?:site|web|page)\s+by\b/i;

const MAX_DISTANCE_CHARS = 80;

/** Extrahera byrånamn från text efter nyckelord (t.ex. "byggd av Acme Web" -> "Acme Web") */
function extractAgencyNameFromWindow(windowText: string, keyword: string): string | null {
  const idx = windowText.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return null;
  const after = windowText.slice(idx + keyword.length).trim();
  const match = after.match(/^([A-Za-zÅÄÖåäö0-9\s&.\-]+?)(?:\s*[|\-–,.]|$|<|&copy;|©)/);
  const name = (match ? match[1] : after.slice(0, 60)).trim();
  if (name.length < 2 || name.length > 55) return null;
  return name;
}

/** Byrå → vanliga domändelar för länk-matchning */
const AGENCY_DOMAINS: Record<string, string[]> = {
  Rio: ['rio.se', 'rioweb.se'],
  Zooma: ['zooma.nu', 'zooma.se'],
  Netset: ['netset.se'],
  'Effective Media': ['effectivemedia.se', 'effectivemedia.com'],
  Webbhotell24: ['webbhotell24.se'],
  Loopia: ['loopia.se'],
  'One.com': ['one.com'],
};

function getSearchZones(html: string): { text: string; raw: string }[] {
  const zones: { text: string; raw: string }[] = [];

  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) {
    const raw = footerMatch[1];
    zones.push({ raw, text: raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') });
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const last30Len = Math.floor(body.length * 0.3);
  const last30 = body.slice(-last30Len);
  if (last30.length > 0) {
    zones.push({ raw: last30, text: last30.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') });
  }

  const linkMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const m of linkMatches) {
    const href = (m[1] ?? '').toLowerCase();
    const inner = (m[2] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (inner.length > 1 && inner.length < 60 && /\.(se|com|nu|net|org)/i.test(href)) {
      zones.push({ raw: `${href} ${inner}`, text: `${href} ${inner}` });
    }
  }

  return zones;
}

function detectAgencyStrict(html: string, url: string): { agency: string; triggeredBy: string } | null {
  const zones = getSearchZones(html);
  const allKeywords = [...AGENCY_KEYWORDS];

  for (const zone of zones) {
    const searchText = zone.text;

    for (const kw of allKeywords) {
      const kwRe = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let m: RegExpExecArray | null;
      while ((m = kwRe.exec(searchText)) !== null) {
        const start = m.index;
        const window = searchText.slice(start, start + kw.length + MAX_DISTANCE_CHARS);

        const extracted = extractAgencyNameFromWindow(window, kw);
        if (extracted) return { agency: extracted, triggeredBy: window.slice(0, 100).trim() };

        for (const agency of KNOWN_AGENCIES) {
          const agencyRe = new RegExp('\\b' + agency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
          if (agencyRe.test(window)) {
            return {
              agency,
              triggeredBy: window.slice(0, 100).trim(),
            };
          }
        }
      }
    }

    if (AGENCY_KEYWORD_BY.test(searchText)) {
      const byMatch = searchText.match(AGENCY_KEYWORD_BY);
      if (byMatch) {
        const idx = searchText.indexOf(byMatch[0]);
        const window = searchText.slice(idx, idx + byMatch[0].length + MAX_DISTANCE_CHARS);
        for (const agency of KNOWN_AGENCIES) {
          const agencyRe = new RegExp('\\b' + agency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
          if (agencyRe.test(window)) {
            return { agency, triggeredBy: window.slice(0, 100).trim() };
          }
        }
      }
    }
  }

  for (const zone of zones) {
    const hrefMatch = zone.raw.match(/https?:\/\/([^/"'\s]+)/i);
    if (hrefMatch) {
      const domain = hrefMatch[1].toLowerCase().replace(/^www\./, '');
      for (const [agency, domains] of Object.entries(AGENCY_DOMAINS)) {
        if (domains.some((d) => domain.includes(d))) {
          const agencyInZone = new RegExp('\\b' + agency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
          if (agencyInZone.test(zone.text)) {
            return { agency, triggeredBy: `Länk till ${domain}` };
          }
        }
      }
    }
  }

  return null;
}

/** Google Ads: gtag, googletag, adsbygoogle */
const GOOGLE_ADS_PATTERNS = [
  /gtag\s*\(|gtag\.js/i,
  /googletag|googletagmanager\.com/i,
  /adsbygoogle/i,
  /googleadservices\.com/i,
  /googlesyndication\.com/i,
];

/** Facebook Pixel */
const FACEBOOK_PIXEL_PATTERNS = [/fbq\s*\(|fbq\./i, /facebook[\s-]?pixel/i];

export async function analyzeWebsite(url: string): Promise<SiteAnalysis> {
  const result: SiteAnalysis = {
    built_by_other: false,
    built_by_agency: null,
    runs_ads: false,
    has_facebook_pixel: false,
    slow_site: false,
    no_mobile: false,
    no_title_or_short: false,
    no_meta_desc: false,
    built_by_text: null,
    load_time_ms: 0,
    phones: [],
    hosted_at: null,
  };

  if (!url || !url.startsWith('http')) return result;

  const start = Date.now();
  let html = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EasyPartnerBot/1.0; +https://easypartner.se)',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    result.load_time_ms = Date.now() - start;
    html = await res.text();
  } catch {
    result.load_time_ms = Date.now() - start;
    result.slow_site = true;
    return result;
  }

  result.slow_site = result.load_time_ms > 2000;

  /** Strikt byråigenkänning: endast i footer/last 20% body, inom 50 tecken från nyckelord */
  const agencyMatch = detectAgencyStrict(html, url);
  if (agencyMatch) {
    result.built_by_other = true;
    result.built_by_agency = agencyMatch.agency;
    result.built_by_text = agencyMatch.agency;
    if (process.env.DEBUG_AGENCY === '1') {
      console.log('[prospect-analyzer] Byrå matchad:', {
        agency: agencyMatch.agency,
        triggeredBy: agencyMatch.triggeredBy,
        url,
      });
    }
  }

  for (const pattern of GOOGLE_ADS_PATTERNS) {
    if (pattern.test(html)) {
      result.runs_ads = true;
      break;
    }
  }

  for (const pattern of FACEBOOK_PIXEL_PATTERNS) {
    if (pattern.test(html)) {
      result.has_facebook_pixel = true;
      break;
    }
  }

  const viewportMatch = html.match(
    /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i
  );
  const viewport = viewportMatch?.[1] ?? '';
  result.no_mobile =
    !viewport ||
    (!/width\s*=\s*device-width/i.test(viewport) &&
      !/width\s*=\s*\d+/i.test(viewport));

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = (titleMatch?.[1] || '').trim();
  result.no_title_or_short = !titleText || titleText.length < 10;

  const hasMetaDesc =
    /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{10,}/i.test(html) ||
    /<meta[^>]+content=["'][^"']{10,}["'][^>]+name=["']description["']/i.test(
      html
    );
  result.no_meta_desc = !hasMetaDesc;

  result.phones = extractPhonesFromHtml(html);

  try {
    result.hosted_at = await lookupHostingProvider(url);
  } catch {
    // DNS-uppslag misslyckades, behåll null
  }

  return result;
}
