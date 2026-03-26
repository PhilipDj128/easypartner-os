import { getSearchConsoleService } from './google-auth';
import type { GSCData, SearchQuery, SitemapResult } from '@/types/audit';

function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export async function getGSCData(siteUrl: string): Promise<GSCData | null> {
  const service = getSearchConsoleService();
  if (!service) return null;

  const startDate = dateString(28);
  const endDate = dateString(1);

  try {
    // Top queries
    const queryRes = await service.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 50,
      },
    });

    const topQueries: SearchQuery[] = (queryRes.data.rows || []).map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Math.round((r.ctr || 0) * 1000) / 10,
      position: Math.round((r.position || 0) * 10) / 10,
    }));

    // Sitemaps
    let sitemapStatus: SitemapResult[] = [];
    try {
      const smRes = await service.sitemaps.list({ siteUrl });
      sitemapStatus = (smRes.data.sitemap || []).map((sm) => {
        let submitted = 0;
        let indexed = 0;
        for (const c of sm.contents || []) {
          submitted += Number(c.submitted) || 0;
          indexed += Number(c.indexed) || 0;
        }
        return { path: sm.path || '', submitted, indexed };
      });
    } catch (e) {
      console.error('GSC sitemaps error:', e);
    }

    return {
      topQueries,
      indexStatus: [], // URL Inspection requires individual URL checks
      sitemapStatus,
    };
  } catch (e) {
    console.error('GSC data error:', e);
    return null;
  }
}
