import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ total: 0 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ total: 0 });

  const { data, error } = await supabase.rpc('get_chat_unread_count');
  if (error) return NextResponse.json({ total: 0 });
  return NextResponse.json({ total: Number(data ?? 0) });
}
