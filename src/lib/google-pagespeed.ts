/**
 * Google PageSpeed Insights API v5.
 * runPagespeed med strategy=mobile. Returnerar performance score (0–100) och laddningstid i sekunder.
 */

export interface PageSpeedResult {
  performance_score: number | null;
  load_time_seconds: number | null;
}

export async function runPageSpeed(url: string): Promise<PageSpeedResult> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const out: PageSpeedResult = { performance_score: null, load_time_seconds: null };
  if (!key || key.startsWith('din_')) return out;
  if (!url || !url.startsWith('http')) return out;

  const params = new URLSearchParams({
    url,
    strategy: 'mobile',
    key,
  });

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
      { signal: controller.signal }
    );
    clearTimeout(t);
    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: {
          'first-contentful-paint'?: { numericValue?: number };
          'largest-contentful-paint'?: { numericValue?: number };
          interactive?: { numericValue?: number };
        };
      };
    };
    const lh = data?.lighthouseResult;
    if (!lh) return out;

    const score = lh.categories?.performance?.score;
    if (typeof score === 'number') {
      out.performance_score = Math.round(score * 100);
    }

    const audits = lh.audits ?? {};
    const fcp = audits['first-contentful-paint']?.numericValue;
    const lcp = audits['largest-contentful-paint']?.numericValue;
    const tti = audits.interactive?.numericValue;
    const ms = typeof lcp === 'number' ? lcp : typeof fcp === 'number' ? fcp : typeof tti === 'number' ? tti : null;
    if (ms != null) {
      out.load_time_seconds = Math.round((ms / 1000) * 10) / 10;
    }
    return out;
  } catch {
    return out;
  }
}
