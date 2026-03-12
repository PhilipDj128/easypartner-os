import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';

export async function POST() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ sent: 0 });

  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('din_')) return NextResponse.json({ sent: 0 });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, sent_at, customers(name, email)')
    .eq('status', 'sent')
    .is('opened_at', null)
    .lt('sent_at', twoDaysAgo.toISOString());

  let sent = 0;
  for (const q of quotes ?? []) {
    const cust = (q as { customers?: { name?: string; email?: string } | null }).customers;
    const email = cust?.email;
    if (!email?.includes('@')) continue;
    try {
      await sendEmail({
        to: email,
        subject: `Påminnelse: Offert väntar på svar – ${cust?.name ?? 'Kund'}`,
        html: `
          <h2>Hej ${cust?.name ?? 'Kund'}!</h2>
          <p>Vi vill bara påminna om vår senaste offert som vi skickade för några dagar sedan.</p>
          <p>Har du några frågor? Svara på detta mail så hör vi av oss.</p>
          <p>Med vänliga hälsningar,<br>EasyPartner</p>
        `,
      });
      sent++;
    } catch {
      // Fortsätt till nästa
    }
  }
  return NextResponse.json({ sent });
}
