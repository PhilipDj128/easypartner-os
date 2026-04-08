import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });

  const { data: existing } = await admin.from('chat_channels').select('id').limit(1);
  if (existing?.length) return NextResponse.json({ ok: true, seeded: false });

  await admin.from('profiles').upsert(
    { id: user.id, email: user.email ?? undefined, name: user.user_metadata?.full_name ?? user.email ?? null },
    { onConflict: 'id' }
  );

  const { data: ch1, error: e1 } = await admin.from('chat_channels').insert({
    name: '#allmänt',
    description: 'För hela teamet',
    type: 'group',
    created_by: user.id,
  }).select('id').single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: ch2, error: e2 } = await admin.from('chat_channels').insert({
    name: '#säljteam',
    description: 'Säljrelaterade diskussioner',
    type: 'group',
    created_by: user.id,
  }).select('id').single();
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  await admin.from('chat_members').insert([
    { channel_id: ch1.id, user_id: user.id },
    { channel_id: ch2.id, user_id: user.id },
  ]);

  return NextResponse.json({ ok: true, seeded: true });
}
