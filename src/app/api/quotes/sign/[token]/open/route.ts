import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/** Public: mark quote as opened (when recipient opens signing page). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Token saknas' }, { status: 400 });

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, opened_at')
    .eq('sign_token', token)
    .single();

  if (!quote || (quote as { opened_at?: string }).opened_at) {
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from('quotes')
    .update({ opened_at: new Date().toISOString(), status: 'opened' })
    .eq('sign_token', token);

  return NextResponse.json({ ok: true });
}
