import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

function getAuth() {
  // 1. Försök med JSON-sträng (funkar på Vercel)
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      const credentials = JSON.parse(keyJson);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });
    } catch {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY');
    }
  }

  // 2. Fallback till filsökväg (lokalt)
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) return null;

  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) return null;

  const key = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

export async function getSearchConsoleClient() {
  const auth = getAuth();
  if (!auth) return null;
  return google.searchconsole({ version: 'v1', auth });
}

export async function listSites() {
  const client = await getSearchConsoleClient();
  if (!client) return [];
  try {
    const res = await client.sites.list();
    return res.data.siteEntry || [];
  } catch (e) {
    console.error('GSC listSites error:', e);
    return [];
  }
}

export interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getSearchAnalytics(
  siteUrl: string,
  options: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  }
): Promise<GSCRow[]> {
  const client = await getSearchConsoleClient();
  if (!client) return [];

  try {
    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions || ['query'],
        rowLimit: options.rowLimit || 100,
      },
    });
    return (res.data.rows || []).map((r) => ({
      keys: r.keys || [],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));
  } catch (e) {
    console.error('GSC searchAnalytics error:', e);
    return [];
  }
}

export async function getIndexingStatus(
  siteUrl: string
): Promise<{ inspected: number; indexed: number; notIndexed: number } | null> {
  // URL Inspection API requires individual URL checks — too slow for bulk.
  // Instead we use sitemaps endpoint to get indexed count.
  const client = await getSearchConsoleClient();
  if (!client) return null;

  try {
    const res = await client.sitemaps.list({ siteUrl });
    const sitemaps = res.data.sitemap || [];
    let submitted = 0;
    let indexed = 0;
    for (const sm of sitemaps) {
      for (const content of sm.contents || []) {
        submitted += Number(content.submitted) || 0;
        indexed += Number(content.indexed) || 0;
      }
    }
    return {
      inspected: submitted,
      indexed,
      notIndexed: submitted - indexed,
    };
  } catch (e) {
    console.error('GSC sitemaps error:', e);
    return null;
  }
}

export function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}
