/**
 * Byråns rykte: Trustpilot, varningslista, negativa recensioner, Google, allabolag.
 */

import { searchAllabolagAgencyStatus } from './company-info';

export interface AgencyReputation {
  agency_name: string;
  trustpilot_rating: number | null;
  trustpilot_url: string | null;
  negative_review_count: number;
  on_warning_list: boolean;
  warned: boolean;
  hot_lead: boolean;
  google_reviews_count: number | null;
  google_rating_avg: number | null;
  agency_defunct: boolean;
}

const VARNINGSlista_URL = 'https://www.svenskhandel.se/varningslistan/';

/** Hämta varningslistan och kolla om byrånamn finns */
export async function checkVarningslistan(agencyName: string): Promise<boolean> {
  if (!agencyName || agencyName.length < 3) return false;
  const searchName = agencyName
    .replace(/\s+(AB|HB|KB|aktiebolag|ek\. för\.)?$/i, '')
    .trim();
  if (!searchName) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(VARNINGSlista_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EasyPartnerBot/1.0; +https://easypartner.se)',
      },
    });
    clearTimeout(t);
    const html = await res.text();
    const lower = searchName.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (html.toLowerCase().includes(word)) {
        const escaped = searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(escaped, 'i').test(html)) return true;
      }
    }
    return html.toLowerCase().includes(lower);
  } catch {
    return false;
  }
}

/** Sök byråns rykte via SerpAPI - kräver searchSerp */
export async function fetchAgencyReputation(
  agencyName: string,
  searchSerpFn: (q: string) => Promise<{ organic_results?: { link?: string; title?: string; snippet?: string }[] }>
): Promise<AgencyReputation> {
  const result: AgencyReputation = {
    agency_name: agencyName,
    trustpilot_rating: null,
    trustpilot_url: null,
    negative_review_count: 0,
    on_warning_list: false,
    warned: false,
    hot_lead: false,
    google_reviews_count: null,
    google_rating_avg: null,
    agency_defunct: false,
  };

  if (!agencyName || agencyName.length < 2) return result;

  const searches = [
    `"${agencyName}" recensioner`,
    `"${agencyName}" bluff`,
    `"${agencyName}" varning`,
    `"${agencyName}" Trustpilot`,
    `"${agencyName}" recensioner omdöme bluff`,
  ];

  let trustpilotUrl: string | null = null;
  let trustpilotRating: number | null = null;
  let negativeCount = 0;
  let googleReviewsCount: number | null = null;
  let googleRatingAvg: number | null = null;

  try {
    const serpResults = await Promise.all(
      searches.map((q) => searchSerpFn(q).catch(() => ({ organic_results: [] })))
    );

    const allResults = serpResults.flatMap((r) => r?.organic_results || []);

    for (const r of allResults) {
      const snippet = (r.snippet || '') + (r.title || '');
      const countMatch = snippet.match(/(\d[\d\s]*)\s*recensioner/i) || snippet.match(/(\d[\d\s]*)\s*omdömen/i);
      if (countMatch) {
        const n = parseInt(countMatch[1].replace(/\s/g, ''), 10);
        if (!isNaN(n) && (googleReviewsCount == null || n > googleReviewsCount)) {
          googleReviewsCount = n;
        }
      }
      const ratingMatch = snippet.match(/([0-9][,.][0-9])\s*(?:av|\/)\s*5|([0-9][,.][0-9])\s*\(/i);
      if (ratingMatch) {
        const rv = parseFloat((ratingMatch[1] || ratingMatch[2] || '0').replace(',', '.'));
        if (!isNaN(rv) && rv >= 1 && rv <= 5 && (googleRatingAvg == null || rv > googleRatingAvg)) {
          googleRatingAvg = rv;
        }
      }
    }

    for (const r of allResults) {
      const link = (r.link || '').toLowerCase();
      const snippet = ((r.snippet || '') + (r.title || '')).toLowerCase();
      if (link.includes('trustpilot')) {
        trustpilotUrl = r.link || null;
        const ratingMatch =
          snippet.match(/(\d[,.]\d)\s*\/\s*5|(\d[,.]\d)\s*av\s*5|rating[:\s]*(\d[,.]\d)/i) ||
          (r.title || '').match(/(\d[,.]\d)\s*\/\s*5|(\d[,.]\d)/);
        if (ratingMatch) {
          trustpilotRating = parseFloat((ratingMatch[1] || ratingMatch[2] || ratingMatch[3] || '0').replace(',', '.'));
        }
      }
      if (/bluff|varning|bedräg|klag|dålig|missnöjd|scam/i.test(snippet)) {
        negativeCount++;
      }
    }

    result.trustpilot_rating = trustpilotRating;
    result.trustpilot_url = trustpilotUrl;
    result.negative_review_count = Math.min(negativeCount, 50);
    result.google_reviews_count = googleReviewsCount;
    result.google_rating_avg = googleRatingAvg;

    const [onWarningList, allabolagStatus] = await Promise.all([
      checkVarningslistan(agencyName),
      searchAllabolagAgencyStatus(agencyName),
    ]);
    result.on_warning_list = onWarningList;
    result.agency_defunct = allabolagStatus.isDefunct || allabolagStatus.hasPaymentRemarks;

    result.warned = onWarningList || (trustpilotRating != null && trustpilotRating < 3) || negativeCount > 10;

    result.hot_lead =
      (trustpilotRating != null && trustpilotRating < 3) ||
      onWarningList ||
      negativeCount > 10;

    return result;
  } catch {
    return result;
  }
}
