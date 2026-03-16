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
  const recipientName = (quote as { recipient_name?: string }).recipient_name;
  const oneTimeItems = Array.isArray((quote as { one_time_items?: unknown[] }).one_time_items)
    ? (quote as { one_time_items: unknown[] }).one_time_items
    : [];
  const monthlyItems = Array.isArray((quote as { monthly_items?: unknown[] }).monthly_items)
    ? (quote as { monthly_items: unknown[] }).monthly_items
    : [];
  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];
  const oneTimeFallback = lineItems.filter((i: { type?: string }) => i.type === 'one_time');
  const monthlyFallback = lineItems.filter((i: { type?: string }) => i.type === 'monthly');

  const pdfElement = React.createElement(QuotePDF, {
    quoteId: quote.id,
    quoteNumber: (quote as { quote_number?: string }).quote_number,
    createdAt: quote.created_at,
    customerName: (recipientName || customer?.name) ?? 'Kund',
    customerCompany: customer?.company ?? null,
    oneTimeItems: oneTimeItems.length > 0 ? oneTimeItems : oneTimeFallback,
    monthlyItems: monthlyItems.length > 0 ? monthlyItems : monthlyFallback,
    discountPercent: Number((quote as { discount_percent?: number }).discount_percent) || 0,
    oneTimeCost: Number((quote as { one_time_cost?: number }).one_time_cost) || undefined,
    monthlyCost: Number((quote as { monthly_cost?: number }).monthly_cost) || undefined,
    totalAmount: Number(quote.total_amount) || 0,
    validUntil: (quote as { valid_until?: string }).valid_until,
    notes: (quote as { notes?: string }).notes,
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
