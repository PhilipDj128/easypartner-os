import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';

const PHILIP_EMAIL = 'Philip94lgs@gmail.com';

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Public: submit signature for quote by token. */
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const token = (body.token || '').toString().trim();
    const signedByName = (body.signed_by_name || '').toString().trim();

    if (!token || !signedByName) {
      return NextResponse.json(
        { error: 'Token och fullständigt namn krävs' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status, recipient_email, recipient_name, quote_number')
      .eq('sign_token', token)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 });
    }

    if ((quote as { status: string }).status === 'signerad') {
      return NextResponse.json({ error: 'Offerten är redan signerad' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'signerad',
        signed_at: new Date().toISOString(),
        signed_by_name: signedByName,
        signed_ip: ip,
      })
      .eq('sign_token', token);

    if (updateError) throw updateError;

    const recipientEmail = (quote as { recipient_email?: string }).recipient_email;
    const recipientName = (quote as { recipient_name?: string }).recipient_name;
    const quoteNumber = (quote as { quote_number?: string }).quote_number || '';

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('din_')) {
      try {
        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Offert ${quoteNumber} signerad – bekräftelse`,
            html: `
              <h2>Tack för din signatur</h2>
              <p>Vi har tagit emot din signatur på offert ${quoteNumber}.</p>
              <p>Signerat av: <strong>${signedByName}</strong><br/>
              Tid: ${new Date().toLocaleString('sv-SE')}</p>
              <p>Med vänliga hälsningar,<br/>EasyPartner</p>
            `,
          });
        }
        await sendEmail({
          to: PHILIP_EMAIL,
          subject: `Offert ${quoteNumber} signerad – ${recipientName || 'Kund'}`,
          html: `
            <h2>Offert signerad</h2>
            <p>${recipientName || 'Kunden'} har signerat offert ${quoteNumber}.</p>
            <p>Signatur: <strong>${signedByName}</strong><br/>
            Tid: ${new Date().toLocaleString('sv-SE')}<br/>
            IP: ${ip}</p>
          `,
        });
      } catch (mailErr) {
        console.error('[quotes/sign] confirmation email', mailErr);
      }
    }

    return NextResponse.json({ ok: true, message: 'Offerten är signerad' });
  } catch (err) {
    console.error('[POST /api/quotes/sign]', err);
    return NextResponse.json(
      { error: 'Kunde inte spara signaturen.' },
      { status: 500 }
    );
  }
}
