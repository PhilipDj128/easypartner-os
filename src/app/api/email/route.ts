import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';

type EmailAction = 'send_quote' | 'quote_reminder' | 'quote_signed';

export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('din_')) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY är inte konfigurerad i .env.local' },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const action = body.action as EmailAction;
    const to = body.to as string;

    if (!to?.includes('@')) {
      return NextResponse.json({ error: 'Ogiltig e-postadress.' }, { status: 400 });
    }

    switch (action) {
      case 'send_quote': {
        const { customerName, services, totalAmount } = body;
        const servicesList = Array.isArray(services)
          ? services.map((s: { name?: string; price?: number }) => `• ${s.name ?? ''}: ${(s.price ?? 0).toLocaleString('sv-SE')} kr`).join('\n')
          : '';
        const total = typeof totalAmount === 'number' ? totalAmount.toLocaleString('sv-SE') : totalAmount ?? '0';
        await sendEmail({
          to,
          subject: `Offert från EasyPartner – ${customerName ?? 'Kund'}`,
          html: `
            <h2>Hej ${customerName ?? 'Kund'}!</h2>
            <p>Här är din offert från EasyPartner.</p>
            <h3>Tjänster</h3>
            <pre style="font-family: sans-serif;">${servicesList || '—'}</pre>
            <p><strong>Totalsumma: ${total} kr</strong></p>
            <p>Med vänliga hälsningar,<br>EasyPartner</p>
          `,
        });
        return NextResponse.json({ success: true });
      }
      case 'quote_reminder': {
        const { customerName } = body;
        await sendEmail({
          to,
          subject: `Påminnelse: Offert väntar på svar – ${customerName ?? 'Kund'}`,
          html: `
            <h2>Hej ${customerName ?? 'Kund'}!</h2>
            <p>Vi vill bara påminna om vår senaste offert som vi skickade för några dagar sedan.</p>
            <p>Har du några frågor? Svara på detta mail så hör vi av oss.</p>
            <p>Med vänliga hälsningar,<br>EasyPartner</p>
          `,
        });
        return NextResponse.json({ success: true });
      }
      case 'quote_signed': {
        const { customerName } = body;
        await sendEmail({
          to,
          subject: `Välkommen som kund – ${customerName ?? 'Kund'}!`,
          html: `
            <h2>Välkommen som kund, ${customerName ?? 'Kund'}!</h2>
            <p>Tack för att du valde EasyPartner. Vi ser fram emot att samarbeta med dig.</p>
            <p>Vi kontaktar dig inom kort för att planera nästa steg.</p>
            <p>Med vänliga hälsningar,<br>EasyPartner</p>
          `,
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: 'Ogiltig action.' }, { status: 400 });
    }
  } catch (err) {
    console.error('[POST /api/email]', err);
    return NextResponse.json({ error: 'Kunde inte skicka e-post.' }, { status: 500 });
  }
}
