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

async function generateQuoteNumber(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EP-${year}-`;
  try {
    const { data } = await supabase
      .from('quotes')
      .select('quote_number')
      .not('quote_number', 'is', null)
      .like('quote_number', `${prefix}%`)
      .order('quote_number', { ascending: false })
      .limit(1);
    const last = (data && data[0]) as { quote_number?: string } | undefined;
    const lastNum = last?.quote_number
      ? parseInt(last.quote_number.replace(prefix, ''), 10)
      : 0;
    const next = String(lastNum + 1).padStart(3, '0');
    return `${prefix}${next}`;
  } catch {
    return `${prefix}001`;
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const lineItems = body.line_items != null ? body.line_items : [];
    const oneTimeCost = Number(body.one_time_cost) || 0;
    const monthlyCost = Number(body.monthly_cost) || 0;
    const totalAmount =
      Number(body.total_amount) ||
      (oneTimeCost + monthlyCost) ||
      (Array.isArray(body.services)
        ? (body.services as { price?: number }[]).reduce((s, i) => s + (Number(i?.price) || 0), 0)
        : 0);

    const quoteNumber =
      (body.quote_number && String(body.quote_number).trim()) ||
      (await generateQuoteNumber(supabase));

    const insertPayload: Record<string, unknown> = {
      customer_id: body.customer_id || null,
      quote_number: quoteNumber,
      line_items: Array.isArray(lineItems) ? lineItems : [],
      one_time_cost: oneTimeCost,
      monthly_cost: monthlyCost,
      binding_period: body.binding_period || null,
      contract_period: body.contract_period || null,
      total_amount: totalAmount,
      status: 'draft',
      valid_until: body.valid_until || null,
      notes: body.notes || null,
      recipient_name: body.recipient_name || null,
      recipient_email: body.recipient_email || null,
    };
    if (Array.isArray(body.services) && body.services.length) {
      (insertPayload as Record<string, unknown>).services = body.services;
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert(insertPayload)
      .select(`
        *,
        customers (id, name, company, email, phone)
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
