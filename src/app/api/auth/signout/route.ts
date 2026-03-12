import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  const origin = request.headers.get('origin') ?? request.headers.get('referer')?.replace(/\/[^/]*$/, '') ?? '';
  const base = origin || (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  return NextResponse.redirect(new URL('/client/login', base), { status: 302 });
}
