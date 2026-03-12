import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    if (body.status) {
      updates.status = body.status;
      if (body.status === 'sent') updates.sent_at = new Date().toISOString();
      if (body.status === 'opened') updates.opened_at = new Date().toISOString();
      if (body.status === 'signed') updates.signed_at = new Date().toISOString();
    }

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
