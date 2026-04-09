/**
 * Google Custom Search JSON API client
 * Replaces SerpAPI with free 100 queries/day
 */

interface GoogleCSEResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface GoogleCSEResponse {
  organic_results: GoogleCSEResult[];
}

export async function searchGoogle(
  query: string,
  numResults: number = 10
): Promise<GoogleCSEResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cx) {
    console.error('[google-cse] Missing GOOGLE_PLACES_API_KEY or GOOGLE_CSE_ID');
    return { organic_results: [] };
  }

  // Google CSE max 10 results per request, so we may need multiple calls
  const allResults: GoogleCSEResult[] = [];
  const pages = Math.ceil(Math.min(numResults, 20) / 10);

  for (let page = 0; page < pages; page++) {
    const start = page * 10 + 1;
    const num = Math.min(10, numResults - allResults.length);

    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: String(num),
      start: String(start),
      gl: 'se', // Sweden
      lr: 'lang_sv', // Swedish results
    });

    try {
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
      if (!res.ok) {
        const err = await res.text();
        console.error(`[google-cse] API error ${res.status}:`, err);
        break;
      }

      const data = await res.json();
      const items = data.items ?? [];

      for (const item of items) {
        allResults.push({
          title: item.title ?? undefined,
          link: item.link ?? undefined,
          snippet: item.snippet ?? undefined,
        });
      }

      // No more results available
      if (items.length < num) break;
    } catch (err) {
      console.error('[google-cse] fetch error:', err);
      break;
    }
  }

  return { organic_results: allResults };
}
