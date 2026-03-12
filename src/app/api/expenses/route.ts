import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Ogiltigt belopp.' }, { status: 400 });
    }
    const now = new Date();
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        category: body.category || null,
        description: body.description || null,
        amount,
        month: body.month ?? now.getMonth() + 1,
        year: body.year ?? now.getFullYear(),
        supplier: body.supplier || null,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabellen "expenses" finns inte. Kör SQL-schemat i Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/expenses]', err);
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : '';
    return NextResponse.json(
      { error: 'Kunde inte spara utgift.', details: msg },
      { status: 500 }
    );
  }
}
