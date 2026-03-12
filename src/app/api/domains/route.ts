import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const { data, error } = await supabase
      .from('domains')
      .select(`
        *,
        customers (id, name)
      `)
      .order('domain');

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "domains" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/domains]', err);
    return NextResponse.json({ error: 'Kunde inte hämta domäner.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    if (!body.domain?.trim()) {
      return NextResponse.json({ error: 'Domän är obligatoriskt.' }, { status: 400 });
    }
    if (!body.customer_id) {
      return NextResponse.json({ error: 'Välj en kund.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('domains')
      .insert({
        customer_id: body.customer_id,
        domain: body.domain.trim(),
        hosting_provider: body.hosting_provider?.trim() || null,
        renewal_date: body.renewal_date || null,
        built_by_us: body.built_by_us ?? false,
      })
      .select(`
        *,
        customers (id, name)
      `)
      .single();

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "domains" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/domains]', err);
    return NextResponse.json({ error: 'Kunde inte spara domän.' }, { status: 500 });
  }
}
