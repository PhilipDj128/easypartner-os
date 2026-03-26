import { NextRequest, NextResponse } from 'next/server';
import { getSearchConsoleService } from '@/lib/google-auth';

function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteUrl = searchParams.get('site');

  const service = getSearchConsoleService();

  // If no site specified, return list of available sites
  if (!siteUrl) {
    if (!service) return NextResponse.json({ sites: [] });
    try {
      const res = await service.sites.list();
      return NextResponse.json({ sites: res.data.siteEntry || [] });
    } catch (e) {
      console.error('GSC listSites error:', e);
      return NextResponse.json({ sites: [] });
    }
  }

  if (!service) {
    return NextResponse.json({
      siteUrl,
      period: { startDate: dateString(28), endDate: dateString(1), days: 28 },
      summary: { totalClicks: 0, totalImpressions: 0, avgPosition: 0, avgCtr: 0 },
      indexing: null,
      topQueries: [],
      topPages: [],
    });
  }

  const days = parseInt(searchParams.get('days') || '28', 10);
  const startDate = dateString(days);
  const endDate = dateString(1);

  try {
    // Fetch data in parallel
    const [queryRes, pageRes, smRes] = await Promise.all([
      service.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 50,
        },
      }),
      service.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 20,
        },
      }),
      service.sitemaps.list({ siteUrl }).catch(() => ({ data: { sitemap: [] } })),
    ]);

    const queryData = (queryRes.data.rows || []).map((r) => ({
      keys: r.keys || [],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    const pageData = (pageRes.data.rows || []).map((r) => ({
      keys: r.keys || [],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    // Indexing from sitemaps
    const sitemaps = smRes.data.sitemap || [];
    let submitted = 0;
    let indexed = 0;
    for (const sm of sitemaps) {
      for (const content of sm.contents || []) {
        submitted += Number(content.submitted) || 0;
        indexed += Number(content.indexed) || 0;
      }
    }
    const indexing = sitemaps.length > 0
      ? { inspected: submitted, indexed, notIndexed: submitted - indexed }
      : null;

    // Aggregate totals
    const totalClicks = queryData.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = queryData.reduce((s, r) => s + r.impressions, 0);
    const avgPosition =
      queryData.length > 0
        ? queryData.reduce((s, r) => s + r.position, 0) / queryData.length
        : 0;
    const avgCtr =
      queryData.length > 0
        ? queryData.reduce((s, r) => s + r.ctr, 0) / queryData.length
        : 0;

    return NextResponse.json({
      siteUrl,
      period: { startDate, endDate, days },
      summary: {
        totalClicks,
        totalImpressions,
        avgPosition: Math.round(avgPosition * 10) / 10,
        avgCtr: Math.round(avgCtr * 1000) / 10,
      },
      indexing,
      topQueries: queryData.map((r) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10,
        position: Math.round(r.position * 10) / 10,
      })),
      topPages: pageData.map((r) => ({
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10,
        position: Math.round(r.position * 10) / 10,
      })),
    });
  } catch (e) {
    console.error('GSC audit error:', e);
    return NextResponse.json({
      siteUrl,
      period: { startDate, endDate, days },
      summary: { totalClicks: 0, totalImpressions: 0, avgPosition: 0, avgCtr: 0 },
      indexing: null,
      topQueries: [],
      topPages: [],
      error: 'Kunde inte hämta Search Console-data',
    });
  }
}
