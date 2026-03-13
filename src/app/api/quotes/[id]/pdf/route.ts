import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { QuotePDF } from '@/components/quotes/QuotePDF';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customers (id, name, company, email)
    `)
    .eq('id', id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 });
  }

  const customer = (quote as { customers?: { name: string; company: string | null } | null }).customers;
  const services = Array.isArray(quote.services) ? quote.services : [];

  const pdfElement = React.createElement(QuotePDF, {
    quoteId: quote.id,
    createdAt: quote.created_at,
    customerName: customer?.name ?? 'Kund',
    customerCompany: customer?.company ?? null,
    services,
    totalAmount: Number(quote.total_amount) || 0,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfElement as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="offert-${id.slice(0, 8)}.pdf"`,
    },
  });
}
