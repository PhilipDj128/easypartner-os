import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  const { id } = await params;
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customers (id, name, company, email, phone)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.sent_at !== undefined) updates.sent_at = body.sent_at;
    if (body.opened_at !== undefined) updates.opened_at = body.opened_at;
    if (body.signed_at !== undefined) updates.signed_at = body.signed_at;
    if (body.signed_by_name !== undefined) updates.signed_by_name = body.signed_by_name;
    if (body.signed_ip !== undefined) updates.signed_ip = body.signed_ip;
    if (body.sign_token !== undefined) updates.sign_token = body.sign_token;
    if (body.recipient_name !== undefined) updates.recipient_name = body.recipient_name;
    if (body.recipient_email !== undefined) updates.recipient_email = body.recipient_email;
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.line_items !== undefined) updates.line_items = body.line_items;
    if (body.one_time_cost !== undefined) updates.one_time_cost = body.one_time_cost;
    if (body.monthly_cost !== undefined) updates.monthly_cost = body.monthly_cost;
    if (body.binding_period !== undefined) updates.binding_period = body.binding_period;
    if (body.contract_period !== undefined) updates.contract_period = body.contract_period;
    if (body.quote_number !== undefined) updates.quote_number = body.quote_number;
    if (body.customer_id !== undefined) updates.customer_id = body.customer_id;
    if (body.total_amount !== undefined) updates.total_amount = body.total_amount;

    if (body.status === 'sent') updates.sent_at = new Date().toISOString();
    if (body.status === 'opened') updates.opened_at = new Date().toISOString();
    if (body.status === 'signerad') updates.signed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customers (id, name, company, email)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/quotes]', err);
    return NextResponse.json({ error: 'Kunde inte uppdatera offert.' }, { status: 500 });
  }
}
