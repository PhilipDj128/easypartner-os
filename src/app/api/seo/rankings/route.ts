import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id');

  try {
    let query = supabase
      .from('seo_rankings')
      .select('*')
      .order('keyword');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "seo_rankings" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/seo/rankings]', err);
    return NextResponse.json({ error: 'Kunde inte hämta rankingar.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    if (!body.keyword?.trim()) {
      return NextResponse.json({ error: 'Sökord är obligatoriskt.' }, { status: 400 });
    }
    if (!body.customer_id) {
      return NextResponse.json({ error: 'Välj en kund.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('seo_rankings')
      .insert({
        customer_id: body.customer_id,
        domain: body.domain?.trim() || null,
        keyword: body.keyword.trim(),
        position: body.position ?? null,
        previous_position: body.previous_position ?? null,
        search_volume: body.search_volume ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "seo_rankings" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/seo/rankings]', err);
    return NextResponse.json({ error: 'Kunde inte spara sökord.' }, { status: 500 });
  }
}
