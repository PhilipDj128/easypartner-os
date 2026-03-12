import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const CUSTOMER_COLUMNS = [
  'name',
  'company',
  'email',
  'phone',
  'birthday',
  'contract_value',
  'contract_start',
  'contract_end',
  'contract_length_months',
  'services',
  'status',
  'notes',
  'last_contact',
  'churn_risk',
  'lifetime_value',
] as const;

function sanitizeInsertBody(body: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const col of CUSTOMER_COLUMNS) {
    const val = body[col];
    if (val === undefined) continue;
    if (val === '' || val === null) {
      sanitized[col] = null;
      continue;
    }
    if (col === 'contract_value' || col === 'churn_risk' || col === 'lifetime_value') {
      const num = Number(val);
      sanitized[col] = Number.isFinite(num) ? num : null;
      continue;
    }
    sanitized[col] = val;
  }
  return sanitized;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/customers]', err);
    return NextResponse.json(
      { error: 'Kunde inte hämta kunder.', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase service role key saknas. Lägg till SUPABASE_SERVICE_ROLE_KEY i .env.local (hämta från Supabase Dashboard → Project Settings → API).',
      },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !body.name?.trim()) {
      return NextResponse.json({ error: 'Namn är obligatoriskt.' }, { status: 400 });
    }

    const sanitized = sanitizeInsertBody(body);
    const { data, error } = await supabase
      .from('customers')
      .insert(sanitized)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : String(err);
    console.error('[POST /api/customers]', err);
    return NextResponse.json(
      {
        error: 'Kunde inte spara kund.',
        details: message,
      },
      { status: 500 }
    );
  }
}
