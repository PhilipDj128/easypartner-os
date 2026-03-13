/**
 * Byråns rykte: Trustpilot, varningslista, negativa recensioner.
 */

export interface AgencyReputation {
  agency_name: string;
  trustpilot_rating: number | null;
  trustpilot_url: string | null;
  negative_review_count: number;
  on_warning_list: boolean;
  warned: boolean;
  hot_lead: boolean;
}

const VARNINGSlista_URL = 'https://www.svenskhandel.se/sakerhet/varningslistan/';

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
  };

  if (!agencyName || agencyName.length < 2) return result;

  const searches = [
    `"${agencyName}" recensioner`,
    `"${agencyName}" bluff`,
    `"${agencyName}" varning`,
    `"${agencyName}" Trustpilot`,
  ];

  let trustpilotUrl: string | null = null;
  let trustpilotRating: number | null = null;
  let negativeCount = 0;

  try {
    const [recensioner, bluff, varning, trustpilot] = await Promise.all(
      searches.map((q) => searchSerpFn(q).catch(() => ({ organic_results: [] })))
    );

    const allResults = [
      ...(recensioner?.organic_results || []),
      ...(bluff?.organic_results || []),
      ...(varning?.organic_results || []),
      ...(trustpilot?.organic_results || []),
    ];

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

    const onWarningList = await checkVarningslistan(agencyName);
    result.on_warning_list = onWarningList;

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
