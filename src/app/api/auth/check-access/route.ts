import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/check-access
 * Kollar om en e-post finns i allowed_emails innan magic link skickas.
 * Om godkänd → skickar OTP direkt.
 * Om ej godkänd → returnerar 403.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-post krävs' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
    }

    // Använd service role om tillgänglig för att kringgå RLS, annars anon
    const supabase = createClient(url, serviceKey || anonKey);

    // Kolla om e-posten finns i allowed_emails
    const { data: allowed, error: lookupError } = await supabase
      .from('allowed_emails')
      .select('id, email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error('[check-access] Lookup error:', lookupError);
      return NextResponse.json({ error: 'Kunde inte verifiera åtkomst' }, { status: 500 });
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'Den här e-postadressen har inte åtkomst. Kontakta din administratör.' },
        { status: 403 }
      );
    }

    // E-post godkänd — skicka magic link
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/client/dashboard`,
      },
    });

    if (otpError) {
      console.error('[check-access] OTP error:', otpError);
      return NextResponse.json({ error: otpError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Inloggningslänk skickad' });
  } catch (err) {
    console.error('[check-access]', err);
    return NextResponse.json({ error: 'Något gick fel' }, { status: 500 });
  }
}
