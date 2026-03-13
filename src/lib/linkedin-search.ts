/**
 * LinkedIn-sökning för beslutsfattare (VD, CEO, marknadschef).
 */

import { searchSerp } from './serpapi';

export interface DecisionMaker {
  name: string;
  title: string;
  linkedin_url: string;
}

const SEARCH_QUERIES = [
  (company: string) => `"${company}" VD LinkedIn`,
  (company: string) => `"${company}" CEO LinkedIn`,
  (company: string) => `"${company}" marknadschef LinkedIn`,
];

function extractLinkedInFromResult(
  title?: string,
  link?: string,
  snippet?: string
): DecisionMaker | null {
  if (!link || !link.includes('linkedin.com/in/')) return null;

  const nameMatch = (title || snippet || '').match(/([A-ZÅÄÖa-zåäö][a-zåäö]+(?:\s+[A-ZÅÄÖa-zåäö][a-zåäö]+)+)\s*[-|–]?\s*([^|–\n]+)/);
  const parts = (title || '').split(/\s*[-|–]\s*/);
  const name = nameMatch?.[1]?.trim() || (parts[0]?.trim().length > 3 ? parts[0].trim() : null);
  const titleStr = nameMatch?.[2]?.trim() || (parts[1]?.trim() || snippet?.split(/[-|–]/)[0]?.trim() || 'LinkedIn');

  if (!name || name.length < 4) return null;

  return {
    name,
    title: titleStr.slice(0, 80),
    linkedin_url: link,
  };
}

export async function searchDecisionMakers(companyName: string): Promise<DecisionMaker[]> {
  if (!companyName || companyName.length < 3) return [];

  const seen = new Set<string>();
  const results: DecisionMaker[] = [];

  try {
    for (const getQuery of SEARCH_QUERIES) {
      const q = getQuery(companyName);
      const data = await searchSerp(q, 'Sweden', 10);
      const organic = data?.organic_results ?? [];

      for (const r of organic) {
        const dm = extractLinkedInFromResult(
          r.title as string | undefined,
          r.link as string | undefined,
          r.snippet as string | undefined
        );
        if (dm && !seen.has(dm.linkedin_url)) {
          seen.add(dm.linkedin_url);
          results.push(dm);
        }
      }
    }
  } catch {
    //
  }

  const vdFirst = results.sort((a, b) => {
    const aIsVd = /vd|ceo|chief/i.test(a.title);
    const bIsVd = /vd|ceo|chief/i.test(b.title);
    if (aIsVd && !bIsVd) return -1;
    if (!aIsVd && bIsVd) return 1;
    return 0;
  });

  return vdFirst.slice(0, 5);
}
