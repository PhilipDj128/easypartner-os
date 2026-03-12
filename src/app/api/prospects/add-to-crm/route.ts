import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { company_name, website, contact_email, contact_phone, score, issues } = body;

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: company_name || 'Okänt företag',
        company: company_name || null,
        email: contact_email || null,
        phone: contact_phone || null,
        notes: score != null ? `Lead score: ${score}. Problem: ${(issues || []).join(', ')}` : null,
      })
      .select()
      .single();

    if (error) throw error;

    if (website) {
      const domainStr = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (domainStr) {
        try {
          await supabase.from('domains').insert({
            customer_id: customer.id,
            domain: domainStr,
            built_by_us: false,
          });
        } catch {
          // domains-tabellen kanske saknas
        }
      }
    }

    try {
      await supabase.from('leads').insert({
        company_name: company_name || null,
        website: website || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        score: score ?? 0,
        issues: Array.isArray(issues) ? issues : [],
        status: 'added_to_crm',
        notes: `Lagt till som kund: ${customer.id}`,
      });
    } catch {
      // leads-tabellen kanske saknas
    }

    return NextResponse.json({ customer });
  } catch (err) {
    console.error('[POST /api/prospects/add-to-crm]', err);
    return NextResponse.json({ error: 'Kunde inte lägga till i CRM.' }, { status: 500 });
  }
}
