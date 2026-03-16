import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';
import { randomBytes } from 'crypto';

function generateSignToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const recipientName = (body.recipient_name || '').toString().trim();
    const recipientEmail = (body.recipient_email || '').toString().trim();
    const emailSubject = (body.email_subject || '').toString().trim();
    const emailMessage = (body.email_message || '').toString().trim();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Mottagarens e-postadress krävs' },
        { status: 400 }
      );
    }

    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, quote_number, status, customers(name, company)')
      .eq('id', id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 });
    }

    const signToken = generateSignToken();
    const baseUrl =
      process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith('http')
        ? `https://${process.env.VERCEL_URL}`
        : process.env.VERCEL_URL || 'http://localhost:3000';
    const signUrl = `${baseUrl}/quotes/sign/${signToken}`;

    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        sign_token: signToken,
        recipient_name: recipientName || (quote as { customers?: { name?: string } }).customers?.name,
        recipient_email: recipientEmail,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    const quoteNumber = (quote as { quote_number?: string }).quote_number || `#${id.slice(0, 8)}`;
    const docName = `Offert ${quoteNumber}`;
    const firstName = recipientName ? recipientName.split(/\s+/)[0] : 'där';

    const subject =
      emailSubject ||
      `Offert från EasyPartner – ${(quote as { customers?: { company?: string } }).customers?.company || 'din offert'}`;
    const message =
      emailMessage ||
      `Hej ${firstName},\n\nHär kommer din offert från EasyPartner. Klicka på länken nedan för att läsa och signera.\n\n${signUrl}\n\nMed vänliga hälsningar,\nEasyPartner`;

    const htmlMessage = message
      .replace(/\{\{recipient\.first_name\}\}/g, firstName)
      .replace(/\{\{document\.name\}\}/g, docName)
      .replace(/\n/g, '<br/>');

    const finalSubject = subject
      .replace(/\{\{recipient\.first_name\}\}/g, firstName)
      .replace(/\{\{document\.name\}\}/g, docName);

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('din_')) {
      await sendEmail({
        to: recipientEmail,
        subject: finalSubject,
        html: `<div style="font-family: sans-serif;">${htmlMessage}</div>`,
      });
    }

    return NextResponse.json({ ok: true, sign_url: signUrl });
  } catch (err) {
    console.error('[POST /api/quotes/[id]/send]', err);
    return NextResponse.json(
      { error: 'Kunde inte skicka offerten.' },
      { status: 500 }
    );
  }
}
