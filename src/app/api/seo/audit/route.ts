import { NextRequest, NextResponse } from 'next/server';
import {
  listSites,
  getSearchAnalytics,
  getIndexingStatus,
  dateString,
} from '@/lib/google-search-console';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteUrl = searchParams.get('site');

  // If no site specified, return list of available sites
  if (!siteUrl) {
    const sites = await listSites();
    return NextResponse.json({ sites });
  }

  const days = parseInt(searchParams.get('days') || '28', 10);
  const startDate = dateString(days);
  const endDate = dateString(1);

  // Fetch data in parallel
  const [queryData, pageData, indexing] = await Promise.all([
    getSearchAnalytics(siteUrl, {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 50,
    }),
    getSearchAnalytics(siteUrl, {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 20,
    }),
    getIndexingStatus(siteUrl),
  ]);

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
}
