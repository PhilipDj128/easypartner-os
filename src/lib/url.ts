/**
 * Hämtar bas-URL:en för appen.
 * Prioritet: NEXT_PUBLIC_APP_URL > VERCEL_URL > localhost
 */
export function getBaseUrl(): string {
  // 1. Explicit konfigurerad URL (sätts i Vercel env vars)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Vercel-genererad URL (finns automatiskt på Vercel)
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url}`;
  }

  // 3. Fallback till localhost i dev
  return 'http://localhost:3000';
}
