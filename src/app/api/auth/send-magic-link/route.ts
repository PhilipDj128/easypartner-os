import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-post krävs' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
    }

    const supabase = createClient(url, key);
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/client/dashboard`,
      },
    });

    if (error) {
      console.error('[send-magic-link]', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Inloggningslänk skickad' });
  } catch (err) {
    console.error('[send-magic-link]', err);
    return NextResponse.json({ error: 'Kunde inte skicka länk' }, { status: 500 });
  }
}
