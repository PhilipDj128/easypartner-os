import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('last_updated', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'alla') {
      query = query.eq('status', status);
    }

    if (search) {
      // Sanitera söksträng — ta bort % och _ som Postgres tolkar som wildcards
      const safeSearch = search.replace(/[%_]/g, '');
      query = query.or(
        `company_name.ilike.%${safeSearch}%,org_nr.ilike.%${safeSearch}%,contact_email.ilike.%${safeSearch}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/crm]', err);
    return NextResponse.json({ error: 'Kunde inte hämta leads.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('leads')
      .insert({
        company_name: body.company_name || null,
        website: body.website || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        org_nr: body.org_nr || null,
        decision_maker_name: body.decision_maker_name || null,
        decision_maker_title: body.decision_maker_title || null,
        website_score: body.website_score ?? null,
        runs_ads: body.runs_ads ?? false,
        google_position_keyword: body.google_position_keyword || null,
        google_position_rank: body.google_position_rank ?? null,
        current_it_provider: body.current_it_provider || null,
        matched_product: body.matched_product || null,
        status: body.status || 'ny',
        score: body.score ?? 0,
        issues: body.issues ?? [],
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/crm]', err);
    return NextResponse.json({ error: 'Kunde inte skapa lead.' }, { status: 500 });
  }
}

// Tillåtna fält för lead-uppdatering
const ALLOWED_LEAD_FIELDS = new Set([
  'company_name', 'website', 'contact_email', 'contact_phone',
  'org_nr', 'decision_maker_name', 'decision_maker_title',
  'website_score', 'runs_ads', 'google_position_keyword',
  'google_position_rank', 'current_it_provider', 'matched_product',
  'status', 'score', 'issues', 'notes', 'poor_seo', 'slow_site', 'built_by',
]);

export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, ...rawFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id krävs' }, { status: 400 });
    }

    // Filtrera bort otillåtna fält
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawFields)) {
      if (ALLOWED_LEAD_FIELDS.has(key)) {
        fields[key] = value;
      }
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Inga giltiga fält att uppdatera.' }, { status: 400 });
    }

    // Sätt last_updated automatiskt
    fields.last_updated = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/crm]', err);
    return NextResponse.json({ error: 'Kunde inte uppdatera lead.' }, { status: 500 });
  }
}
