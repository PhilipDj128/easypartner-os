import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { AuditResult } from '@/types/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Audit hittades inte' }, { status: 404 });
  }

  const result: AuditResult = {
    id: data.id,
    url: data.url,
    siteUrl: data.site_url,
    seoScore: data.seo_score,
    onPageAnalysis: data.on_page_analysis,
    pagespeedMobile: data.pagespeed_mobile,
    pagespeedDesktop: data.pagespeed_desktop,
    gscData: data.gsc_data,
    issues: data.issues,
    recommendations: data.recommendations,
    createdAt: data.created_at,
  };

  return NextResponse.json(result);
}
