import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const DAILY_LIMIT = 100;

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ remaining: DAILY_LIMIT, used: 0, limit: DAILY_LIMIT });

  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_usage')
    .select('search_count')
    .eq('date', today)
    .single();

  const used = data?.search_count ?? 0;
  return NextResponse.json({ remaining: Math.max(0, DAILY_LIMIT - used), used, limit: DAILY_LIMIT });
}
