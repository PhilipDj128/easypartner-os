import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customers (id, name, company, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "quotes" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/quotes]', err);
    return NextResponse.json({ error: 'Kunde inte hämta offerter.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const services = Array.isArray(body.services) ? body.services : [];
    const totalAmount = services.reduce((sum: number, s: { price?: number }) => sum + (Number(s?.price) || 0), 0);

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        customer_id: body.customer_id || null,
        services,
        total_amount: totalAmount,
        status: 'draft',
        valid_until: body.valid_until || null,
      })
      .select(`
        *,
        customers (id, name, company, email)
      `)
      .single();

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "quotes" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/quotes]', err);
    return NextResponse.json({ error: 'Kunde inte skapa offert.' }, { status: 500 });
  }
}
