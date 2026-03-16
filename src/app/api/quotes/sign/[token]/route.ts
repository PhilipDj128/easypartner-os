import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/** Public: get quote by sign token (for signing page). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token saknas' }, { status: 400 });
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      created_at,
      status,
      total_amount,
      one_time_cost,
      monthly_cost,
      discount_percent,
      line_items,
      one_time_items,
      monthly_items,
      valid_until,
      notes,
      recipient_name,
      recipient_email,
      signed_at,
      signed_by_name,
      customers (id, name, company, email, phone)
    `)
    .eq('sign_token', token)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'Offert hittades inte eller länk ogiltig' }, { status: 404 });
  }

  return NextResponse.json(quote);
}
