import { getPageSpeedData } from './google-auth';
import type { PageSpeedResult, PageSpeedData } from '@/types/audit';

function extractResult(data: Record<string, unknown> | null): PageSpeedResult | null {
  if (!data) return null;

  const lr = data.lighthouseResult as Record<string, unknown> | undefined;
  if (!lr) return null;

  const cats = lr.categories as Record<string, { score?: number }> | undefined;
  const audits = lr.audits as Record<string, { displayValue?: string }> | undefined;

  return {
    performance: Math.round((cats?.performance?.score ?? 0) * 100),
    accessibility: Math.round((cats?.accessibility?.score ?? 0) * 100),
    seo: Math.round((cats?.seo?.score ?? 0) * 100),
    bestPractices: Math.round((cats?.['best-practices']?.score ?? 0) * 100),
    vitals: {
      lcp: audits?.['largest-contentful-paint']?.displayValue ?? '—',
      cls: audits?.['cumulative-layout-shift']?.displayValue ?? '—',
      tbt: audits?.['total-blocking-time']?.displayValue ?? '—',
      speedIndex: audits?.['speed-index']?.displayValue ?? '—',
    },
  };
}

export async function getPageSpeed(url: string): Promise<PageSpeedData> {
  const [mobileRaw, desktopRaw] = await Promise.all([
    getPageSpeedData(url, 'mobile'),
    getPageSpeedData(url, 'desktop'),
  ]);

  return {
    mobile: extractResult(mobileRaw),
    desktop: extractResult(desktopRaw),
  };
}
