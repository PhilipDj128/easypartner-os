import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

function getCredentials(): Record<string, unknown> | null {
  // Try JSON string from env first
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      return JSON.parse(keyJson);
    } catch {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY');
    }
  }

  // Fall back to file path
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const resolved = path.resolve(keyPath);
      if (fs.existsSync(resolved)) {
        return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load service account key file:', e);
    }
  }

  return null;
}

export function getAuthClient(): GoogleAuth | null {
  const credentials = getCredentials();
  if (!credentials) return null;

  return new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

export function getSearchConsoleService() {
  const auth = getAuthClient();
  if (!auth) return null;
  return google.searchconsole({ version: 'v1', auth });
}

export async function getPageSpeedData(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const endpoint = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const params = new URLSearchParams({
    url,
    key: apiKey,
    category: 'performance',
    strategy,
  });
  // Add multiple categories
  params.append('category', 'accessibility');
  params.append('category', 'seo');
  params.append('category', 'best-practices');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${endpoint}?${params}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`PageSpeed ${strategy} error:`, e);
    return null;
  }
}
