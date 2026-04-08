import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/client/dashboard';
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!code) {
    return NextResponse.redirect(`${origin}/client/login?error=missing_code`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/client/login?error=config`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback]', error);
    return NextResponse.redirect(`${origin}/client/login?error=auth`);
  }

  // Auto-create profile on login so chat and other features work immediately
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const admin = getSupabaseAdmin();
    if (user && admin) {
      await admin.from('profiles').upsert(
        { id: user.id, email: user.email ?? undefined, name: user.user_metadata?.full_name ?? user.email ?? null },
        { onConflict: 'id' }
      );
    }
  } catch (e) {
    console.error('[auth/callback] profile upsert failed:', e);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
