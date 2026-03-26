import { NextResponse } from 'next/server';
import { analyzeSEO } from '@/lib/seo-analyzer';
import { getPageSpeed } from '@/lib/pagespeed-client';
import { getGSCData } from '@/lib/gsc-client';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { AuditResult } from '@/types/audit';

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { url, siteUrl } = body as { url?: string; siteUrl?: string };

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Ogiltig URL. Ange en URL med http:// eller https://' }, { status: 400 });
    }

    // Check cache (1 hour)
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: cached } = await supabase
        .from('audits')
        .select('*')
        .eq('url', url)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        const result: AuditResult = {
          id: cached.id,
          url: cached.url,
          siteUrl: cached.site_url,
          seoScore: cached.seo_score,
          onPageAnalysis: cached.on_page_analysis,
          pagespeedMobile: cached.pagespeed_mobile,
          pagespeedDesktop: cached.pagespeed_desktop,
          gscData: cached.gsc_data,
          issues: cached.issues,
          recommendations: cached.recommendations,
          createdAt: cached.created_at,
        };
        return NextResponse.json(result);
      }
    }

    // Run all analyses in parallel
    const [seoAnalysis, pagespeed, gscData] = await Promise.all([
      analyzeSEO(url),
      getPageSpeed(url),
      siteUrl ? getGSCData(siteUrl) : Promise.resolve(null),
    ]);

    const result: AuditResult = {
      url,
      siteUrl,
      seoScore: seoAnalysis.score,
      onPageAnalysis: seoAnalysis,
      pagespeedMobile: pagespeed.mobile,
      pagespeedDesktop: pagespeed.desktop,
      gscData: gscData,
      issues: seoAnalysis.issues,
      recommendations: seoAnalysis.recommendations,
    };

    // Save to database
    if (supabase) {
      const { data: saved } = await supabase
        .from('audits')
        .insert({
          url,
          site_url: siteUrl || null,
          seo_score: seoAnalysis.score,
          pagespeed_mobile: pagespeed.mobile,
          pagespeed_desktop: pagespeed.desktop,
          on_page_analysis: seoAnalysis,
          gsc_data: gscData,
          issues: seoAnalysis.issues,
          recommendations: seoAnalysis.recommendations,
        })
        .select('id, created_at')
        .single();

      if (saved) {
        result.id = saved.id;
        result.createdAt = saved.created_at;
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('Audit error:', e);
    return NextResponse.json({ error: 'Internt fel vid audit' }, { status: 500 });
  }
}
