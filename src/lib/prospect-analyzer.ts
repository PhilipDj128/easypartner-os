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
];

/** Generiska fraser + extraktion av byrånamn: built by, created by, powered by, design by, av */
const BUILT_BY_PATTERNS = [
  /byggd\s+av\s+([^<"'\n]+)/i,
  /created\s+by\s+([^<"'\n]+)/i,
  /powered\s+by\s+([^<"'\n]+)/i,
  /developed\s+by\s+([^<"'\n]+)/i,
  /web\s+by\s+([^<"'\n]+)/i,
  /design\s+by\s+([^<"'\n]+)/i,
  /designad\s+av\s+([^<"'\n]+)/i,
  /skapad\s+av\s+([^<"'\n]+)/i,
  /utvecklad\s+av\s+([^<"'\n]+)/i,
  /made\s+by\s+([^<"'\n]+)/i,
  /\bav\s+([A-ZÅÄÖa-zåäö][A-Za-zåäö0-9&\s\-]+?)(?:\s*[|–\-]|\s*$|<)/i,
];

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

  /** Först: sök efter kända byrånamn */
  for (const agency of KNOWN_AGENCIES) {
    const re = new RegExp(agency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(html)) {
      result.built_by_other = true;
      result.built_by_agency = agency;
      result.built_by_text = agency;
      break;
    }
  }

  /** Om ingen känd byrå: sök generiska fraser */
  if (!result.built_by_agency) {
    for (const pattern of BUILT_BY_PATTERNS) {
      const m = html.match(pattern);
      if (m) {
        const text = m[1].trim().replace(/<[^>]+>/g, '').slice(0, 80);
        if (text && !/wix|wordpress|squarespace|webflow|shopify|google|microsoft/i.test(text)) {
          result.built_by_other = true;
          result.built_by_agency = text;
          result.built_by_text = text;
          break;
        }
      }
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

  return result;
}
